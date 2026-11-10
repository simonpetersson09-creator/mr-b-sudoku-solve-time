/**
 * Pure Sudoku engine: no React, DOM or network. A grid is 81 numbers (row-major), 0 = empty.
 * Notes are a 9-bit mask per cell (bit d-1 set = note d).
 */
export const LEVELS = ["easy", "medium", "hard", "expert", "ultra", "impossible"] as const;
export type Level = (typeof LEVELS)[number];
export const isLevel = (v: unknown): v is Level => (LEVELS as readonly unknown[]).includes(v);

/** Target number of given digits per level. */
/**
 * Target number of given digits per level. Easy to Expert differ mainly by clue count;
 * Ultra and Impossible keep Expert's 24 but must need deeper techniques (see tooEasy).
 */
export const GIVENS: Record<Level, number> = { easy: 40, medium: 33, hard: 28, expert: 24, ultra: 24, impossible: 24 };

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

/**
 * True when naked/hidden singles plus naked and hidden pairs finish the grid. Ultraexpert and
 * Impossible must need more than that, so a puzzle this solver can finish is not hard enough for them.
 */
export function solvableWithPairs(grid: Grid): boolean {
  const g = grid.slice();
  const m = Array.from({ length: 81 }, (_, i) => (g[i] ? bit(g[i]) : candidates(g, i)));
  const place = (i: number, d: number) => {
    g[i] = d;
    m[i] = bit(d);
    for (const p of PEERS[i]) m[p] &= ~bit(d);
  };
  const spotsOf = (u: number[], d: number) => u.filter((i) => !g[i] && m[i] & bit(d));
  for (;;) {
    let progress = false;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      if (m[i] === 0) return false;
      if (popcount(m[i]) === 1) { place(i, Math.log2(m[i]) + 1); progress = true; }
    }
    for (const u of UNITS) {
      for (let d = 1; d <= 9; d++) {
        if (u.some((i) => g[i] === d)) continue;
        const spots = spotsOf(u, d);
        if (spots.length === 1) { place(spots[0], d); progress = true; }
      }
      const open = u.filter((i) => !g[i]);
      // Naked pair: two cells hold the same two digits, so no other cell in the unit may hold them.
      for (let a = 0; a < open.length; a++) {
        for (let b = a + 1; b < open.length; b++) {
          const ma = m[open[a]], mb = m[open[b]];
          if (ma !== mb || popcount(ma) !== 2) continue;
          for (const i of open) if (i !== open[a] && i !== open[b] && m[i] & ma) { m[i] &= ~ma; progress = true; }
        }
      }
      // Hidden pair: two digits fit only the same two cells, so those cells hold nothing else.
      for (let d1 = 1; d1 <= 9; d1++) {
        if (u.some((i) => g[i] === d1)) continue;
        const s1 = spotsOf(u, d1);
        if (s1.length !== 2) continue;
        for (let d2 = d1 + 1; d2 <= 9; d2++) {
          if (u.some((i) => g[i] === d2)) continue;
          const s2 = spotsOf(u, d2);
          if (s2.length !== 2 || s2[0] !== s1[0] || s2[1] !== s1[1]) continue;
          const keep = bit(d1) | bit(d2);
          for (const i of s1) if (m[i] & ~keep) { m[i] &= keep; progress = true; }
        }
      }
    }
    if (g.every((v) => v)) return true;
    for (let i = 0; i < 81; i++) if (!g[i] && m[i] === 0) return false;
    if (!progress) return false;
  }
}

/** Index combinations of size k over n, memoised: used for naked and hidden subsets. */
const COMBO_CACHE = new Map<string, number[][]>();
function indexCombos(n: number, k: number): number[][] {
  const key = `${n}:${k}`;
  const hit = COMBO_CACHE.get(key);
  if (hit) return hit;
  const out: number[][] = [];
  const pick: number[] = [];
  const walk = (from: number) => {
    if (pick.length === k) { out.push(pick.slice()); return; }
    for (let i = from; i <= n - (k - pick.length); i++) { pick.push(i); walk(i + 1); pick.pop(); }
  };
  walk(0);
  COMBO_CACHE.set(key, out);
  return out;
}

/**
 * True when singles, pointing pairs, naked/hidden pairs and naked/hidden triples finish the grid.
 * Impossible must need more than that.
 */
