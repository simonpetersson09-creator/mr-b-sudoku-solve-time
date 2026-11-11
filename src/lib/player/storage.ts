import { isLevel, LEVELS, MAX_UNDOS, MAX_HINTS, MAX_MISTAKES, isConsistent, isLost, type GameState, type Level } from "@/lib/sudoku/engine";
import { emptyProgress, type Progress } from "@/lib/player/unlock";
import { hasUniqueSavedPuzzle } from './puzzle-validation';

/** All Sudoku keys live in their own namespace; never shared with Ludo or Yatzy. */
const NS = "mrb-sudoku:v1:";
const STATS = NS + "stats";
const SETTINGS = NS + "settings";
const GAMES = NS + "games";
const ACTIVE = NS + "active-game-id";
const LEVEL = NS + "level";

export interface Settings { name: string; haptics: boolean; showMistakes: boolean; highlightSame: boolean; autoRemoveNotes: boolean; darkBoard: boolean }
const DEFAULT_SETTINGS: Settings = { name: "Spelare", haptics: true, showMistakes: true, highlightSame: true, autoRemoveNotes: true, darkBoard: false };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch { return fallback; }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full/blocked */ }
}

// ---------- Saved games (max 10, oldest dropped first) ----------
export const MAX_SAVED_GAMES = 10;
export interface SavedGame { id: string; game: GameState; updatedAt: number }

const integerIn = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const isGrid = (g: unknown, min = 0): g is number[] => Array.isArray(g) && g.length === 81 && Array.from(g).every((v) => integerIn(v, min, 9));
const nonnegativeTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
/** True only for a structurally sound, unfinished saved game. */
export function isValidSave(g: unknown): g is GameState {
  if (!g || typeof g !== "object") return false;
  const s = g as GameState;
  if (typeof s.id !== "string" || !s.id.length || !isLevel(s.level) || !Number.isInteger(s.seed)
    || !isGrid(s.puzzle) || !isGrid(s.solution, 1) || !isGrid(s.values) || !isConsistent(s.solution)
    || !Array.isArray(s.notes) || s.notes.length !== 81 || !Array.from(s.notes).every((v) => integerIn(v, 0, 511))
    || !Array.isArray(s.history) || !integerIn(s.mistakes, 0, MAX_MISTAKES - 1) || !integerIn(s.hints, 0, MAX_HINTS)
    || (s.undosLeft !== undefined && !integerIn(s.undosLeft, 0, MAX_UNDOS))
    || !nonnegativeTime(s.elapsedMs) || !nonnegativeTime(s.startedAt) || !nonnegativeTime(s.updatedAt) || s.finished !== false) return false;
  if (!s.puzzle.every((v, i) => v === 0 || (v === s.solution[i] && s.values[i] === v && s.notes[i] === 0))) return false;
  const validHistory = Array.from(s.history).every((entry) => Array.isArray(entry) && entry.length > 0 && Array.from(entry).every((c) =>
    c && typeof c === "object" && integerIn(c.i, 0, 80) && integerIn(c.value, 0, 9) && integerIn(c.notes, 0, 511)
    && (s.puzzle[c.i] === 0 || (c.value === s.puzzle[c.i] && c.notes === 0))));
  return validHistory && hasUniqueSavedPuzzle(s);
}

/** Pure: newest first, at most MAX_SAVED_GAMES. */
export function capSaves(list: SavedGame[]): SavedGame[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SAVED_GAMES);
}

function readSaves(): SavedGame[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GAMES) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((e): e is SavedGame => !!e && typeof e === "object" && typeof e.id === "string"
      && nonnegativeTime(e.updatedAt) && isValidSave(e.game) && e.id === e.game.id) : [];
  } catch { return []; }
}
const writeSaves = (list: SavedGame[]) => write(GAMES, capSaves(list));
const activeId = () => { try { return localStorage.getItem(ACTIVE); } catch { return null; } };

