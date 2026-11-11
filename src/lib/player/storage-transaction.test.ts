import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { recordFinish, loadStats, loadAllTime, loadProgress, startNewGame, loadGame } from './storage';
import { newGame } from '../sudoku/engine';
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it.each(['stats', 'alltime', 'progress', 'counted'])('recovers a partial %s write and counts the result exactly once', key => {
  const g = { ...newGame('easy', 77, 'transaction'), finished: true };
  const real = Storage.prototype.setItem;
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, k, v) {
    if (k === `mrb-sudoku:v1:${key}`) throw new Error('quota');
    real.call(this, k, v);
  });
  recordFinish(g);
  expect(loadStats().easy.played).toBe(1);
  expect(loadAllTime().easy.played).toBe(1);
  expect(loadProgress().easy).toBe(1);
  spy.mockRestore();recordFinish(g);
  expect(loadStats().easy.played).toBe(1);
});
it('a failed journal commit cannot remove a saved game or mutate statistics', () => {
  const g = newGame('easy', 78, 'old');startNewGame(g);
  const real = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage,k,v) {
    if (k.endsWith(':storage-transaction')) throw new Error('quota');real.call(this,k,v);
  });
  expect(() => recordFinish({ ...g, finished: true })).toThrow('quota');
  expect(loadStats().easy.played).toBe(0);expect(loadGame()?.id).toBe('old');
});