export function solvableAdvanced(grid: Grid): boolean {
  const g = grid.slice();
  const m = Array.from({ length: 81 }, (_, i) => (g[i] ? bit(g[i]) : candidates(g, i)));
  const place = (i: number, d: number) => {
    g[i] = d;
    m[i] = bit(d);
    for (const p of PEERS[i]) m[p] &= ~bit(d);
  };
  const spotsOf = (u: number[], d: number) => u.filter((i) => !g[i] && m[i] & bit(d));
  const trim = (i: number, keep: number) => { const before = m[i]; m[i] &= keep; return m[i] !== before; };
  for (;;) {
    let progress = false;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      if (m[i] === 0) return false;
      if (popcount(m[i]) === 1) { place(i, Math.log2(m[i]) + 1); progress = true; }
    }
    // Pointing pair: in a box, a digit confined to one row or column is ruled out along that line.
    for (let b = 0; b < 9; b++) {
      const box = UNITS[18 + b];
      for (let d = 1; d <= 9; d++) {
        const spots = spotsOf(box, d);
        if (spots.length < 2) continue;
        const row = Math.floor(spots[0] / 9), col = spots[0] % 9;
        if (spots.every((i) => Math.floor(i / 9) === row)) {
          for (const i of UNITS[row]) if (!box.includes(i) && trim(i, ~bit(d))) progress = true;
        } else if (spots.every((i) => i % 9 === col)) {
          for (const i of UNITS[9 + col]) if (!box.includes(i) && trim(i, ~bit(d))) progress = true;
        }
      }
    }
    for (const u of UNITS) {
      for (let d = 1; d <= 9; d++) {
        if (u.some((i) => g[i] === d)) continue;
        const spots = spotsOf(u, d);
        if (spots.length === 1) { place(spots[0], d); progress = true; }
      }
      const open = u.filter((i) => !g[i]);
      // Naked subset: k cells whose candidates span only k digits hold nothing else in this unit.
      for (const k of [2, 3]) {
        for (const c of indexCombos(open.length, k)) {
          const cells = c.map((x) => open[x]);
          let union = 0;
          for (const i of cells) union |= m[i];
          if (popcount(union) !== k) continue;
          for (const i of open) if (!cells.includes(i) && trim(i, ~union)) progress = true;
        }
        // Hidden subset: k digits that fit only k cells, so those cells hold nothing else.
        for (const c of indexCombos(9, k)) {
          const digits = c.map((x) => x + 1).filter((d) => !u.some((i) => g[i] === d));
          if (digits.length !== k) continue;
          const spots = new Set<number>();
          for (const d of digits) spotsOf(u, d).forEach((i) => spots.add(i));
          if (spots.size !== k) continue;
          const keep = digits.reduce((acc, d) => acc | bit(d), 0);
          for (const i of spots) if (trim(i, keep)) progress = true;
        }
      }
    }
    if (g.every((v) => v)) return true;
    for (let i = 0; i < 81; i++) if (!g[i] && m[i] === 0) return false;
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
  /** What makes a puzzle too easy for this level: unchecked by the generator's own test. */
  const tooEasy: (p: Grid) => boolean = singlesOnly
    ? (p) => !solvableBySingles(p)
    : level === "ultra"
      ? solvableWithPairs
      : level === "impossible"
        ? solvableAdvanced
        : solvableBySingles;
  let best: Puzzle | null = null;
  let bestGivens = 99;
  /** Best puzzle that passes the technique gate but has too many givens. */
  let gated: Puzzle | null = null;
  let gatedGivens = 99;
  for (let attempt = 0; attempt < 30; attempt++) {
    const solution = fullGrid(rand);
    const puzzle = solution.slice();
    let givens = 81;
    for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), rand)) {
      if (givens <= target) break;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle, 2) !== 1 || (singlesOnly && tooEasy(puzzle))) puzzle[i] = keep;
      else givens--;
    }
    const candidate = { level, seed, puzzle, solution };
    // Hard and Expert must need more than singles, Ultra and Impossible more than pairs;
    // Easy and Medium are guaranteed singles-only by the removal loop above.
    const hardEnough = !tooEasy(puzzle);
    if (givens <= target && hardEnough) return candidate;
    // Nothing met both rules yet: passing the technique gate beats having fewer givens.
    if (hardEnough && givens < gatedGivens) { gated = candidate; gatedGivens = givens; }
    else if (!hardEnough && givens < bestGivens) { best = candidate; bestGivens = givens; }
  }
  return gated ?? best!;
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
  /** Undos remaining in this game (max MAX_UNDOS). */
  undosLeft: number;
  history: Change[][];
  finished: boolean;
  startedAt: number;
  updatedAt: number;
};

/** Undos allowed per game. */
export const MAX_UNDOS = 3;
/** Mistakes allowed; the third mistake ends (loses) the game. */
export const MAX_MISTAKES = 3;
export const isLost = (s: GameState) => !s.finished && s.mistakes >= MAX_MISTAKES;
/** No more moves: solved or lost. */
const over = (s: GameState) => s.finished || isLost(s);

/** Cells of every row, column and box through cell i that are now completely and correctly filled. */
export function completedGroups(s: GameState, i: number): number[] {
  const r = rowOf(i), c = colOf(i), b = boxOf(i);
  const groups = [
    Array.from({ length: 9 }, (_, k) => r * 9 + k),
    Array.from({ length: 9 }, (_, k) => k * 9 + c),
    Array.from({ length: 9 }, (_, k) => (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3)),
  ];
  const out = new Set<number>();
  for (const g of groups) if (g.every((x) => s.values[x] === s.solution[x])) g.forEach((x) => out.add(x));
  return [...out];
}

