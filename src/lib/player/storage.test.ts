// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { newGame, setValue, toggleNote, undo } from "@/lib/sudoku/engine";
import { isUnlocked, emptyProgress } from './unlock';
import { MAX_SAVED_GAMES, addResult, cleanStats, emptyStats, stockholmYear, listGames, loadAllTime, loadGame, loadStats, loadProgress, isValidSave, recordFinish, removeGame, saveGame, selectGame, startNewGame, loadSettings, saveSettings } from "./storage";

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
  it.each([null, {}, [null], [{ i: -1, value: 0, notes: 0 }], [{ i: 81, value: 0, notes: 0 }], [{ i: 0, value: 10, notes: 0 }], [{ i: 0, value: 0, notes: 512 }]])("rejects corrupt undo entry %j without exposing it to play", entry => {
    const g = newGame("easy", 13, "corrupt");
    const broken = { ...g, history: [entry] };
    expect(isValidSave(broken)).toBe(false);
    localStorage.setItem("mrb-sudoku:v1:games", JSON.stringify([{ id: g.id, game: broken, updatedAt: 1000 }]));
    selectGame(g.id);
    expect(loadGame()).toBeNull();
  });
  it("preserves valid notes, digits and undo history through reload", () => {
    let g = newGame("easy", 14, "valid");
    const i = g.values.findIndex(v => !v);
    g = toggleNote(g, i, 4);
    g = setValue(g, i, g.solution[i]);
    startNewGame(g);
    const restored = loadGame();
    expect(restored).toEqual(g);
    if (!restored) throw new Error("missing valid game");
    expect(undo(restored).values[i]).toBe(0);
    expect(undo(restored).notes[i]).toBe(8);
    expect(undo(restored).undosLeft).toBe(2);
  });
  it("normalizes only the missing legacy undo allowance", () => {
    const g = newGame("easy", 15, "legacy");
    const { undosLeft: _legacy, ...legacy } = g;
    localStorage.setItem("mrb-sudoku:v1:games", JSON.stringify([{ id: g.id, game: legacy, updatedAt: 1000 }]));
    selectGame(g.id);
    expect(loadGame()).toEqual({ ...legacy, undosLeft: 3 });
  });
  it.each(["notes", "solution", "puzzle", "mistakes", "hints", "elapsedMs", "startedAt", "updatedAt", "undosLeft"])("rejects invalid %s in a save", key => {
    const g = newGame("easy", 16, "invalid");
    const broken = { ...g, [key]: key === "notes" ? Array(81).fill(-1) : key === "solution" ? Array(81).fill(1) : key === "puzzle" ? Array(81).fill(9) : -1 };
    expect(isValidSave(broken)).toBe(false);
  });
  it("skips a corrupt save without losing a healthy saved game", () => {
    const good = newGame("easy", 17, "healthy");
    localStorage.setItem("mrb-sudoku:v1:games", JSON.stringify([{ id: "bad", game: { ...good, id: "bad", history: [null] }, updatedAt: 1000 }, { id: good.id, game: good, updatedAt: 1001 }]));
    selectGame(good.id);
    expect(listGames().map(s => s.id)).toEqual(["healthy"]);
    expect(loadGame()).toEqual(good);
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
  it('first-run progression counts once and Medium opens only after three different Easy finishes', () => {
    const g = solved(8);
    for (let n = 1; n <= 3; n++) {
      const result = { ...g, id: `first-${n}` };
      recordFinish(result); recordFinish(result);
      expect(loadProgress().easy).toBe(n);
      expect(loadStats().easy.played).toBe(n);
      expect(loadAllTime().easy.played).toBe(n);
      expect(isUnlocked(loadProgress(), 'medium')).toBe(n === 3);
    }
  });
  it('seeds missing progress from legacy stats before adding the new finish', () => {
    localStorage.setItem('mrb-sudoku:v1:stats', JSON.stringify({ ...emptyStats(), easy: { played: 2, wins: 2, perfect: 2, bestMs: 120000, totalMs: 240000 } }));
    recordFinish(solved(8));
    expect(loadProgress().easy).toBe(3);
    expect(loadAllTime().easy.played).toBe(3);
    expect(loadStats().easy.played).toBe(3);
  });
  it('preserves existing lifetime progress rather than rebuilding it from yearly stats', () => {
    localStorage.setItem('mrb-sudoku:v1:progress', JSON.stringify({ ...emptyProgress(), easy: 37, medium: 12 }));
    recordFinish(solved(8)); recordFinish(solved(8));
    expect(loadProgress()).toEqual({ ...emptyProgress(), easy: 38, medium: 12 });
  });
  it("never recounts the oldest game after more than 200 finished games, including after reload", () => {
    const g = solved(18);
    for (let i = 0; i < 250; i++) recordFinish({ ...g, id: `finished-${i}` });
    const before = { yearly: loadStats(), allTime: loadAllTime(), progress: loadProgress() };
    expect(before.yearly.easy.played).toBe(250);
    expect(before.allTime.easy.played).toBe(250);
    recordFinish({ ...g, id: "finished-0" });
    expect(loadStats()).toEqual(before.yearly);
    expect(loadAllTime()).toEqual(before.allTime);
    expect(loadProgress()).toEqual(before.progress);
    expect(JSON.parse(localStorage.getItem("mrb-sudoku:v1:counted") ?? "[]")).toHaveLength(250);
  });
  it("preserves IDs written by the older 200-ID format", () => {
    const g = solved(19);
    localStorage.setItem("mrb-sudoku:v1:counted", JSON.stringify(Array.from({ length: 200 }, (_, i) => `legacy-${i}`)));
    recordFinish({ ...g, id: "new-result" });
    recordFinish({ ...g, id: "legacy-0" });
    expect(loadStats().easy.played).toBe(1);
    expect(loadAllTime().easy.played).toBe(1);
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
