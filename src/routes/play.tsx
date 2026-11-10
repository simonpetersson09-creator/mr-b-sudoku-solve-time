import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CircleX, Eraser, Lightbulb, Pause, Pencil, Play, Undo2 } from "lucide-react";
import mrBLogo from "@/assets/mr-b-sudoku-logo.png";
import { showOptionalInterstitial } from "@/lib/ads/admob";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppOpenGameGate } from "@/components/AppOpenGameGate";
import { usePostMatchExit } from "@/lib/ads/usePostMatchExit";
import { reportLocalGame } from "@/lib/backend/report";
import {
  PEERS, digitCounts, erase, hasNote, hint, isGiven, isWrong, newGame, setValue, toggleNote, undo, type GameState,
} from "@/lib/sudoku/engine";
import { LEVEL_KEY, formatTime } from "@/lib/sudoku/format";
import { loadGame, loadSettings, recordFinish, removeGame, saveGame, startNewGame } from "@/lib/player/storage";
import { randomId } from "@/lib/random-id";
import { playLightHaptic, playSuccessHaptic, playDiceLandHaptic } from "@/lib/native/haptics";
import { useTranslation } from "@/lib/i18n";

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
  const settings = useMemo(() => loadSettings(), []);
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
    if (!state || state.finished || paused) return;
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
  }, [state?.finished, paused, state?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave every change (finished games are removed from the saved list).
  useEffect(() => { if (state) saveGame({ ...state, updatedAt: Date.now() }); }, [state]);

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
    if (next !== before) void (next.values[selected] !== before.solution[selected] ? playDiceLandHaptic() : playLightHaptic());
  };

  const onKey = useCallback((e: KeyboardEvent) => {
    if (!state || paused) return;
    if (/^[1-9]$/.test(e.key)) { input(Number(e.key)); return; }
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { if (selected != null) act((s) => erase(s, selected)); return; }
    const move: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in move) { e.preventDefault(); setSelected((c) => { const n = (c ?? 40) + move[e.key]; return n >= 0 && n < 81 ? n : c; }); }
  }, [state, paused, selected, notesMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onKey]);

  if (!state) return <main className="app-screen" />;

  const counts = digitCounts(state);
  const selValue = selected != null ? state.values[selected] : 0;
  const peers = selected != null ? new Set(PEERS[selected]) : new Set<number>();

  // A hint is preceded by an interstitial ad (app only; skipped silently when none is available).
  const doHint = async () => {
    if (hintBusy || state.finished) return;
    const target = hint(state, selected).cell;
    if (target == null) return;
    setHintBusy(true);
    setPaused(true);
    try { await showOptionalInterstitial(); } catch { /* the hint is never blocked by an ad */ }
    setPaused(false);
    setHintBusy(false);
    setState((s) => (s ? hint(s, target).state : s));
    const r = { cell: target };
    setSelected(r.cell);
    setHintCell(r.cell);
    window.setTimeout(() => setHintCell(null), 1200);
  };

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
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-gold">{t(LEVEL_KEY[state.level])}</p>
            <p className="text-xs text-muted-foreground">{t("mistakesN", { n: state.mistakes })}</p>
          </div>
          <span className="font-display text-lg font-bold tabular-nums" aria-label={t("time")}>{formatTime(state.elapsedMs)}</span>
          <button onClick={() => setPaused((p) => !p)} disabled={state.finished} aria-label={paused ? t("resume") : t("pause")} className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/60 active:bg-secondary disabled:opacity-40">
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex items-center justify-center py-1">
          <img src={mrBLogo} alt="Mr.B. Sudoku" className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
        </div>

        <div className="flex flex-1 flex-col justify-center gap-3">
        {paused ? (
          <button className="sdk-paused" onClick={() => setPaused(false)}>
            <span className="flex flex-col items-center gap-2"><Play className="h-10 w-10 text-gold" /><span className="font-display text-lg font-bold">{t("paused")}</span><span className="text-xs text-muted-foreground">{t("tapToResume")}</span></span>
          </button>
        ) : (
          <div className="sdk-board" role="grid" aria-label={t("board")}>
            {state.values.map((v, i) => {
              const r = Math.floor(i / 9), c = i % 9;
              const wrong = settings.showMistakes && isWrong(state, i);
              return (
                <button
                  key={i}
                  role="gridcell"
                  data-r={r} data-c={c}
                  data-given={isGiven(state, i)}
                  data-selected={selected === i}
                  data-peer={selected != null && selected !== i && peers.has(i)}
                  data-same={settings.highlightSame && selValue !== 0 && v === selValue && selected !== i}
                  data-wrong={wrong}
                  data-hint={hintCell === i}
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
            <button key={d} className="sdk-key" data-notes={notesMode} disabled={paused || counts[d] >= 9} onClick={() => input(d)} aria-label={String(d)}>
              {d}
              <small>{9 - counts[d]}</small>
            </button>
          ))}
        </div>

        <button className="sdk-end" onClick={() => setConfirmEnd(true)} disabled={state.finished}>
          <CircleX className="h-5 w-5" />{t("endGame")}
        </button>
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
      {state.finished && <ResultOverlay state={state} onAgain={again} onHome={() => navigate({ to: "/" })} />}
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
