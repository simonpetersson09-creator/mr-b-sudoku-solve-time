import { expect, it, vi } from 'vitest';
import * as engine from '../sudoku/engine';
import { hasUniqueSavedPuzzle, SAVE_VALIDATION_MAX_NODES } from './puzzle-validation';
it('validates the immutable puzzle only once while time, notes and digits change', () => {
  const g = engine.newGame('easy', 8989, 'cached');
  const spy = vi.spyOn(engine, 'countSolutions');
  expect(hasUniqueSavedPuzzle(g)).toBe(true);
  expect(hasUniqueSavedPuzzle({ ...g, puzzle: g.puzzle.slice(), solution: g.solution.slice() })).toBe(true);
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(g.puzzle, 2, SAVE_VALIDATION_MAX_NODES);
  spy.mockRestore();
});
it('bounds pathological solving and never treats an exhausted search as proof of uniqueness', () => {
  expect(engine.countSolutions(Array(81).fill(0), 2, 1)).toBe(-1);
});