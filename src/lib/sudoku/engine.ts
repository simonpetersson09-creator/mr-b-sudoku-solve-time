/**
 * Pure Sudoku engine: no React, DOM or network. A grid is 81 numbers (row-major), 0 = empty.
 * Notes are a 9-bit mask per cell (bit d-1 set = note d).
 */
export const LEVELS = ["easy", "medium", "hard", "expert"] as const;
export type Level = (typeof LEVELS)[number];
export const isLevel = (v: unknown): v is Level => (LEVELS as readonly unknown[]).includes(v);

/** Target number of given digits per level. */
export const GIVENS: Record<Level, number> = { easy: 40, medium: 33, hard: 28, expert: 24 };

export type Grid = number[];

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** The 20 cells sharing a row, column or box with each cell. */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = [];
  for (let j = 0; j < 81; j++) if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) out.push(j);
  return out;
});
const UNITS: number[][] = [
  ...Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, b) => Array.from({ length: 9 }, (_, k) => (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3))),
];

/** Deterministic PRNG so a seed always gives the same puzzle. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

const bit = (d: number) => 1 << (d - 1);
function candidates(g: Grid, i: number): number {
  let used = 0;
  for (const p of PEERS[i]) if (g[p]) used |= bit(g[p]);
  return ~used & 0x1ff;
}
const popcount = (m: number) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

/** A grid is consistent when no filled digit repeats in a row, column or box. */
export function isConsistent(g: Grid): boolean {
  for (let i = 0; i < 81; i++) if (g[i] && PEERS[i].some((p) => g[p] === g[i])) return false;
  return true;
}

/** Counts solutions up to `limit` (2 is enough to prove uniqueness). */
export function countSolutions(grid: Grid, limit = 2): number {
  const g = grid.slice();
  if (!isConsistent(g)) return 0;
  let count = 0;
  const walk = (): boolean => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = candidates(g, i);
      const n = popcount(m);
      if (n === 0) return false;
      if (n < bestN) { best = i; bestMask = m; bestN = n; if (n === 1) break; }
    }
    if (best < 0) { count++; return count >= limit; }
    for (let d = 1; d <= 9; d++) {
      if (!(bestMask & bit(d))) continue;
      g[best] = d;
      if (walk()) return true;
    }
    g[best] = 0;
    return false;
  };
  walk();
  return count;
}

/** Solves a grid, or returns null when it has no solution. */
export function solve(grid: Grid): Grid | null {
  const g = grid.slice();
  if (!isConsistent(g)) return null;
  const walk = (): boolean => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = candidates(g, i); const n = popcount(m);
      if (n === 0) return false;
      if (n < bestN) { best = i; bestMask = m; bestN = n; }
    }
    if (best < 0) return true;
    for (let d = 1; d <= 9; d++) { if (bestMask & bit(d)) { g[best] = d; if (walk()) return true; } }
    g[best] = 0;
    return false;
  };
  return walk() ? g : null;
}

/** True when naked and hidden singles alone finish the grid (used for Easy/Medium). */
export function solvableBySingles(grid: Grid): boolean {
  const g = grid.slice();
  for (;;) {
    let progress = false;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = candidates(g, i);
      if (m === 0) return false;
      if (popcount(m) === 1) { g[i] = Math.log2(m) + 1; progress = true; }
    }
    for (const unit of UNITS) {
      for (let d = 1; d <= 9; d++) {
        if (unit.some((i) => g[i] === d)) continue;
        const spots = unit.filter((i) => !g[i] && candidates(g, i) & bit(d));
        if (spots.length === 1) { g[spots[0]] = d; progress = true; }
      }
    }
    if (g.every((v) => v)) return true;
    if (!progress) return false;
  }
}

function fullGrid(rand: () => number): Grid {
  const g: Grid = Array(81).fill(0);
  const walk = (i: number): boolean => {
    if (i === 81) return true;
    const m = candidates(g, i);
    for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand)) {
      if (!(m & bit(d))) continue;
      g[i] = d;
      if (walk(i + 1)) return true;
    }
    g[i] = 0;
    return false;
  };
  walk(0);
  return g;
}

export type Puzzle = { level: Level; seed: number; puzzle: Grid; solution: Grid };

/** Generates a puzzle with exactly one solution for the level. Same seed + level = same puzzle. */
export function generate(level: Level, seed: number): Puzzle {
  const rand = rng(seed);
  const target = GIVENS[level];
  const singlesOnly = level === "easy" || level === "medium";
  let best: Puzzle | null = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const solution = fullGrid(rand);
    const puzzle = solution.slice();
    let givens = 81;
    for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), rand)) {
      if (givens <= target) break;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle, 2) !== 1 || (singlesOnly && !solvableBySingles(puzzle))) puzzle[i] = keep;
      else givens--;
    }
    const candidate = { level, seed, puzzle, solution };
    const hardEnough = level === "hard" || level === "expert" ? !solvableBySingles(puzzle) || level === "hard" : true;
    if (givens <= target && hardEnough) return candidate;
    if (!best || givens < best.puzzle.filter(Boolean).length) best = candidate;
  }
  return best!;
}

