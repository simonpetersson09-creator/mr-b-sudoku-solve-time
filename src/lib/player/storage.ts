import { isLevel, LEVELS, type GameState, type Level } from "@/lib/sudoku/engine";

/** All Sokudo keys live in their own namespace; never shared with Ludo or Yatzy. */
const NS = "mrb-sudoku:v1:";
const STATS = NS + "stats";
const SETTINGS = NS + "settings";
const GAMES = NS + "games";
const ACTIVE = NS + "active-game-id";
const LEVEL = NS + "level";

export interface Settings { name: string; haptics: boolean; showMistakes: boolean; highlightSame: boolean; autoRemoveNotes: boolean }
const DEFAULT_SETTINGS: Settings = { name: "Spelare", haptics: true, showMistakes: true, highlightSame: true, autoRemoveNotes: true };

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

const isGrid = (g: unknown) => Array.isArray(g) && g.length === 81 && g.every((v) => Number.isInteger(v) && v >= 0 && v <= 9);
/** True only for a structurally sound, unfinished saved game. */
export function isValidSave(g: unknown): g is GameState {
  if (!g || typeof g !== "object") return false;
  const s = g as GameState;
  return typeof s.id === "string" && isLevel(s.level) && isGrid(s.puzzle) && isGrid(s.solution) && isGrid(s.values)
    && Array.isArray(s.notes) && s.notes.length === 81 && Array.isArray(s.history) && Number.isFinite(s.elapsedMs) && !s.finished;
}

/** Pure: newest first, at most MAX_SAVED_GAMES. */
export function capSaves(list: SavedGame[]): SavedGame[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SAVED_GAMES);
}

function readSaves(): SavedGame[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GAMES) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((e): e is SavedGame => !!e && typeof e.id === "string" && isValidSave(e.game)) : [];
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
  return readSaves().find((e) => e.id === id)?.game ?? null;
};
/** Starts a new game without touching the other saved ones. */
export const startNewGame = (g: GameState, now = Date.now()) => {
  writeSaves([{ id: g.id, game: g, updatedAt: now }, ...readSaves().filter((e) => e.id !== g.id)]);
  selectGame(g.id);
};
/** Saves progress of a game (finished games are removed). */
export const saveGame = (g: GameState, now = Date.now()) => {
  const rest = readSaves().filter((e) => e.id !== g.id);
  writeSaves(g.finished ? rest : [{ id: g.id, game: g, updatedAt: now }, ...rest]);
};
/** Removes one game; the others stay. */
export const removeGame = (id: string) => {
  writeSaves(readSaves().filter((e) => e.id !== id));
  if (activeId() === id) { try { localStorage.removeItem(ACTIVE); } catch { /* noop */ } }
};

export const loadSettings = () => read(SETTINGS, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => write(SETTINGS, s);

export const loadLevel = (): Level => {
  if (typeof window === "undefined") return "easy";
  try { const v = localStorage.getItem(LEVEL); return isLevel(v) ? v : "easy"; } catch { return "easy"; }
};
export const saveLevel = (l: Level) => { try { localStorage.setItem(LEVEL, l); } catch { /* noop */ } };

// ---------- Statistics per level ----------
/** played = finished games only (a solved puzzle). wins = solved without hints. */
export interface LevelStats { played: number; wins: number; bestMs: number | null; totalMs: number }
export type Stats = Record<Level, LevelStats> & { lifetimePlayed: number };
const emptyLevel = (): LevelStats => ({ played: 0, wins: 0, bestMs: null, totalMs: 0 });
export const emptyStats = (): Stats => ({ easy: emptyLevel(), medium: emptyLevel(), hard: emptyLevel(), expert: emptyLevel(), lifetimePlayed: 0 });

const cleanCount = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
export function cleanStats(raw: unknown): Stats {
  const out = emptyStats();
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  for (const l of LEVELS) {
    const x = (r[l] && typeof r[l] === "object" ? r[l] : {}) as Record<string, unknown>;
    const played = cleanCount(x["played"]);
    out[l] = { played, wins: Math.min(cleanCount(x["wins"]), played), bestMs: cleanCount(x["bestMs"]) || null, totalMs: cleanCount(x["totalMs"]) };
  }
  out.lifetimePlayed = Math.max(cleanCount(r["lifetimePlayed"]), LEVELS.reduce((s, l) => s + out[l].played, 0));
  return out;
}

/** Pure: adds a finished game. Unfinished games never count. */
export function addResult(st: Stats, g: GameState): Stats {
  if (!g.finished) return st;
  const l = st[g.level];
  const win = g.hints === 0;
  return {
    ...st,
    lifetimePlayed: st.lifetimePlayed + 1,
    [g.level]: {
      played: l.played + 1,
      wins: l.wins + (win ? 1 : 0),
      bestMs: win ? (l.bestMs == null ? g.elapsedMs : Math.min(l.bestMs, g.elapsedMs)) : l.bestMs,
      totalMs: l.totalMs + g.elapsedMs,
    },
  };
}

const COUNTED = NS + "counted";
export const loadStats = (): Stats => cleanStats(read<unknown>(STATS, {}));
export const saveStats = (s: Stats) => write(STATS, s);
/** Records a finished game once per game id. */
export function recordFinish(g: GameState) {
  if (!g.finished) return;
  const done = read<string[]>(COUNTED, []);
  const list = Array.isArray(done) ? done : [];
  if (list.includes(g.id)) return;
  saveStats(addResult(loadStats(), g));
  write(COUNTED, [...list, g.id].slice(-200));
}
export const resetStats = () => { const s = loadStats(); saveStats({ ...emptyStats(), lifetimePlayed: s.lifetimePlayed }); };
