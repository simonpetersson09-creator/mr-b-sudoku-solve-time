import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CircleX, Eraser, Lightbulb, Pause, Pencil, Play, Undo2 } from "lucide-react";
import { showOptionalInterstitial } from "@/lib/ads/admob";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppOpenGameGate } from "@/components/AppOpenGameGate";
import { usePostMatchExit } from "@/lib/ads/usePostMatchExit";
import { reportLocalGame } from "@/lib/backend/report";
import {
  PEERS, MAX_MISTAKES, findHintCell, markHint, completedGroups, isLost, digitCounts, erase, hasNote, isGiven, isWrong, newGame, setValue, toggleNote, undo, type GameState,
} from "@/lib/sudoku/engine";
import { LEVEL_KEY, formatTime } from "@/lib/sudoku/format";
import { loadGame, loadSettings, loadStats, recordFinish, removeGame, saveGame, startNewGame } from "@/lib/player/storage";
import { randomId } from "@/lib/random-id";
import { playLightHaptic, playSuccessHaptic, playDiceLandHaptic } from "@/lib/native/haptics";
import { useTranslation } from "@/lib/i18n";
import mrbNod from "@/assets/mrb/nod.png";
import mrbHat from "@/assets/mrb/hat.png";
import mrbBrow from "@/assets/mrb/brow.png";
import mrbNervous from "@/assets/mrb/nervous.png";
import mrbSleep from "@/assets/mrb/sleep.png";
import mrbWin from "@/assets/mrb/win.png";

type Mood = "nod" | "hat" | "brow" | "nervous" | "sleep" | "win";
const MOOD_IMG: Record<Mood, string> = { nod: mrbNod, hat: mrbHat, brow: mrbBrow, nervous: mrbNervous, sleep: mrbSleep, win: mrbWin };

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Spela – Mr.B. Sudoku" },
      { name: "description", content: "Lös ett Sudoku med anteckningar, ångra, ledtrådar och timer." },
      { property: "og:title", content: "Spela – Mr.B. Sudoku" },
      { property: "og:description", content: "Lös ett Sudoku med anteckningar, ångra, ledtrådar och timer." },
    ],
  }),
  component: () => <AppOpenGameGate><PlayPage /></AppOpenGameGate>,
});

function PlayPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [popCell, setPopCell] = useState<{ i: number; k: number } | null>(null);
  const [shakeCell, setShakeCell] = useState<{ i: number; k: number } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [react, setReact] = useState<{ mood: Mood; k: number } | null>(null);
  const reactTimer = useRef<number | null>(null);
  const flashMood = (mood: Mood) => {
    if (reactTimer.current) window.clearTimeout(reactTimer.current);
    setReact({ mood, k: Date.now() });
    reactTimer.current = window.setTimeout(() => setReact(null), 1400);
  };
  const [holdDigit, setHoldDigit] = useState<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const settings = useMemo(() => loadSettings(), []);
  const stats = useMemo(() => loadStats(), []);
  const finishedDone = useRef(false);

  useEffect(() => {
    const g = loadGame();
    if (!g) { void navigate({ to: "/setup", replace: true }); return; }
    setState(g);
    finishedDone.current = false;
    if (g.history.length === 0 && g.elapsedMs === 0) reportLocalGame("start", g);
  }, [navigate]);

  // Timer: counts only while the screen is visible and not paused.
  useEffect(() => {
    if (!state || state.finished || isLost(state) || paused) return;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const dt = document.visibilityState === "visible" ? now - last : 0;
      last = now;
      if (dt > 0) setState((s) => (s && !s.finished ? { ...s, elapsedMs: s.elapsedMs + Math.min(dt, 2000) } : s));
    };
    const id = window.setInterval(tick, 1000);
    const onVis = () => { if (document.visibilityState !== "visible") setPaused(true); last = Date.now(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [state?.finished, state ? isLost(state) : false, paused, state?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave every change (finished games are removed from the saved list).
  // A lost game is never saved again, so it disappears from the ongoing games.
  useEffect(() => { if (state && !isLost(state)) saveGame({ ...state, updatedAt: Date.now() }); }, [state]);

  useEffect(() => {
    if (!state?.finished || finishedDone.current) return;
    finishedDone.current = true;
    recordFinish(state);
    reportLocalGame("finish", state);
    void playSuccessHaptic();
  }, [state]);

  const act = useCallback((fn: (s: GameState) => GameState) => {
    setState((s) => (s && !paused ? fn(s) : s));
  }, [paused]);

  const input = (d: number) => {
    if (selected == null || !state) return;
    if (notesMode) { act((s) => toggleNote(s, selected, d)); void playLightHaptic(); return; }
    if (paused) return;
    const before = state;
    const next = setValue(before, selected, d, settings.autoRemoveNotes);
    setState(next);
    if (next === before) return;
    const k = Date.now();
    if (next.values[selected] !== before.solution[selected]) { setShakeCell({ i: selected, k }); flashMood("brow"); void playDiceLandHaptic(); return; }
    setPopCell({ i: selected, k });
    if (next.finished) { setCelebrating(true); window.setTimeout(() => setCelebrating(false), 1600); }
    const done = completedGroups(next, selected).filter((i) => !completedGroups(before, selected).includes(i));
    if (done.length && !next.finished) {
      setFlash(new Set(done));
      flashMood("hat");
      window.setTimeout(() => setFlash(new Set()), 700);
      void playSuccessHaptic();
    } else { if (!next.finished) flashMood("nod"); void playLightHaptic(); }
  };

  const onKey = useCallback((e: KeyboardEvent) => {
    if (!state || paused) return;
    if (/^[1-9]$/.test(e.key)) { input(Number(e.key)); return; }
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { if (selected != null) act((s) => erase(s, selected)); return; }
    const move: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in move) { e.preventDefault(); setSelected((c) => { const n = (c ?? 40) + move[e.key]; return n >= 0 && n < 81 ? n : c; }); }
  }, [state, paused, selected, notesMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onKey]);

  // A lost game (too many mistakes) is removed and never counted in the statistics.
  const lost = state ? isLost(state) : false;
  useEffect(() => { if (lost && state) removeGame(state.id); }, [lost]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <main className="app-screen" />;

  const counts = digitCounts(state);
  const selValue = selected != null ? state.values[selected] : 0;
  const peers = selected != null ? new Set(PEERS[selected]) : new Set<number>();

  // A hint is preceded by an interstitial ad (app only; skipped silently when none is available).
  const doHint = async () => {
    if (hintBusy || state.finished || lost) return;
    if (findHintCell(state) == null) return;
    setHintBusy(true);
    setPaused(true);
    try { await showOptionalInterstitial(); } catch { /* the hint is never blocked by an ad */ }
    setPaused(false);
    setHintBusy(false);
    const r = markHint(state);
    if (r.cell == null) return;
    setState(r.state);
    setSelected(r.cell);
    setHintCell(r.cell);
  };
  // The hint mark stays until that cell holds its correct digit.
  const showHint = hintCell != null && state.values[hintCell] !== state.solution[hintCell] ? hintCell : null;

  const again = () => {
    const g = newGame(state.level, Math.floor(Math.random() * 2 ** 31), randomId());
    startNewGame(g);
    finishedDone.current = false;
    reportLocalGame("start", g);
    setSelected(null); setNotesMode(false); setPaused(false);
    setState(g);
  };

  return (
    <main className="app-screen flex flex-col" style={{ paddingTop: "calc(8px + env(safe-area-inset-top))", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate({ to: "/" })} aria-label={t("back")} className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-secondary/80">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="grid flex-1 grid-cols-4 gap-1.5">
            <div className="sdk-chip">
              <span className="sdk-chip-label">{t("level")}</span>
              <span className="sdk-chip-value text-gold">{t(LEVEL_KEY[state.level])}</span>
            </div>
            <div className="sdk-chip" data-bad={state.mistakes > 0}>
              <span className="sdk-chip-label">{t("mistakes")}</span>
              <span className="sdk-chip-value">
                {Array.from({ length: MAX_MISTAKES }, (_, k) => <span key={k} className="sdk-dot" data-on={k < state.mistakes} />)}
              </span>
            </div>
            <button onClick={() => setPaused((p) => !p)} disabled={state.finished} aria-label={paused ? t("resume") : t("pause")} className="sdk-chip sdk-chip-btn" data-active={paused}>
              <span className="sdk-chip-label">{paused ? t("resume") : t("pause")}</span>
              <span className="sdk-chip-value">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</span>
            </button>
            <button onClick={() => setConfirmEnd(true)} disabled={state.finished} aria-label={t("endGame")} className="sdk-chip sdk-chip-btn sdk-chip-end">
              <span className="sdk-chip-label">{t("endShort")}</span>
              <span className="sdk-chip-value"><CircleX className="h-4 w-4" /></span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-3">
        <div className="grid grid-cols-[76px_1fr_76px] items-center">
          <MrB mood={paused ? "sleep" : celebrating || state.finished ? "win" : react?.mood ?? (state.mistakes === MAX_MISTAKES - 1 ? "nervous" : "nod")} k={react?.k ?? 0} />
          <p className="text-center font-display text-3xl font-bold tabular-nums tracking-wider" aria-label={t("time")}>{formatTime(state.elapsedMs)}</p>
          <span />
        </div>
        <p className="-mt-3 text-center text-xs text-muted-foreground">
          {t("statBestTime")}: <span className="font-display font-bold tabular-nums text-gold">{stats[state.level].bestMs != null ? formatTime(stats[state.level].bestMs!) : "–"}</span>
        </p>
        {paused ? (
          <div className="sdk-paused">
            <button onClick={() => setPaused(false)} className="flex flex-col items-center gap-2 rounded-xl p-4 active:scale-95"><Play className="h-12 w-12 text-gold" /><span className="font-display text-lg font-bold">{t("paused")}</span><span className="text-xs text-muted-foreground">{t("tapToResume")}</span></button>
          </div>
        ) : (
          <div className="sdk-board" role="grid" aria-label={t("board")}>
            {state.values.map((v, i) => {
              const r = Math.floor(i / 9), c = i % 9;
              const wrong = settings.showMistakes && isWrong(state, i);
              return (
                <button
                  key={popCell?.i === i ? `p${popCell.k}` : shakeCell?.i === i ? `s${shakeCell.k}` : i}
                  role="gridcell"
                  data-r={r} data-c={c}
                  data-given={isGiven(state, i)}
                  data-selected={selected === i}
                  data-peer={selected != null && selected !== i && peers.has(i)}
                  data-same={holdDigit != null ? v === holdDigit : settings.highlightSame && selValue !== 0 && v === selValue && selected !== i}
                  data-flash={flash.has(i)}
                  data-pop={popCell?.i === i}
                  data-shake={shakeCell?.i === i}
                  data-wave={celebrating}
                  style={{ ["--d" as string]: r + c }}
                  data-wrong={wrong}
                  data-hint={showHint === i}
                  aria-label={t("cellLabel", { row: r + 1, col: c + 1 }) + (v ? `: ${v}` : "")}
                  className="sdk-cell"
                  onClick={() => setSelected(i)}
                >
                  {v ? v : state.notes[i] ? (
                    <span className="sdk-notes" aria-hidden="true">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <span key={d}>{hasNote(state.notes[i], d) ? d : ""}</span>)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-1">
          <button className="sdk-tool relative" onClick={() => act(undo)} disabled={paused || !state.history.length || state.undosLeft <= 0}><Undo2 className="h-5 w-5" />{t("undo")}<span className="sdk-badge">{state.undosLeft}</span></button>
          <button className="sdk-tool" onClick={() => selected != null && act((s) => erase(s, selected))} disabled={paused}><Eraser className="h-5 w-5" />{t("erase")}</button>
          <button className="sdk-tool" aria-pressed={notesMode} onClick={() => setNotesMode((n) => !n)} disabled={paused}><Pencil className="h-5 w-5" />{t("notes")}</button>
          <button className="sdk-tool relative" onClick={() => void doHint()} disabled={paused || hintBusy}><Lightbulb className="h-5 w-5" />{t("hint")}{state.hints > 0 && <span className="sdk-badge">{state.hints}</span>}</button>
        </div>

        <div className="sdk-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button
              key={d} className="sdk-key" data-notes={notesMode} data-done={counts[d] >= 9} disabled={paused || counts[d] >= 9} aria-label={String(d)}
              onPointerDown={() => { held.current = false; holdTimer.current = window.setTimeout(() => { held.current = true; setHoldDigit(d); void playLightHaptic(); }, 400); }}
              onPointerUp={() => { if (holdTimer.current) window.clearTimeout(holdTimer.current); setHoldDigit(null); }}
              onPointerLeave={() => { if (holdTimer.current) window.clearTimeout(holdTimer.current); setHoldDigit(null); }}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => { if (held.current) { held.current = false; return; } input(d); }}
            >
              {d}
              <small>{counts[d] >= 9 ? "✓" : 9 - counts[d]}</small>
            </button>
          ))}
        </div>

        </div>
      </div>
      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("endGame")}</AlertDialogTitle>
            <AlertDialogDescription>{t("endGameBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { removeGame(state.id); void navigate({ to: "/" }); }}>{t("endGame")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {lost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-2xl border bg-card p-5 text-center shadow-2xl">
            <p className="text-4xl">😵</p>
            <h2 className="brand-title mt-1 text-2xl">{t("gameOverTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("gameOverBody", { n: MAX_MISTAKES })}</p>
            <div className="home-stack mt-4">
              <button className="home-action home-action-gold" onClick={again}>{t("playAgain")}</button>
              <button className="home-action home-action-ghost" onClick={() => navigate({ to: "/" })}>{t("home")}</button>
            </div>
          </div>
        </div>
      )}
      {celebrating && Array.from({ length: 28 }, (_, n) => <span key={n} className="sdk-confetti" style={{ left: `${(n * 37) % 100}%`, animationDelay: `${(n % 7) * 0.12}s` }} />)}
      {state.finished && !celebrating && <ResultOverlay state={state} onAgain={again} onHome={() => navigate({ to: "/" })} />}
    </main>
  );
}

function ResultOverlay({ state, onAgain, onHome }: { state: GameState; onAgain: () => void; onHome: () => void }) {
  const { t } = useTranslation();
  // Post-game interstitial (Yatzy rules): once per finished game.
  const { leaving, leave } = usePostMatchExit(`sudoku:${state.id}`, true, onHome);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[360px] rounded-2xl border bg-card p-5 text-center shadow-2xl">
        <p className="text-4xl">🏆</p>
        <h2 className="brand-title mt-1 text-2xl">{t("solvedTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t(LEVEL_KEY[state.level])}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {([[t("time"), formatTime(state.elapsedMs)], [t("mistakes"), String(state.mistakes)], [t("hint"), String(state.hints)]] as const).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-surface px-2 py-2"><p className="font-display text-lg font-bold tabular-nums text-gold">{v}</p><p className="text-[11px] text-muted-foreground">{k}</p></div>
          ))}
        </div>
        <div className="home-stack mt-4">
          <button className="home-action home-action-gold" disabled={leaving} onClick={() => void leave(onAgain)}>{t("playAgain")}</button>
          <button className="home-action home-action-ghost" disabled={leaving} onClick={() => void leave()}>{t("home")}</button>
        </div>
      </div>
    </div>
  );
}

/** Mr. B reacts to the game: nod (right digit), hat (completed group), brow (mistake), nervous (one mistake left), sleep (paused), win. */
function MrB({ mood, k }: { mood: Mood; k: number }) {
  return (
    <div className="sdk-mrb" aria-hidden="true">
      <img key={`${mood}-${k}`} src={MOOD_IMG[mood]} alt="" data-mood={mood} draggable={false} />
    </div>
  );
}
