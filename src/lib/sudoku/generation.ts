import { newGame, type GameState, type Level } from "./engine";
import { randomId } from "../random-id";

// One unused puzzle per level, in memory only. Never reuse a consumed puzzle.
const prepared = new Map<Level, Promise<GameState>>();

function generateAsync(level: Level): Promise<GameState> {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const id = randomId();
  return new Promise((resolve, reject) => {
    let worker: Worker;
    const fallback = () => setTimeout(() => {
      try { resolve(newGame(level, seed, id)); } catch (error) { reject(error); }
    }, 0);
    try {
      worker = new Worker(new URL("./generation.worker.ts", import.meta.url), { type: "module" });
    } catch { fallback(); return; }
    worker.onmessage = (event: MessageEvent<{ game?: GameState; error?: boolean }>) => {
      worker.terminate();
      if (event.data.game) resolve(event.data.game);
      else fallback();
    };
    worker.onerror = () => { worker.terminate(); fallback(); };
    worker.postMessage({ level, seed, id });
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