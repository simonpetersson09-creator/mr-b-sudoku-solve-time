import { afterEach, describe, expect, it, vi } from "vitest";
import { countSolutions, newGame } from "./engine";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

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

  it("rejects unavailable workers instead of blocking the main thread", async () => {
    vi.stubGlobal("Worker", class { constructor() { throw new Error("unavailable"); } });
    const { createGame } = await import("./generation");
    await expect(createGame("easy")).rejects.toThrow("Puzzle generation unavailable");
  });
  it("terminates a hung worker at the deadline and allows a fresh attempt", async () => {
    vi.useFakeTimers();
    const workers: { terminate: ReturnType<typeof vi.fn>; onmessage?: (e: { data: unknown }) => void }[] = [];
    vi.stubGlobal("Worker", class {
      terminate = vi.fn(); onmessage?: (e: { data: unknown }) => void;
      constructor() { workers.push(this); } postMessage() {}
    });
    const { createGame, GENERATION_TIMEOUT_MS } = await import("./generation");
    const pending = expect(createGame("master")).rejects.toThrow("Puzzle generation unavailable");
    await vi.advanceTimersByTimeAsync(GENERATION_TIMEOUT_MS);
    await pending;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    const second = expect(createGame("master")).rejects.toThrow();
    expect(workers).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(GENERATION_TIMEOUT_MS); await second;
  });
  it("cleans up a worker when posting the request throws", async () => {
    const terminate = vi.fn();
    vi.stubGlobal("Worker", class { terminate = terminate; postMessage() { throw new Error("closed"); } });
    const { createGame } = await import("./generation");
    await expect(createGame("easy")).rejects.toThrow();
    expect(terminate).toHaveBeenCalledOnce();
  });
});