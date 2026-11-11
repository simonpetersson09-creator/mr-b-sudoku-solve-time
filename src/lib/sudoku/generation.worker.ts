import { newGame, type Level } from "./engine";

self.onmessage = (event: MessageEvent<{ level: Level; seed: number; id: string }>) => {
  const { level, seed, id } = event.data;
  try {
    self.postMessage({ game: newGame(level, seed, id) });
  } catch {
    self.postMessage({ error: true });
  }
};