export function newGame(level: Level, seed: number, id: string, now = Date.now()): GameState {
  const p = generate(level, seed);
  return {
    id, level, seed, puzzle: p.puzzle, solution: p.solution, values: p.puzzle.slice(), notes: Array(81).fill(0),
    mistakes: 0, hints: 0, elapsedMs: 0, undosLeft: MAX_UNDOS, history: [], finished: false, startedAt: now, updatedAt: now,
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

/** Places a digit and clears the cell's notes; with clearPeerNotes, also that digit's notes in peers (undone together). */
export function setValue(s: GameState, i: number, d: number, clearPeerNotes = true): GameState {
  if (over(s) || isGiven(s, i) || d < 1 || d > 9 || s.values[i] === d) return s;
  const changes: Change[] = [{ i, value: d, notes: 0 }];
  if (clearPeerNotes) for (const p of PEERS[i]) if (s.notes[p] & bit(d)) changes.push({ i: p, value: s.values[p], notes: s.notes[p] & ~bit(d) });
  const next = apply(s, changes);
  return d !== s.solution[i] ? { ...next, mistakes: s.mistakes + 1 } : next;
}

/** Toggles a note on an empty, non-given cell. */
export function toggleNote(s: GameState, i: number, d: number): GameState {
  if (over(s) || isGiven(s, i) || s.values[i] !== 0 || d < 1 || d > 9) return s;
  return apply(s, [{ i, value: 0, notes: s.notes[i] ^ bit(d) }]);
}

/** Clears a non-given cell's digit and notes. */
export function erase(s: GameState, i: number): GameState {
  if (over(s) || isGiven(s, i) || (s.values[i] === 0 && s.notes[i] === 0)) return s;
  return apply(s, [{ i, value: 0, notes: 0 }]);
}

/** Reverts the latest change (digit, note or erase). Hints cannot be undone. Limited to MAX_UNDOS per game. */
export function undo(s: GameState): GameState {
  if (over(s) || !s.history.length || s.undosLeft <= 0) return s;
  const last = s.history[s.history.length - 1];
  const values = s.values.slice(), notes = s.notes.slice();
  for (const c of last) { values[c.i] = c.value; notes[c.i] = c.notes; }
  return { ...s, values, notes, undosLeft: s.undosLeft - 1, history: s.history.slice(0, -1) };
}

/** Reveals the correct digit: the selected cell when it is open or wrong, else the first such cell. */
export function hint(s: GameState, selected: number | null): { state: GameState; cell: number | null } {
  if (over(s)) return { state: s, cell: null };
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

/**
 * Smart hint: points out ONE cell without filling it. A wrong digit is pointed out first; otherwise a cell
 * that can be solved right now (only one digit fits, or a digit fits nowhere else in its row/column/box),
 * else the open cell with the fewest possible digits. Counts as a used hint.
 */
export function findHintCell(s: GameState): number | null {
  if (over(s)) return null;
  const wrong = s.values.findIndex((_, i) => isWrong(s, i));
  if (wrong >= 0) return wrong;
  const known = s.values.map((v, i) => (v === s.solution[i] ? v : 0));
  const cand = (i: number) => {
    if (known[i]) return 0;
    let m = 0x3fe;
    for (const p of PEERS[i]) if (known[p]) m &= ~bit(known[p]);
    return m;
  };
  const masks = known.map((_, i) => cand(i));
  const pop = (m: number) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
  const single = masks.findIndex((m) => m && pop(m) === 1);
  if (single >= 0) return single;
  const units: number[][] = [];
  for (let k = 0; k < 9; k++) {
    units.push(Array.from({ length: 9 }, (_, j) => k * 9 + j), Array.from({ length: 9 }, (_, j) => j * 9 + k),
      Array.from({ length: 9 }, (_, j) => (Math.floor(k / 3) * 3 + Math.floor(j / 3)) * 9 + (k % 3) * 3 + (j % 3)));
  }
  for (const u of units) for (let d = 1; d <= 9; d++) {
    const spots = u.filter((i) => masks[i] & bit(d));
    if (spots.length === 1) return spots[0];
  }
  let best = -1;
  masks.forEach((m, i) => { if (m && (best < 0 || pop(m) < pop(masks[best]))) best = i; });
  return best >= 0 ? best : null;
}

/** Uses a hint: marks the cell from findHintCell and counts it; the board itself is unchanged. */
export function markHint(s: GameState): { state: GameState; cell: number | null } {
  const cell = findHintCell(s);
  return cell == null ? { state: s, cell } : { state: { ...s, hints: s.hints + 1 }, cell };
}

/** How many of each digit are correctly placed (a digit with 9 is complete). */
export function digitCounts(s: GameState): number[] {
  const out = Array(10).fill(0);
  s.values.forEach((v, i) => { if (v && v === s.solution[i]) out[v]++; });
  return out;
}

export const hasNote = (mask: number, d: number) => (mask & bit(d)) !== 0;
