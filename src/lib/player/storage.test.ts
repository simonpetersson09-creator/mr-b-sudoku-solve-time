// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { newGame, setValue } from "@/lib/sudoku/engine";
import { MAX_SAVED_GAMES, addResult, cleanStats, emptyStats, stockholmYear, listGames, loadAllTime, loadGame, loadStats, recordFinish, removeGame, saveGame, selectGame, startNewGame, loadSettings, saveSettings } from "./storage";

const solved = (seed: number) => {
  let g = newGame("easy", seed, "s" + seed);
  g.puzzle.forEach((v, i) => { if (!v) g = setValue(g, i, g.solution[i]); });
  return { ...g, elapsedMs: 120_000 };
};

describe("fixed game assistance", () => {
  beforeEach(() => localStorage.clear());
  it.each(["showMistakes", "highlightSame", "autoRemoveNotes"] as const)("%s stays enabled even for a legacy saved choice", key => {
    localStorage.setItem("mrb-sudoku:v1:settings", JSON.stringify({ [key]: false, darkBoard: true, haptics: false }));
    expect(loadSettings()[key]).toBe(true);
    saveSettings({ ...loadSettings(), [key]: false });
    expect(loadSettings()[key]).toBe(true);
    expect(loadSettings().darkBoard).toBe(true);
    expect(loadSettings().haptics).toBe(false);
  });
});

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
  it("perfect counts solved games with no hint and no mistake", () => {
    let s = addResult(emptyStats(), solved(31));
    s = addResult(s, { ...solved(32), hints: 1 });
    s = addResult(s, { ...solved(33), mistakes: 1 });
    expect(s.easy.played).toBe(3);
    expect(s.easy.wins).toBe(2);
    expect(s.easy.perfect).toBe(1);
  });
  it("the same game is recorded once", () => {
    const g = solved(8);
    recordFinish(g); recordFinish(g);
    expect(loadStats().easy.played).toBe(1);
  });
  it("all-time stats count every finished game and survive a year change", () => {
    recordFinish(solved(9));
    recordFinish(solved(10));
    expect(loadAllTime().easy.played).toBe(2);
    expect(loadAllTime().easy.wins).toBe(2);
    // A year change only resets the yearly stats, never the all-time ones.
    const yearly = cleanStats(loadStats(), stockholmYear() + 1);
    expect(yearly.easy.played).toBe(0);
    expect(loadAllTime().easy.played).toBe(2);
  });
});

describe("yearly stats", () => {
  it("keeps 2026 stats during 2026", () => {
    const s = { ...emptyStats(2026), easy: { played: 4, wins: 3, bestMs: 1000, totalMs: 9000 } };
    expect(cleanStats(s, 2026).easy.played).toBe(4);
  });
  it("starts over when the year changes to 2027", () => {
    const s = { ...emptyStats(2026), easy: { played: 4, wins: 3, bestMs: 1000, totalMs: 9000 }, lifetimePlayed: 4 };
    const n = cleanStats(s, 2027);
    expect(n.easy.played).toBe(0);
    expect(n.easy.bestMs).toBeNull();
    expect(n.year).toBe(2027);
  });
  it("uses Swedish time for the year boundary", () => {
    expect(stockholmYear(new Date("2026-12-31T23:30:00Z"))).toBe(2027);
    expect(stockholmYear(new Date("2026-12-31T22:30:00Z"))).toBe(2026);
  });
});

describe("lost games", () => {
  it("a game lost on 3 mistakes disappears from the ongoing games", () => {
    const g = newGame("easy", 21, "lost-1");
    saveGame(g);
    expect(listGames().some((e) => e.id === "lost-1")).toBe(true);
    saveGame({ ...g, mistakes: 3 });
    expect(listGames().some((e) => e.id === "lost-1")).toBe(false);
  });
});