// ---------- Game state ----------

type Change = { i: number; value: number; notes: number };
export type GameState = {
  id: string;
  level: Level;
  seed: number;
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  notes: number[];
  mistakes: number;
  hints: number;
  elapsedMs: number;
  history: Change[][];
  finished: boolean;
  startedAt: number;
  updatedAt: number;
};

export function newGame(level: Level, seed: number, id: string, now = Date.now()): GameState {
  const p = generate(level, seed);
  return {
    id, level, seed, puzzle: p.puzzle, solution: p.solution, values: p.puzzle.slice(), notes: Array(81).fill(0),
    mistakes: 0, hints: 0, elapsedMs: 0, history: [], finished: false, startedAt: now, updatedAt: now,
  };
}

export const isGiven = (s: GameState, i: number) => s.puzzle[i] !== 0;
/** Error marking: a placed digit that differs from the unique solution. */
export const isWrong = (s: GameState, i: number) => !isGiven(s, i) && s.values[i] !== 0 && s.values[i] !== s.solution[i];
export const isSolved = (s: GameState) => s.values.every((v, i) => v === s.solution[i]);

function apply(s: GameState, changes: Change[], record = true): GameState {
  if (!changes.length) return s;
  const values = s.values.slice(), notes = s.notes.slice();
  const undo: Change[] = changes.map((c) => ({ i: c.i, value: values[c.i], notes: notes[c.i] }));
  for (const c of changes) { values[c.i] = c.value; notes[c.i] = c.notes; }
  const next = { ...s, values, notes, history: record ? [...s.history, undo] : s.history };
  return { ...next, finished: isSolved(next) };
}

/** Places a digit. Clears the cell's notes and that digit's notes in peers (undone together). */
export function setValue(s: GameState, i: number, d: number): GameState {
  if (s.finished || isGiven(s, i) || d < 1 || d > 9 || s.values[i] === d) return s;
  const changes: Change[] = [{ i, value: d, notes: 0 }];
  for (const p of PEERS[i]) if (s.notes[p] & bit(d)) changes.push({ i: p, value: s.values[p], notes: s.notes[p] & ~bit(d) });
  const next = apply(s, changes);
  return d !== s.solution[i] ? { ...next, mistakes: s.mistakes + 1 } : next;
}

/** Toggles a note on an empty, non-given cell. */
export function toggleNote(s: GameState, i: number, d: number): GameState {
  if (s.finished || isGiven(s, i) || s.values[i] !== 0 || d < 1 || d > 9) return s;
  return apply(s, [{ i, value: 0, notes: s.notes[i] ^ bit(d) }]);
}

/** Clears a non-given cell's digit and notes. */
export function erase(s: GameState, i: number): GameState {
  if (s.finished || isGiven(s, i) || (s.values[i] === 0 && s.notes[i] === 0)) return s;
  return apply(s, [{ i, value: 0, notes: 0 }]);
}

/** Reverts the latest change (digit, note or erase). Hints cannot be undone. */
export function undo(s: GameState): GameState {
  if (s.finished || !s.history.length) return s;
  const last = s.history[s.history.length - 1];
  const values = s.values.slice(), notes = s.notes.slice();
  for (const c of last) { values[c.i] = c.value; notes[c.i] = c.notes; }
  return { ...s, values, notes, history: s.history.slice(0, -1) };
}

/** Reveals the correct digit: the selected cell when it is open or wrong, else the first such cell. */
export function hint(s: GameState, selected: number | null): { state: GameState; cell: number | null } {
  if (s.finished) return { state: s, cell: null };
  const open = (i: number) => !isGiven(s, i) && s.values[i] !== s.solution[i];
  const cell = selected != null && open(selected) ? selected : s.values.findIndex((_, i) => open(i));
  if (cell < 0) return { state: s, cell: null };
  const d = s.solution[cell];
  const changes: Change[] = [{ i: cell, value: d, notes: 0 }];
  for (const p of PEERS[cell]) if (s.notes[p] & bit(d)) changes.push({ i: p, value: s.values[p], notes: s.notes[p] & ~bit(d) });
  const next = apply(s, changes, false);
  // A hint locks in: earlier history can no longer overwrite it.
  return { state: { ...next, hints: s.hints + 1, history: [] }, cell };
}

/** How many of each digit are correctly placed (a digit with 9 is complete). */
export function digitCounts(s: GameState): number[] {
  const out = Array(10).fill(0);
  s.values.forEach((v, i) => { if (v && v === s.solution[i]) out[v]++; });
  return out;
}

export const hasNote = (mask: number, d: number) => (mask & bit(d)) !== 0;
