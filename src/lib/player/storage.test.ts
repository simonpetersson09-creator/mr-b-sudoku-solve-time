// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { newGame, setValue } from "@/lib/sudoku/engine";
import { MAX_SAVED_GAMES, addResult, emptyStats, listGames, loadGame, loadStats, recordFinish, removeGame, saveGame, selectGame, startNewGame } from "./storage";

const solved = (seed: number) => {
  let g = newGame("easy", seed, "s" + seed);
  g.puzzle.forEach((v, i) => { if (!v) g = setValue(g, i, g.solution[i]); });
  return { ...g, elapsedMs: 120_000 };
};

describe("saved games", () => {
  beforeEach(() => localStorage.clear());
  it("keeps at most 10, dropping the oldest", () => {
    for (let i = 0; i < 12; i++) startNewGame(newGame("easy", i, "g" + i), 1000 + i);
    const ids = listGames().map((e) => e.id);
    expect(ids).toHaveLength(MAX_SAVED_GAMES);
    expect(ids).not.toContain("g0");
    expect(ids).not.toContain("g1");
    expect(ids[0]).toBe("g11");
  });
  it("starting a new game keeps the earlier one and switching works", () => {
    startNewGame(newGame("easy", 1, "a"));
    startNewGame(newGame("hard", 2, "b"));
    expect(loadGame()?.id).toBe("b");
    selectGame("a");
    expect(loadGame()?.id).toBe("a");
    removeGame("a");
    expect(listGames().map((e) => e.id)).toEqual(["b"]);
  });
  it("a finished game is removed from the saved list", () => {
    startNewGame(newGame("easy", 3, "s3"));
    saveGame(solved(3));
    expect(listGames()).toHaveLength(0);
  });
});

describe("statistics per level", () => {
  beforeEach(() => localStorage.clear());
  it("played counts finished games only", () => {
    const unfinished = newGame("easy", 4, "u");
    expect(addResult(emptyStats(), unfinished).easy.played).toBe(0);
    const s = addResult(emptyStats(), solved(4));
    expect(s.easy.played).toBe(1);
    expect(s.medium.played).toBe(0);
  });
  it("best time and wins; a hinted game counts as played but not as a win", () => {
    let s = addResult(emptyStats(), solved(5));
    s = addResult(s, { ...solved(6), elapsedMs: 90_000 });
    s = addResult(s, { ...solved(7), elapsedMs: 30_000, hints: 1 });
    expect(s.easy.played).toBe(3);
    expect(s.easy.wins).toBe(2);
    expect(s.easy.bestMs).toBe(90_000);
  });
  it("the same game is recorded once", () => {
    const g = solved(8);
    recordFinish(g); recordFinish(g);
    expect(loadStats().easy.played).toBe(1);
  });
});
