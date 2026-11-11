import { type GameState, type Level } from "./engine";
import { randomId } from "../random-id";

// One unused puzzle per level, in memory only. Never reuse a consumed puzzle.
const prepared = new Map<Level, Promise<GameState>>();
export const GENERATION_TIMEOUT_MS = 20_000;

function generateAsync(level: Level): Promise<GameState> {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const id = randomId();
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined;
    let done = false;
    const finish = (game?: GameState) => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      worker?.terminate();
      if (game && game.id === id && game.level === level) resolve(game);
      else reject(new Error("Puzzle generation unavailable"));
    };
    const deadline = setTimeout(() => finish(), GENERATION_TIMEOUT_MS);
    try {
      worker = new Worker(new URL("./generation.worker.ts", import.meta.url), { type: "module" });
    } catch { finish(); return; }
    worker.onmessage = (event: MessageEvent<{ game?: GameState; error?: boolean }>) => {
      finish(event.data.game);
    };
    worker.onerror = () => finish();
    worker.onmessageerror = () => finish();
    try { worker.postMessage({ level, seed, id }); } catch { finish(); }
  });
}

export function prepareGame(level: Level): void {
  if (prepared.has(level)) return;
  const pending = generateAsync(level);
  prepared.set(level, pending);
  void pending.catch(() => { if (prepared.get(level) === pending) prepared.delete(level); });
}

export async function createGame(level: Level): Promise<GameState> {
  const pending = prepared.get(level);
  prepared.delete(level);
  const game = await (pending ?? generateAsync(level));
  const now = Date.now();
  return { ...game, startedAt: now, updatedAt: now };
}