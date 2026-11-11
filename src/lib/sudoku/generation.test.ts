import { afterEach, describe, expect, it, vi } from "vitest";
import { countSolutions, newGame } from "./engine";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

describe("background generation", () => {
  it("consumes each prepared puzzle once and starts the timer only on delivery", async () => {
    const workers: FakeWorker[] = [];
    class FakeWorker {
      onmessage?: (event: { data: unknown }) => void;
      onerror?: () => void;
      terminate = vi.fn();
      constructor() { workers.push(this); }
      postMessage({ level, seed, id }: Parameters<typeof request>[0]) {
        queueMicrotask(() => this.onmessage?.({ data: { game: newGame(level, seed, id, 1000) } }));
      }
    }
    function request(_data: { level: "easy"; seed: number; id: string }) {}
    vi.stubGlobal("Worker", FakeWorker);
    const { createGame, prepareGame } = await import("./generation");
    prepareGame("easy");
    prepareGame("easy");
    expect(workers).toHaveLength(1);
    const first = await createGame("easy");
    const second = await createGame("easy");
    expect(workers).toHaveLength(2);
    expect(first.id).not.toBe(second.id);
    expect(first.startedAt).toBeGreaterThan(1000);
    expect(first.elapsedMs).toBe(0);
    expect(countSolutions(first.puzzle, 2)).toBe(1);
    expect(workers.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
  });

  it("can start a uniquely solvable local game when a worker is unavailable", async () => {
    vi.stubGlobal("Worker", class { constructor() { throw new Error("unavailable"); } });
    const { createGame } = await import("./generation");
    const game = await createGame("easy");
    expect(game.level).toBe("easy");
    expect(countSolutions(game.puzzle, 2)).toBe(1);
  });
});