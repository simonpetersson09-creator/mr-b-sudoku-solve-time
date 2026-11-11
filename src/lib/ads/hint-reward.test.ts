import { beforeEach, expect, it } from 'vitest';
import { newGame, MAX_HINTS } from '@/lib/sudoku/engine';
import { loadGame, saveGame, startNewGame, recordFinish, loadStats, loadProgress } from '@/lib/player/storage';
import { createHintReward } from './hint-reward';

beforeEach(() => localStorage.clear());
function fixture() {
  let game = newGame('easy', 123, 'hint-game');
  const cell = game.values.findIndex(v => v === 0);
  let commits = 0;
  startNewGame(game);
  const claim = createHintReward(game.id, cell, true, () => game, next => { game = next; commits++; saveGame(next); });
  return { cell, claim, game: () => game, commits: () => commits, replace: (next: typeof game) => { game = next; } };
}
it('a confirmed reward fills exactly one correct cell and uses one hint; duplicate callbacks do nothing', () => {
  const f = fixture(); const before = f.game().values.slice();
  expect(f.claim()).toBe(true); expect(f.claim()).toBe(false);
  expect(f.commits()).toBe(1); expect(f.game().hints).toBe(1);
  expect(f.game().values[f.cell]).toBe(f.game().solution[f.cell]);
  expect(f.game().values.filter((v, i) => v !== before[i])).toHaveLength(1);
});
it('without a reward the three-hint allowance and saved game are unchanged', () => {
  const f = fixture(); expect(f.game().hints).toBe(0); expect(f.commits()).toBe(0);
  expect(loadGame()?.values).toEqual(f.game().values); expect(loadGame()?.hints).toBe(0);
});
it('never applies an old reward to a new game', () => {
  const f = fixture(); f.replace(newGame('easy', 124, 'different'));
  expect(f.claim()).toBe(false); expect(f.game().hints).toBe(0); expect(f.commits()).toBe(0);
});
it.each(['finished', 'lost', 'missing'] as const)('rejects a reward for a %s game', kind => {
  let game = newGame('easy', 123, 'old'); const cell = game.values.findIndex(v => !v);
  const claim = createHintReward('old', cell, true, () => kind === 'missing' ? null : game, () => { throw new Error('must not commit'); });
  game = { ...game, finished: kind === 'finished', mistakes: kind === 'lost' ? 3 : 0 };
  expect(claim()).toBe(false);
});
it('at most three separate confirmed rewards can consume three hints', () => {
  const f = fixture();
  for (let n = 1; n <= 4; n++) {
    const g = f.game(); const cell = g.values.findIndex(v => !v);
    const claim = createHintReward(g.id, cell, true, f.game, next => { f.replace(next); saveGame(next); });
    expect(claim()).toBe(n <= 3); expect(f.game().hints).toBe(Math.min(n, 3));
  }
  expect(MAX_HINTS).toBe(3);
});
it('rewarded progress reads back after restoring the save, with timer and mistakes preserved', () => {
  const f = fixture(); f.replace({ ...f.game(), elapsedMs: 123000, mistakes: 1 });
  expect(f.claim()).toBe(true);
  const restored = loadGame();
  expect(restored?.id).toBe('hint-game'); expect(restored?.hints).toBe(1);
  expect(restored?.values[f.cell]).toBe(f.game().solution[f.cell]);
  expect(restored?.elapsedMs).toBe(123000); expect(restored?.mistakes).toBe(1);
});
it('a reward on the last open cell finishes through the existing statistics rules exactly once', () => {
  const f = fixture(); const g = f.game(); const values = g.solution.slice(); values[f.cell] = 0; f.replace({ ...g, values });
  expect(f.claim()).toBe(true); expect(f.game().finished).toBe(true);
  recordFinish(f.game()); recordFinish(f.game());
  expect(loadStats().easy.played).toBe(1); expect(loadStats().easy.wins).toBe(0);
  expect(loadStats().easy.perfect).toBe(0); expect(loadGame()).toBeNull();
});
it('a reward does not change statistics or unlock progression before the game finishes', () => {
  const f = fixture(); const stats = loadStats(); const progress = loadProgress(); f.claim();
  expect(loadStats()).toEqual(stats); expect(loadProgress()).toEqual(progress);
});