import { countSolutions, type GameState } from '../sudoku/engine';

// Cache immutable puzzle/solution pairs, never the changing notes, clock or undo state.
const verified = new Map<string, boolean>();
export const SAVE_VALIDATION_MAX_NODES = 25_000;
export function hasUniqueSavedPuzzle(game: Pick<GameState, 'puzzle' | 'solution'>): boolean {
  const key = game.puzzle.join('') + ':' + game.solution.join('');
  const cached = verified.get(key);
  if (cached !== undefined) return cached;
  const valid = countSolutions(game.puzzle, 2, SAVE_VALIDATION_MAX_NODES) === 1;
  if (verified.size >= 100) verified.delete(verified.keys().next().value ?? '');
  verified.set(key, valid);
  return valid;
}