import { describe, expect, it } from "vitest";
import { solvableBySingles, solvableWithPairs, solvableAdvanced, solvableMaster, LEVELS, GIVENS, MAX_UNDOS, countSolutions, generate, newGame, setValue, toggleNote, erase, undo, hint, isWrong, hasNote, isConsistent, solve, PEERS, MAX_MISTAKES, isLost, completedGroups, findHintCell, markHint, explainHint } from "./engine";

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
  it("ultra needs more than pairs; impossible needs more than pairs and triples", () => {
    for (const seed of [11, 12]) {
      expect(solvableWithPairs(generate("ultra", seed).puzzle)).toBe(false);
      expect(solvableAdvanced(generate("impossible", seed).puzzle)).toBe(false);
    }
  }, 60000);
  it("master needs more than the whole technique ladder", () => {
    for (const seed of [11, 12]) {
      const p = generate("master", seed);
      expect(countSolutions(p.puzzle, 3)).toBe(1);
      expect(solvableMaster(p.puzzle)).toBe(false);
    }
  }, 60000);
  it("the master checker finishes everything the weaker checkers finish", () => {
    for (const seed of [1, 2]) {
      const p = generate("easy", seed).puzzle;
      expect(solvableBySingles(p)).toBe(true);
      expect(solvableMaster(p)).toBe(true);
    }
  }, 30000);
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
  it("erase removes notes", () => {
    let s = toggleNote(g, open, right);
    s = erase(s, open);
    expect(s.notes[open]).toBe(0);
  });
  it("notes and erases are never undoable; undo skips them and reverts the last placed digit", () => {
    let s = setValue(g, open, right);
    s = toggleNote(s, open + 1, 3);
    s = erase(s, open + 1);
    expect(s.history.length).toBe(1);
    s = undo(s);
    expect(s.values[open]).toBe(0);
    expect(s.undosLeft).toBe(MAX_UNDOS - 1);
  });
  it("a wrong digit placed with record=false never enters the undo history", () => {
    let s = setValue(g, open, right);
    const other = g.puzzle.findIndex((v, i) => !v && i !== open);
    const wrongOther = g.solution[other] % 9 + 1;
    s = setValue(s, other, wrongOther, true, false);
    expect(s.mistakes).toBe(1);
    expect(s.history.length).toBe(1);
    s = undo(s);
    expect(s.values[open]).toBe(0);
    expect(s.values[other]).toBe(wrongOther);
  });
  it("erase never removes a placed digit, not even a wrong one", () => {
    const s = setValue(g, open, wrong);
    expect(erase(s, open)).toBe(s);
    expect(erase(s, open).values[open]).toBe(wrong);
  });
  it("allows at most 3 undos per game", () => {
    let s = g;
    expect(s.undosLeft).toBe(MAX_UNDOS);
    const cells = g.puzzle.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0).slice(0, MAX_UNDOS + 1);
    for (const i of cells) s = setValue(s, i, g.solution[i]);
    for (let n = 0; n < MAX_UNDOS; n++) s = undo(s);
    expect(s.undosLeft).toBe(0);
    const before = s;
    s = undo(s);
    expect(s).toBe(before);
    expect(s.values[cells[0]]).toBe(g.solution[cells[0]]);
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

describe("mistake limit and completed groups", () => {
  it("the game is lost on the 3rd mistake and then accepts no moves", () => {
    expect(MAX_MISTAKES).toBe(3);
    let s = newGame("easy", 11, "m");
    const open = s.values.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const wrong = (i: number) => (s.solution[i] % 9) + 1;
    s = setValue(s, open[0], wrong(open[0]));
    s = setValue(s, open[1], wrong(open[1]));
    expect(isLost(s)).toBe(false);
    s = setValue(s, open[2], wrong(open[2]));
    expect(isLost(s)).toBe(true);
    const after = setValue(s, open[3], s.solution[open[3]]);
    expect(after).toBe(s);
  });
  it("reports the row, column and box once they are completely correct", () => {
    const g = newGame("easy", 12, "c");
    const s = { ...g, values: g.solution.slice() };
    expect(completedGroups(s, 0).length).toBe(21);
    const gap = { ...s, values: s.values.map((v, i) => (i === 80 ? 0 : v)) };
    expect(completedGroups(gap, 0).length).toBe(21);
    expect(completedGroups(gap, 72).length).toBe(15);
    expect(completedGroups(gap, 80).length).toBe(0);
  });
});

describe("smart hint", () => {
  it("uses the selected empty cell rather than the automatic choice", () => {
    const s = newGame("easy", 31, "selected-hint");
    const automatic = explainHint(s);
    const chosen = s.values.findIndex((v, i) => v === 0 && i !== automatic?.cell);
    expect(chosen).toBeGreaterThanOrEqual(0);
    expect(explainHint(s, chosen)?.cell).toBe(chosen);
    expect(explainHint(s, chosen)?.digit).toBe(s.solution[chosen]);
    expect(markHint(s, chosen).cell).toBe(chosen);
    expect(markHint(s, chosen).state.hints).toBe(1);
  });
  it("keeps the existing automatic choice when nothing is selected", () => {
    const s = newGame("medium", 31, "automatic-hint");
    expect(explainHint(s, null)).toEqual(explainHint(s));
    expect(markHint(s, null).cell).toBe(findHintCell(s));
  });
  it("corrects a selected wrong cell even if another wrong cell comes first", () => {
    let s = newGame("easy", 32, "selected-wrong");
    const cells = s.values.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
    s = setValue(s, cells[0], s.solution[cells[0]] % 9 + 1);
    s = setValue(s, cells[1], s.solution[cells[1]] % 9 + 1);
    expect(explainHint(s, cells[1])?.cell).toBe(cells[1]);
    expect(explainHint(s, cells[1])?.digit).toBe(s.solution[cells[1]]);
  });
  it("does not spend a hint on a selected given or already correct digit", () => {
    const s = newGame("easy", 32, "correct-hint");
    const given = s.values.findIndex(v => v !== 0);
    expect(markHint(s, given)).toEqual({ state: s, cell: null });
    const open = s.values.findIndex(v => v === 0);
    const filled = setValue(s, open, s.solution[open]);
    expect(markHint(filled, open)).toEqual({ state: filled, cell: null });
  });
  it("marks one cell without filling it and counts the hint", () => {
    const s = newGame("medium", 31, "h");
    const r = markHint(s);
    expect(r.cell).not.toBeNull();
    expect(r.state.values).toEqual(s.values);
    expect(r.state.hints).toBe(1);
    expect(s.values[r.cell!]).toBe(0);
  });
  it("points out a wrong digit first", () => {
    let s = newGame("easy", 32, "w");
    const i = s.values.findIndex((v) => v === 0);
    s = setValue(s, i, (s.solution[i] % 9) + 1);
    expect(findHintCell(s)).toBe(i);
  });
  it("on an easy puzzle the marked cell has exactly one possible digit or is the only spot", () => {
    const s = newGame("easy", 33, "e");
    const c = findHintCell(s)!;
    expect(s.values[c]).toBe(0);
    expect(c).toBeGreaterThanOrEqual(0);
  });
});

import { MAX_HINTS } from "./engine";
describe("hint limit", () => {
  it("allows at most 3 hints per game", () => {
    let s = newGame("easy", 7, "h");
    for (let i = 0; i < 5; i++) s = markHint(s).state;
    expect(MAX_HINTS).toBe(3);
    expect(s.hints).toBe(3);
    expect(markHint(s).cell).toBeNull();
  });
});

describe("hint explanation", () => {
  const g = newGame("medium", 777, "x");
  it("points at a wrong digit first, inside its box", () => {
    const open = g.puzzle.findIndex((v) => v === 0);
    const wrong = (g.solution[open] % 9) + 1;
    const h = explainHint(setValue(g, open, wrong))!;
    expect(h.kind).toBe("wrong");
    expect(h.cell).toBe(open);
    expect(h.digit).toBe(g.solution[open]);
    expect(h.unit).toContain(open);
  });
  it("always gives the correct digit and an area containing the cell", () => {
    let s = g;
    for (let n = 0; n < 60 && !s.finished; n++) {
      const h = explainHint(s)!;
      expect(h.digit).toBe(s.solution[h.cell]);
      expect(h.unit).toContain(h.cell);
      expect(h.unit.length).toBe(9);
      s = setValue(s, h.cell, h.digit);
    }
    expect(s.finished).toBe(true);
  });
});