/** Unfinished games, most recently played first. */
export const listGames = (): SavedGame[] => capSaves(readSaves());
export const selectGame = (id: string) => { try { localStorage.setItem(ACTIVE, id); } catch { /* noop */ } };
export const loadGame = (): GameState | null => {
  if (typeof window === "undefined") return null;
  const id = activeId();
  const g = readSaves().find((e) => e.id === id)?.game ?? null;
  // Saves written before the undo limit get the full allowance.
  return g && !Number.isFinite(g.undosLeft) ? { ...g, undosLeft: MAX_UNDOS } : g;
};
/** Starts a new game without touching the other saved ones. */
export const startNewGame = (g: GameState, now = Date.now()) => {
  writeSaves([{ id: g.id, game: g, updatedAt: now }, ...readSaves().filter((e) => e.id !== g.id)]);
  selectGame(g.id);
};
/** Saves progress of a game (finished games are removed). */
export const saveGame = (g: GameState, now = Date.now()) => {
  const rest = readSaves().filter((e) => e.id !== g.id);
  writeSaves(g.finished || isLost(g) ? rest : [{ id: g.id, game: g, updatedAt: now }, ...rest]);
};
/** Removes one game; the others stay. */
export const removeGame = (id: string) => {
  writeSaves(readSaves().filter((e) => e.id !== id));
  if (activeId() === id) { try { localStorage.removeItem(ACTIVE); } catch { /* noop */ } }
};

// Legacy saved switches cannot disable the now fixed gameplay assistance.
const fixedHelp = (s: Settings): Settings => ({ ...s, showMistakes: true, highlightSame: true, autoRemoveNotes: true });
export const loadSettings = () => fixedHelp(read(SETTINGS, DEFAULT_SETTINGS));
export const saveSettings = (s: Settings) => write(SETTINGS, fixedHelp(s));

export const loadLevel = (): Level => {
  if (typeof window === "undefined") return "easy";
  try { const v = localStorage.getItem(LEVEL); return isLevel(v) ? v : "easy"; } catch { return "easy"; }
};
export const saveLevel = (l: Level) => { try { localStorage.setItem(LEVEL, l); } catch { /* noop */ } };

// ---------- Statistics per level ----------
/** played = finished games only (a solved puzzle). wins = solved without hints. perfect = solved with no hint and no mistake. */
export interface LevelStats { played: number; wins: number; perfect: number; bestMs: number | null; totalMs: number }
export type Stats = Record<Level, LevelStats> & { lifetimePlayed: number; year: number };
/** Calendar year in Swedish time; per-level stats restart when it changes. */
export const stockholmYear = (now: Date = new Date()) =>
  Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Stockholm", year: "numeric" }).format(now));
const emptyLevel = (): LevelStats => ({ played: 0, wins: 0, perfect: 0, bestMs: null, totalMs: 0 });
export const emptyStats = (year: number = stockholmYear()): Stats => ({ easy: emptyLevel(), medium: emptyLevel(), hard: emptyLevel(), expert: emptyLevel(), ultra: emptyLevel(), impossible: emptyLevel(), master: emptyLevel(), lifetimePlayed: 0, year });

const cleanCount = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
export function cleanStats(raw: unknown, year: number = stockholmYear()): Stats {
  const out = emptyStats(year);
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  // Stats from an earlier year start over; older data without a year belongs to the current one.
  const sameYear = typeof r["year"] !== "number" || r["year"] === year;
  if (!sameYear) { out.lifetimePlayed = cleanCount(r["lifetimePlayed"]); return out; }
  for (const l of LEVELS) {
    const x = (r[l] && typeof r[l] === "object" ? r[l] : {}) as Record<string, unknown>;
    const played = cleanCount(x["played"]);
    out[l] = { played, wins: Math.min(cleanCount(x["wins"]), played), perfect: Math.min(cleanCount(x["perfect"]), played), bestMs: cleanCount(x["bestMs"]) || null, totalMs: cleanCount(x["totalMs"]) };
  }
  out.lifetimePlayed = Math.max(cleanCount(r["lifetimePlayed"]), LEVELS.reduce((s, l) => s + out[l].played, 0));
  return out;
}

/** Pure: adds a finished game. Unfinished games never count. */
export function addResult(st: Stats, g: GameState): Stats {
  if (!g.finished) return st;
  const l = st[g.level];
  const win = g.hints === 0;
  const perfect = g.hints === 0 && g.mistakes === 0;
  return {
    ...st,
    lifetimePlayed: st.lifetimePlayed + 1,
    [g.level]: {
      played: l.played + 1,
      wins: l.wins + (win ? 1 : 0),
      perfect: l.perfect + (perfect ? 1 : 0),
      bestMs: win ? (l.bestMs == null ? g.elapsedMs : Math.min(l.bestMs, g.elapsedMs)) : l.bestMs,
      totalMs: l.totalMs + g.elapsedMs,
    },
  };
}

