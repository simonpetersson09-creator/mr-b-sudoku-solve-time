import { LEVELS, type Level } from "@/lib/sudoku/engine";

/** Solved games needed on the previous level to open each level. Easy is always open. */
export const UNLOCK_NEED: Record<Level, number> = { easy: 0, medium: 3, hard: 3, expert: 5, ultra: 5, impossible: 5, master: 10 };

/** Lifetime solved count per level; never reset at new year. */
export type Progress = Record<Level, number>;

export const emptyProgress = (): Progress =>
  Object.fromEntries(LEVELS.map((l) => [l, 0])) as Progress;

export const prevLevel = (l: Level): Level | null => {
  const i = LEVELS.indexOf(l);
  return i > 0 ? LEVELS[i - 1] : null;
};

/** A level is open when the previous one is open and has enough solved games. */
export function isUnlocked(p: Progress, l: Level): boolean {
  const prev = prevLevel(l);
  if (!prev) return true;
  return isUnlocked(p, prev) && p[prev] >= UNLOCK_NEED[l];
}

/** Games still to solve on the previous level, 0 when open. */
export const remainingFor = (p: Progress, l: Level): number => {
  const prev = prevLevel(l);
  return prev ? Math.max(0, UNLOCK_NEED[l] - p[prev]) : 0;
};

/** Hardest level the player may start. */
export const highestUnlocked = (p: Progress): Level =>
  [...LEVELS].reverse().find((l) => isUnlocked(p, l)) ?? "easy";

/** Levels that become open when `before` turns into `after`. */
export const newlyUnlocked = (before: Progress, after: Progress): Level[] =>
  LEVELS.filter((l) => !isUnlocked(before, l) && isUnlocked(after, l));
