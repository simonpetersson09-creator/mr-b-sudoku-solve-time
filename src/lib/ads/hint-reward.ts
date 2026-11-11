import { explainHint, isLost, markHint, MAX_HINTS, setValue, type GameState, type HintInfo } from '@/lib/sudoku/engine';

/** A single SDK reward is bound to the game that accepted the offer, never a later game. */
export function createHintReward(gameId: string, cell: number, autoRemoveNotes: boolean, getGame: () => GameState | null, commit: (game: GameState, info: HintInfo) => void) {
  let claimed = false;
  return () => {
    if (claimed) return false;
    claimed = true;
    const current = getGame();
    if (!current || current.id !== gameId || current.finished || isLost(current) || current.hints >= MAX_HINTS) return false;
    const info = explainHint(current, cell);
    if (!info) return false;
    const marked = markHint(current, cell);
    if (marked.cell == null) return false;
    const next = setValue(marked.state, cell, info.digit, autoRemoveNotes, true);
    commit(next, info);
    return true;
  };
}