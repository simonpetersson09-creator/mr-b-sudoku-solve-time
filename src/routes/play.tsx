import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, CircleX, Eraser, Lightbulb, Pause, Pencil, Play, Undo2 } from "lucide-react";
import { getRewardedState, preloadInterstitial, preloadRewarded, showOptionalRewarded, subscribeRewardedState } from "@/lib/ads/admob";
import { createHintReward } from "@/lib/ads/hint-reward";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppOpenGameGate } from "@/components/AppOpenGameGate";
import { SudokuCell } from "@/components/app/SudokuCell";
import { usePostMatchExit } from "@/lib/ads/usePostMatchExit";
import { reportLocalGame } from "@/lib/backend/report";
import {
  PEERS, MAX_MISTAKES, MAX_UNDOS, MAX_HINTS, explainHint, type HintInfo, completedGroups, isLost, digitCounts, erase, isGiven, isWrong, setValue, toggleNote, undo, type GameState, type Level,
} from "@/lib/sudoku/engine";
import { LEVEL_KEY, formatTime } from "@/lib/sudoku/format";
import { loadGame, loadProgress, loadSettings, loadStats, recordFinish, removeGame, saveGame, startNewGame } from "@/lib/player/storage";
import { createGame, prepareGame } from "@/lib/sudoku/generation";
import { toast } from "sonner";
import { newlyUnlocked } from "@/lib/player/unlock";
import { playLightHaptic, playSuccessHaptic, playDiceLandHaptic } from "@/lib/native/haptics";
import { useTranslation } from "@/lib/i18n";
import { PAUSE_EVENT } from "@/lib/native/runtime";
import { createPlayClock } from '@/lib/sudoku/play-clock';

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