// ---------- All-time statistics (never reset by year change) ----------
export type AllTimeStats = Record<Level, LevelStats>;
const ALLTIME = NS + "alltime";
export const emptyAllTime = (): AllTimeStats => ({ easy: emptyLevel(), medium: emptyLevel(), hard: emptyLevel(), expert: emptyLevel(), ultra: emptyLevel(), impossible: emptyLevel(), master: emptyLevel() });

export function cleanAllTime(raw: unknown): AllTimeStats {
  const out = emptyAllTime();
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  for (const l of LEVELS) {
    const x = (r[l] && typeof r[l] === "object" ? r[l] : {}) as Record<string, unknown>;
    const played = cleanCount(x["played"]);
    out[l] = { played, wins: Math.min(cleanCount(x["wins"]), played), perfect: Math.min(cleanCount(x["perfect"]), played), bestMs: cleanCount(x["bestMs"]) || null, totalMs: cleanCount(x["totalMs"]) };
  }
  return out;
}

/** Pure: adds a finished game to the all-time numbers. */
export function addAllTimeResult(at: AllTimeStats, g: GameState): AllTimeStats {
  if (!g.finished) return at;
  const l = at[g.level];
  const win = g.hints === 0;
  const perfect = g.hints === 0 && g.mistakes === 0;
  return {
    ...at,
    [g.level]: {
      played: l.played + 1,
      wins: l.wins + (win ? 1 : 0),
      perfect: l.perfect + (perfect ? 1 : 0),
      bestMs: win ? (l.bestMs == null ? g.elapsedMs : Math.min(l.bestMs, g.elapsedMs)) : l.bestMs,
      totalMs: l.totalMs + g.elapsedMs,
    },
  };
}

/** First run seeds from the current year's stats so existing players keep their numbers. */
export function loadAllTime(): AllTimeStats {
  const raw = read<unknown>(ALLTIME, null);
  if (raw == null) {
    const st = loadStats();
    const seeded = emptyAllTime();
    for (const l of LEVELS) seeded[l] = { ...st[l] };
    return seeded;
  }
  return cleanAllTime(raw);
}
export const saveAllTime = (s: AllTimeStats) => write(ALLTIME, s);

const COUNTED = NS + "counted";
export const loadStats = (): Stats => cleanStats(read<unknown>(STATS, {}));
export const saveStats = (s: Stats) => write(STATS, s);
/** Records a finished game once per game id. */
export function recordFinish(g: GameState) {
  if (!g.finished) return;
  let list: string[] = [];
  try { const v: unknown = JSON.parse(localStorage.getItem(COUNTED) ?? "[]"); if (Array.isArray(v)) list = v.filter((x) => typeof x === "string"); } catch { /* damaged list starts over */ }
  if (list.includes(g.id)) return;
  const at = loadAllTime(); // load before the yearly save so a first-run seed never double-counts this game
  const p = loadProgress(); // migrate from the old stats, not stats already containing this result
  saveStats(addResult(loadStats(), g));
  saveAllTime(addAllTimeResult(at, g));
  saveProgress({ ...p, [g.level]: p[g.level] + 1 });
  // Keep the existing list format for older installations, but never evict a recorded ID.
  write(COUNTED, [...list, g.id]);
}

// ---------- Level unlock progress (lifetime, never reset) ----------
const PROGRESS = NS + "progress";
export function loadProgress(): Progress {
  const out = emptyProgress();
  if (typeof window === "undefined") return out;
  let raw: Record<string, unknown> | null = null;
  try { const v: unknown = JSON.parse(localStorage.getItem(PROGRESS) ?? "null"); if (v && typeof v === "object") raw = v as Record<string, unknown>; } catch { /* damaged */ }
  // First run: seed from this year's solved games so nobody loses levels they already played.
  const st = raw ? null : loadStats();
  for (const l of LEVELS) out[l] = raw ? cleanCount(raw[l]) : (st?.[l].played ?? 0);
  return out;
}
export const saveProgress = (p: Progress) => write(PROGRESS, p);
export const resetStats = () => { const s = loadStats(); saveStats({ ...emptyStats(), lifetimePlayed: s.lifetimePlayed }); saveAllTime(emptyAllTime()); };
