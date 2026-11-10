import { describe, expect, it } from "vitest";
import { solvableBySingles, LEVELS, GIVENS, countSolutions, generate, newGame, setValue, toggleNote, erase, undo, hint, isWrong, hasNote, isConsistent, solve, PEERS } from "./engine";

describe("puzzle generation", () => {
  for (const level of LEVELS) {
    it(`${level}: exactly one solution, valid and matching`, () => {
      for (const seed of [1, 2, 3]) {
        const p = generate(level, seed);
        expect(countSolutions(p.puzzle, 3)).toBe(1);
        expect(isConsistent(p.solution)).toBe(true);
        expect(p.solution.every((v) => v >= 1 && v <= 9)).toBe(true);
        expect(solve(p.puzzle)).toEqual(p.solution);
        p.puzzle.forEach((v, i) => { if (v) expect(v).toBe(p.solution[i]); });
        expect(p.puzzle.filter(Boolean).length).toBeLessThanOrEqual(GIVENS[level] + 4);
      }
    }, 30000);
  }
  it("easy and medium need only singles; hard and expert need more", () => {
    for (const seed of [11, 12]) {
      expect(solvableBySingles(generate("easy", seed).puzzle)).toBe(true);
      expect(solvableBySingles(generate("medium", seed).puzzle)).toBe(true);
      expect(solvableBySingles(generate("hard", seed).puzzle)).toBe(false);
      expect(solvableBySingles(generate("expert", seed).puzzle)).toBe(false);
    }
  }, 60000);
  it("same seed gives the same puzzle", () => {
    expect(generate("medium", 42).puzzle).toEqual(generate("medium", 42).puzzle);
  });
  it("harder levels have fewer givens", () => {
    expect(generate("easy", 7).puzzle.filter(Boolean).length).toBeGreaterThan(generate("expert", 7).puzzle.filter(Boolean).length);
  }, 30000);
});

describe("play", () => {
  const g = newGame("easy", 5, "t");
  const open = g.puzzle.findIndex((v) => v === 0);
  const right = g.solution[open];
  const wrong = right === 9 ? 1 : right + 1;

  it("marks a wrong digit and counts a mistake", () => {
    const s = setValue(g, open, wrong);
    expect(isWrong(s, open)).toBe(true);
    expect(s.mistakes).toBe(1);
    expect(isWrong(setValue(g, open, right), open)).toBe(false);
  });
  it("given cells cannot change", () => {
    const given = g.puzzle.findIndex((v) => v !== 0);
    expect(setValue(g, given, 1)).toBe(g);
    expect(erase(g, given)).toBe(g);
  });
  it("notes toggle and are cleared from peers when a digit is placed", () => {
    let s = toggleNote(g, open, 3);
    expect(hasNote(s.notes[open], 3)).toBe(true);
    s = toggleNote(s, open, 3);
    expect(hasNote(s.notes[open], 3)).toBe(false);
    const peer = PEERS[open].find((p) => g.puzzle[p] === 0)!;
    s = toggleNote(g, peer, right);
    s = setValue(s, open, right);
    expect(hasNote(s.notes[peer], right)).toBe(false);
    s = undo(s);
    expect(s.values[open]).toBe(0);
    expect(hasNote(s.notes[peer], right)).toBe(true);
  });
  it("keeps peers' notes when automatic note removal is off", () => {
    const peer = PEERS[open].find((p) => g.puzzle[p] === 0)!;
    const s = setValue(toggleNote(g, peer, right), open, right, false);
    expect(hasNote(s.notes[peer], right)).toBe(true);
  });
  it("erase clears the cell and undo restores it", () => {
    let s = setValue(g, open, wrong);
    s = erase(s, open);
    expect(s.values[open]).toBe(0);
    s = undo(s);
    expect(s.values[open]).toBe(wrong);
  });
  it("hint fills the selected cell with the right digit", () => {
    const { state, cell } = hint(setValue(g, open, wrong), open);
    expect(cell).toBe(open);
    expect(state.values[open]).toBe(right);
    expect(state.hints).toBe(1);
  });
  it("finishes when every cell is correct", () => {
    let s = g;
    g.puzzle.forEach((v, i) => { if (!v) s = setValue(s, i, g.solution[i]); });
    expect(s.finished).toBe(true);
    expect(setValue(s, open, wrong)).toBe(s);
  });
});