export function PlayPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  // Same-digit highlighting only when a digit already on the board is tapped on purpose.
  const [sameDigit, setSameDigit] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [paused, setPaused] = useState(false);
  const backgroundPaused = useRef(false);
  const clock = useRef(createPlayClock());
  const [hintInfo, setHintInfo] = useState<{ info: HintInfo; step: 1 | 2 } | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const hintInFlight = useRef(false);
  const [hintOffer, setHintOffer] = useState(false);
  const [adState, setAdState] = useState(getRewardedState);
  const currentGame = useRef<GameState | null>(null);
  currentGame.current = state;
  // A stable cell handler reads the current tap context without invalidating every cell on clock ticks.
  const cellContext = useRef({ state, adBusy: false, hintOffer, blocked: false, selected, hinted: new Set<number>(), lockedHints: new Set<number>() });
  const selectCell = useCallback((i: number) => {
    const ctx = cellContext.current;
    if (!ctx.state || ctx.adBusy || ctx.hintOffer || ctx.blocked || backgroundPaused.current || ctx.state.finished || isLost(ctx.state)) return;
    const v = ctx.state.values[i];
    if (ctx.hinted.has(i) && !ctx.lockedHints.has(i) && v === ctx.state.solution[i]) {
      setLockedHints((s) => new Set(s).add(i)); void playLightHaptic();
    }
    if (ctx.selected === i) { setSelected(null); setSameDigit(null); void playLightHaptic(); return; }
    setSelected(i); setSameDigit(v !== 0 ? v : null);
  }, []);
  const mounted = useRef(false);
  const stopClock = useCallback(() => {
    const g = currentGame.current;
    if (!g) return;
    const next = clock.current.stop(g);
    currentGame.current = next;
    // Do not resurrect an explicitly removed game or overwrite a replacement during unmount.
    if (loadGame()?.id === g.id) saveGame(next);
    if (mounted.current && next !== g) setState(next);
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stopClock(); currentGame.current = null; }; }, [stopClock]);
  useEffect(() => subscribeRewardedState(setAdState), []);
  const adBusy = hintBusy || adState !== "idle";
  const [unlocked, setUnlocked] = useState<Level[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const gameTimers = useRef(new Set<number>());
  const later = (callback: () => void, delay: number, gameId = currentGame.current?.id) => {
    const timer = window.setTimeout(() => {
      gameTimers.current.delete(timer);
      if (mounted.current && gameId === currentGame.current?.id && (currentGame.current?.finished || loadGame()?.id === gameId)) callback();
    }, delay);
    gameTimers.current.add(timer);
    return timer;
  };
  useEffect(() => () => { gameTimers.current.forEach(window.clearTimeout); gameTimers.current.clear(); }, [state?.id]);
  const [flash, setFlash] = useState<Set<number>>(new Set());

  // Idle selection: if no move is made for a while, the selection fades away on its own.
  // Any move or new tap resets the timer (updatedAt changes on real moves, not on the clock tick).
  const lastMove = state?.updatedAt;
  useEffect(() => {
    if (selected == null || paused) return;
    const timer = window.setTimeout(() => { setSelected(null); setSameDigit(null); }, 8000);
    return () => window.clearTimeout(timer);
  }, [selected, lastMove, paused]);
  const [popCell, setPopCell] = useState<{ i: number; k: number } | null>(null);
  const [shakeCell, setShakeCell] = useState<{ i: number; k: number } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [hinted, setHinted] = useState<Set<number>>(new Set());
  const [lockedHints, setLockedHints] = useState<Set<number>>(new Set());
  const [holdDigit, setHoldDigit] = useState<number | null>(null);
  cellContext.current = { state, adBusy, hintOffer, blocked: paused || confirmEnd, selected, hinted, lockedHints };
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const settings = useMemo(() => loadSettings(), []);
  const [record, setRecord] = useState<number | null>(null);
  const stats = useMemo(() => loadStats(), []);
  // Preview helper: open /play?best=1 to see the row with a sample time (?best=0 clears it).
  // A real record from a solved game always wins over the sample.
  const [previewBest, setPreviewBest] = useState<number | null>(null);
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("best");
      if (p === "1") sessionStorage.setItem("mrb-sudoku:v1:best-preview", "1");
      if (p === "0") sessionStorage.removeItem("mrb-sudoku:v1:best-preview");
      if (sessionStorage.getItem("mrb-sudoku:v1:best-preview") === "1") setPreviewBest(252000);
    } catch { /* storage blocked: just no sample */ }
  }, []);
  const bestMs = stats[state?.level ?? "easy"].bestMs ?? previewBest;
  const finishedDone = useRef(false);
  const startingAgain = useRef(false);
  useEffect(() => { void preloadInterstitial(); void preloadRewarded(); }, []);
  useEffect(() => {
    if (state?.finished || (state && isLost(state))) prepareGame(state.level);
  }, [state?.finished, state?.level, state?.mistakes]);

  useEffect(() => {
    const g = loadGame();
    if (!g) { void navigate({ to: "/setup", replace: true }); return; }
    setState(g);
    finishedDone.current = false;
    setUnlocked([]);
    if (g.history.length === 0 && g.elapsedMs === 0) reportLocalGame("start", g);
  }, [navigate]);

  // Persist at the lifecycle boundary, before React effects or native suspension.
  useEffect(() => {
    const pauseAndSave = () => {
      backgroundPaused.current = true;
      stopClock();
      setPaused(true);
    };
    const onVisibility = () => { if (document.visibilityState !== "visible") pauseAndSave(); };
    window.addEventListener(PAUSE_EVENT, pauseAndSave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener(PAUSE_EVENT, pauseAndSave); document.removeEventListener("visibilitychange", onVisibility); };
  }, [stopClock]);
  const resumePlay = () => {
    if (document.visibilityState !== "visible") return;
    backgroundPaused.current = false;
    setPaused(false);
  };

  // Timer: counts only while the screen is visible and not paused.
  useEffect(() => {
    if (!state || state.finished || isLost(state) || paused || adBusy || hintOffer || backgroundPaused.current) return;
    clock.current.start(state);
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      const g = currentGame.current;
      if (!g || g.finished || isLost(g) || backgroundPaused.current) return;
      const next = clock.current.charge(g);
      currentGame.current = next;
      setState(next);
    };
    const id = window.setInterval(tick, 1000);
    return () => { window.clearInterval(id); stopClock(); };
  }, [state?.finished, state ? isLost(state) : false, paused, adBusy, hintOffer, state?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave every change (finished games are removed from the saved list).
  // A lost game is never saved again, so it disappears from the ongoing games.
  useEffect(() => { if (state && !isLost(state)) saveGame({ ...state, updatedAt: Date.now() }); }, [state]);

  useEffect(() => {
    if (!state?.finished || finishedDone.current) return;
    finishedDone.current = true;
    const before = loadProgress();
    const prevBest = loadStats()[state.level].bestMs;
    if (state.hints === 0 && prevBest != null && state.elapsedMs < prevBest) setRecord(prevBest);
    recordFinish(state);
    setUnlocked(newlyUnlocked(before, loadProgress()));
    reportLocalGame("finish", state);
    void playSuccessHaptic();
  }, [state]);

  const act = useCallback((fn: (s: GameState) => GameState) => {
    const s = currentGame.current;
    if (!s || paused || confirmEnd || backgroundPaused.current || adBusy || hintOffer || hintInFlight.current) return;
    let next = fn(clock.current.charge(s));
    if (next.finished || isLost(next)) next = clock.current.stop(next);
    currentGame.current = next;
    setState(next);
  }, [paused, confirmEnd, adBusy, hintOffer, !!state]);

  const input = (d: number, at: number | null = selected, fromHint = false, base: GameState | null = null) => {
    const selected = at;
    if (selected == null || !state || backgroundPaused.current || confirmEnd || hintOffer || adBusy || hintInFlight.current) return;
    setSameDigit(null);
    if (notesMode && !fromHint) { act((s) => toggleNote(s, selected, d)); void playLightHaptic(); setNotesMode(false); return; }
    if (paused || (!fromHint && (hintInFlight.current || adBusy || hintOffer))) return;
    const before = clock.current.charge(base ?? currentGame.current ?? state);
    // A wrong digit fades away by itself, so it must not enter the undo history.
    let next = setValue(before, selected, d, settings.autoRemoveNotes, d === before.solution[selected]);
    if (next.finished || isLost(next)) next = clock.current.stop(next);
    currentGame.current = next;
    setState(next);
    if (next === before) return;
    const k = Date.now();
    if (next.values[selected] !== before.solution[selected]) {
      setShakeCell({ i: selected, k });
      setPopCell(null);
      void playDiceLandHaptic();
      // The wrong digit fades away by itself after a moment; the cell empties but the mistake still counts.
      const cell = selected;
      later(() => {
        setState((s) => {
          if (!s || s.id !== before.id || s.finished || s.values[cell] !== d || s.values[cell] === s.solution[cell]) return s;
          const values = s.values.slice() as GameState["values"];
          values[cell] = 0;
          return { ...s, values };
        });
      }, 1800);
      return;
    }
    setSelected(null);
    setShakeCell(null);
    setPopCell({ i: selected, k });
    // Let the gold ripple finish, then let the cell return to its normal look.
    later(() => setPopCell((p) => (p && p.k === k ? null : p)), 950);
    if (next.finished) { setCelebrating(true); later(() => setCelebrating(false), 1600); }
    const done = completedGroups(next, selected).filter((i) => !completedGroups(before, selected).includes(i));
    if (done.length && !next.finished) {
      setFlash(new Set(done));
      later(() => setFlash(new Set()), 700);
      void playSuccessHaptic();
    } else void playLightHaptic();
  };

  const onKey = useCallback((e: KeyboardEvent) => {
    if (!state || paused || hintOffer || confirmEnd || adBusy || hintInFlight.current || backgroundPaused.current || state.finished || isLost(state)
      || (e.target instanceof HTMLElement && (e.target.closest('[role="dialog"], [role="alertdialog"]') || e.target.matches('input, textarea, select, [contenteditable="true"]')))) return;
    if (/^[1-9]$/.test(e.key)) { input(Number(e.key)); return; }
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { if (selected != null) act((s) => erase(s, selected)); return; }
    const move: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in move) { e.preventDefault(); setSameDigit(null); setSelected((c) => { const n = (c ?? 40) + move[e.key]; return n >= 0 && n < 81 ? n : c; }); }
  }, [state, paused, selected, notesMode, hintOffer, confirmEnd, adBusy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onKey]);

  // A lost game (too many mistakes) is removed and never counted in the statistics.
  const lost = state ? isLost(state) : false;
  const lossExit = usePostMatchExit(`sudoku:${state?.id ?? "pending"}`, lost, () => { void navigate({ to: "/" }); });
  useEffect(() => { if (lost && state) removeGame(state.id); }, [lost]); // eslint-disable-line react-hooks/exhaustive-deps
  // The board fades out slowly before the loss view appears.
  const [showLost, setShowLost] = useState(false);
  useEffect(() => {
    if (!lost) { setShowLost(false); return; }
    const t = setTimeout(() => setShowLost(true), 1600);
    return () => clearTimeout(t);
  }, [lost]);

  const fitMainRef = useRef<HTMLElement>(null);
  const fitColRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Size the board from the real free space, so it is as large as the screen allows.
    const col = fitColRef.current; if (!col) return;
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const board = col.querySelector<HTMLElement>(".sdk-board, .sdk-paused");
        const header = col.querySelector<HTMLElement>(".sdk-board-head");
        const best = col.firstElementChild as HTMLElement | null;
        if (!board || !header || !best) return;
        const overhead = best.getBoundingClientRect().height + header.getBoundingClientRect().height
          + parseFloat(getComputedStyle(header).marginBottom) + parseFloat(getComputedStyle(best).marginBottom);
        const size = Math.max(0, Math.min(col.clientWidth, col.clientHeight - overhead - 6));
        col.style.setProperty("--board-px", `${Math.floor(size)}px`);
      });
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(col);
    window.addEventListener("resize", fit);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [paused, state?.id]);

  const counts = useMemo(() => state ? digitCounts(state) : [], [state?.values]);
  const peers = useMemo(() => selected != null ? new Set(PEERS[selected]) : new Set<number>(), [selected]);

  if (!state) return <main className="app-screen" />;

  // The offer is separate from acceptance. Only a tagged SDK reward can mutate the game.
  const doHint = async () => {
    if (hintInFlight.current || adBusy || paused || state.finished || lost || state.hints >= MAX_HINTS) return;
    const info = explainHint(state, selected);
    if (info == null) return;
    hintInFlight.current = true;
    setHintBusy(true);
    let received = false;
    const claim = createHintReward(state.id, info.cell, settings.autoRemoveNotes, () => {
      // loadGame also checks the active game ID, including changes while away from this screen.
      const active = loadGame();
      return mounted.current && active?.id === state.id ? currentGame.current : null;
    }, (next, explanation) => {
      currentGame.current = next;
      saveGame(next); // persist synchronously at the reward boundary, before another callback/navigation.
      setState(next);
      setSelected(null); setSameDigit(null); setNotesMode(false);
      setShakeCell(null); setPopCell({ i: explanation.cell, k: Date.now() });
      setHinted((h) => new Set(h).add(explanation.cell));
      setHintInfo({ info: explanation, step: 1 });
      later(() => setHintInfo((h) => (h?.info === explanation ? null : h)), 3500);
      if (next.finished) { setCelebrating(true); later(() => setCelebrating(false), 1600); }
      void playLightHaptic();
    });
    try {
      const result = await showOptionalRewarded({ onReward: () => { received = true; claim(); } });
      if (mounted.current) {
        if (result === "pending") toast.message(t("hintAdWaiting"));
        else if (!received) toast.message(t(result === "not_earned" ? "hintAdNotEarned" : "hintAdUnavailable"));
      }
    } catch { if (mounted.current && !received) toast.error(t("hintAdUnavailable")); }
    finally { hintInFlight.current = false; if (mounted.current) { setHintBusy(false); if (!backgroundPaused.current) setPaused(false); } }
  };
  const activeHint = hintInfo?.info ?? null;
  const showHint: number | null = null;
  const hintZone = activeHint ? new Set([activeHint.cell]) : null;
  const hintText = !activeHint || paused ? null
    : t(activeHint.kind === "wrong" ? "hintWhyWrong" : activeHint.kind === "naked" ? "hintWhyNaked" : activeHint.kind === "hidden" ? "hintWhyHidden" : "hintWhyFewest", { digit: activeHint.digit });

  const again = async () => {
    if (startingAgain.current) return;
    startingAgain.current = true;
    try {
    const g = await createGame(state.level);
    if (!mounted.current || currentGame.current?.id !== state.id) return;
    startNewGame(g);
    finishedDone.current = false;
    setUnlocked([]);
    reportLocalGame("start", g);
    setSelected(null); setNotesMode(false); setPaused(false); setSameDigit(null);
    setHinted(new Set()); setLockedHints(new Set()); setHintInfo(null);
    setPopCell(null); setShakeCell(null); setFlash(new Set()); setCelebrating(false);
    currentGame.current = g;
    setState(g);
    } catch { toast.error(t("genericError")); }
    finally { startingAgain.current = false; }
  };

  return (
    <main ref={fitMainRef} className="app-screen sdk-fixed flex flex-col" data-level={state.level} style={{ paddingTop: "calc(4px + var(--safe-top))", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
      <div className="sdk-play-stack mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-1">
        <div className="sdk-topbar flex items-center gap-2">
          <button onClick={() => { stopClock(); void navigate({ to: "/" }); }} aria-label={t("back")} className="sdk-back">
            <ArrowLeft className="h-4 w-4" /><span>{t("back")}</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { if (paused) resumePlay(); else { stopClock(); setPaused(true); } }} disabled={state.finished || adBusy} aria-label={paused ? t("resume") : t("pause")} className="sdk-round-btn" data-active={paused}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}<span>{paused ? t("resume") : t("pause")}</span>
            </button>
            <button onClick={() => setConfirmEnd(true)} disabled={state.finished} aria-label={t("endGame")} className="sdk-round-btn sdk-round-end">
              <CircleX className="h-4 w-4" /><span>{t("endGame")}</span>
            </button>
          </div>
        </div>

        <div ref={fitColRef} className="sdk-board-column flex min-h-0 flex-1 flex-col justify-center gap-0">
        <p className="mb-0.5 text-center text-[11px] leading-none text-muted-foreground">
          {t("statBestTime")}: <span className="font-display font-bold tabular-nums text-gold">{bestMs != null ? formatTime(bestMs) : "–"}</span>
        </p>
        <div className="sdk-board-head">
          <span className="sdk-level-pill" aria-label={`${t("level")}: ${t(LEVEL_KEY[state.level])}`}>{t(LEVEL_KEY[state.level])}</span>
          <p className="sdk-board-time" aria-label={t("time")}>{formatTime(state.elapsedMs)}</p>
          <span className="sdk-fel-pill" data-bad={state.mistakes > 0} aria-label={`${t("mistakes")}: ${state.mistakes}/${MAX_MISTAKES}`}>
            <span className="sdk-fel-label">{t("mistakes")}</span>
            <span className="sdk-fel-dots">{Array.from({ length: MAX_MISTAKES }, (_, k) => <span key={k} className="sdk-dot" data-on={k < state.mistakes} />)}</span>
          </span>
        </div>
        {paused ? (
          <div className="sdk-paused">
            <button onClick={resumePlay} className="flex flex-col items-center gap-2 rounded-xl p-4 active:scale-95"><Play className="h-12 w-12 text-gold" /><span className="font-display text-lg font-bold">{t("paused")}</span><span className="text-xs text-muted-foreground">{t("tapToResume")}</span></button>
          </div>
        ) : (
          <div className="sdk-board" data-dark={settings.darkBoard} data-lost={lost} role="grid" aria-label={t("board")}>
            {state.values.map((v, i) => {
              const r = Math.floor(i / 9), c = i % 9;
              const wrong = settings.showMistakes && isWrong(state, i);
              return (
                <SudokuCell
                  key={popCell?.i === i ? `p${popCell.k}` : shakeCell?.i === i ? `s${shakeCell.k}` : i}
                  index={i} value={v} notes={state.notes[i]} solution={state.solution[i]}
                  given={isGiven(state, i) || (lockedHints.has(i) && v === state.solution[i])}
                  selected={selected === i} peer={selected != null && selected !== i && peers.has(i)}
                  same={holdDigit != null ? v === holdDigit : settings.highlightSame && sameDigit !== null && v === sameDigit && selected !== i}
                  flash={flash.has(i)} pop={popCell?.i === i} shake={shakeCell?.i === i} wave={celebrating}
                  wrong={wrong} hint={showHint === i} zone={hintZone?.has(i) ?? false}
                  hinted={hinted.has(i) && !lockedHints.has(i) && v === state.solution[i]}
                  label={t("cellLabel", { row: r + 1, col: c + 1 }) + (v ? `: ${v}` : "")
                    + (wrong ? `, ${t("mistakes")}` : "")
                    + (state.notes[i] ? `, ${t("notes")}: ${[1,2,3,4,5,6,7,8,9].filter(d => state.notes[i] & (1 << (d - 1))).join(", ")}` : "")}
                  onSelect={selectCell}
                />
              );
            })}
          </div>
        )}
        </div>

        <div className="sdk-controls flex shrink-0 flex-col gap-1">
        <div className="sdk-tools flex gap-1">
          <button className="sdk-tool" onClick={() => { setHintInfo(null); setSameDigit(null); act(undo); }} disabled={paused || !state.history.length || state.undosLeft <= 0} aria-label={`${t("undo")}: ${state.undosLeft}/${MAX_UNDOS}`}><Undo2 className="h-5 w-5" />{t("undo")}<span className="sdk-pips" aria-hidden="true">{Array.from({ length: MAX_UNDOS }, (_, i) => <span key={i} className="sdk-pip" data-on={i < state.undosLeft} />)}</span></button>
          <button className="sdk-tool" onClick={() => selected != null && act((s) => erase(s, selected))} disabled={paused}><Eraser className="h-5 w-5" />{t("eraseNotes")}</button>
          <button className="sdk-tool" aria-pressed={notesMode} onClick={() => setNotesMode((n) => !n)} disabled={paused}><Pencil className="h-5 w-5" />{t("notes")}</button>
          <button className="sdk-tool relative" onClick={() => { if (!hintInFlight.current && !adBusy && explainHint(state, selected)) { stopClock(); setHintOffer(true); } }} disabled={paused || adBusy || state.finished || lost || state.hints >= MAX_HINTS} aria-label={`${t("hint")}: ${MAX_HINTS - state.hints}/${MAX_HINTS}`}><Lightbulb className="h-5 w-5" />{t("hint")}<span className="sdk-pips" aria-hidden="true">{Array.from({ length: MAX_HINTS }, (_, i) => <span key={i} className="sdk-pip" data-on={i < MAX_HINTS - state.hints} />)}</span></button>
        </div>

        <div className="sdk-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button
              key={d} className="sdk-key" data-notes={notesMode} data-done={counts[d] >= 9} data-hint={showHint != null && state.solution[showHint] === d} disabled={paused || counts[d] >= 9} aria-label={String(d)}
              onPointerDown={() => { held.current = false; holdTimer.current = later(() => { held.current = true; setHoldDigit(d); void playLightHaptic(); }, 400); }}
              onPointerUp={() => { if (holdTimer.current) window.clearTimeout(holdTimer.current); setHoldDigit(null); }}
              onPointerLeave={() => { if (holdTimer.current) window.clearTimeout(holdTimer.current); setHoldDigit(null); }}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => { if (held.current) { held.current = false; return; } input(d); }}
            >
              {d}
              <small>{counts[d] >= 9 ? <Check className="h-3 w-3" /> : 9 - counts[d]}</small>
            </button>
          ))}
        </div>
        <p className="sdk-hint-tip" role="status" data-show={hintText != null}>{hintText != null && <><Lightbulb className="h-3 w-3 shrink-0" /><span>{hintText}</span></>}</p>
        </div>
      </div>
      <AlertDialog open={hintOffer} onOpenChange={setHintOffer}>
        <AlertDialogContent className="max-w-[calc(100%-32px)] rounded-lg bg-card sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("hint")}</AlertDialogTitle>
            <AlertDialogDescription>{t("hintAdOffer")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <Button className="h-auto min-h-11 whitespace-normal" onClick={() => { setHintOffer(false); void doHint(); }} disabled={adBusy}>{t("hintAdAccept")}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("endGame")}</AlertDialogTitle>
            <AlertDialogDescription>{t("endGameBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { stopClock(); removeGame(state.id); void navigate({ to: "/" }); }}>{t("endGame")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {lost && showLost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-2xl border bg-card p-5 text-center shadow-2xl">
            <p className="text-4xl">😵</p>
            <h2 className="brand-title mt-1 text-2xl">{t("gameOverTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("gameOverBody", { n: MAX_MISTAKES })}</p>
            <div className="home-stack mt-4">
              <button className="home-action home-action-gold" disabled={lossExit.leaving} onClick={() => void lossExit.leave(again)}>{t("playAgain")}</button>
              <button className="home-action home-action-ghost" disabled={lossExit.leaving} onClick={() => void lossExit.leave()}>{t("home")}</button>
            </div>
          </div>
        </div>
      )}
      {celebrating && Array.from({ length: record != null ? 60 : 28 }, (_, n) => <span key={n} className="sdk-confetti" style={{ left: `${(n * 37) % 100}%`, animationDelay: `${(n % 7) * 0.12}s` }} />)}
      {state.finished && !celebrating && <ResultOverlay state={state} record={record} unlocked={unlocked} onAgain={again} onHome={() => navigate({ to: "/" })} />}
    </main>
  );
}

function ResultOverlay({ state, record, unlocked, onAgain, onHome }: { state: GameState; record: number | null; unlocked: Level[]; onAgain: () => void; onHome: () => void }) {
  const { t } = useTranslation();
  // Post-game interstitial (Yatzy rules): once per finished game.
  const { leaving, leave } = usePostMatchExit(`sudoku:${state.id}`, true, onHome);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[360px] rounded-2xl border bg-card p-5 text-center shadow-2xl">
        <p className={record != null ? "sdk-record-trophy text-5xl" : "text-4xl"}>{record != null ? "🥇" : "🏆"}</p>
        <h2 className="brand-title mt-1 text-2xl">{t("solvedTitle")}</h2>
        {record != null && (
          <div className="sdk-record mt-3 rounded-xl border border-gold/60 bg-gold/15 px-3 py-2">
            <p className="font-display text-lg font-bold text-gold">{t("newRecord")}</p>
            <p className="text-xs text-muted-foreground">{t("previousBest", { time: formatTime(record) })}</p>
          </div>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{t(LEVEL_KEY[state.level])}</p>
        {unlocked.map((l) => (
          <p key={l} className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">🔓 {t("levelUnlocked", { level: t(LEVEL_KEY[l]) })}</p>
        ))}
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
