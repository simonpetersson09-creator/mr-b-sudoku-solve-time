import type { GameState } from './engine';

/** One monotonic clock per play screen. Consume time before changing gameplay or stopping. */
export function createPlayClock(now: () => number = () => performance.now()) {
  let activeId: string | null = null;
  let last = 0;
  const charge = (game: GameState): GameState => {
    if (activeId !== game.id) return game;
    const current = now();
    const delta = Math.max(0, current - last);
    last = current;
    return delta > 0 ? { ...game, elapsedMs: game.elapsedMs + delta } : game;
  };
  return {
    start(game: GameState) {
      if (activeId === game.id) return;
      activeId = game.id;
      last = now();
    },
    charge,
    stop(game: GameState): GameState {
      const next = charge(game);
      activeId = null;
      return next;
    },
  };
}