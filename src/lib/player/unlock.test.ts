import { describe, expect, it } from "vitest";
import { emptyProgress, highestUnlocked, isUnlocked, newlyUnlocked, remainingFor } from "./unlock";

describe("level unlocks", () => {
  it("only Easy is open at start", () => {
    const p = emptyProgress();
    expect(isUnlocked(p, "easy")).toBe(true);
    expect(isUnlocked(p, "medium")).toBe(false);
    expect(highestUnlocked(p)).toBe("easy");
  });
  it("Medium opens after 3 solved Easy", () => {
    expect(isUnlocked({ ...emptyProgress(), easy: 2 }, "medium")).toBe(false);
    expect(isUnlocked({ ...emptyProgress(), easy: 3 }, "medium")).toBe(true);
  });
  it("Hard needs 3 Medium, Expert 5 Hard", () => {
    const p = { ...emptyProgress(), easy: 3, medium: 3, hard: 4 };
    expect(isUnlocked(p, "hard")).toBe(true);
    expect(isUnlocked(p, "expert")).toBe(false);
    expect(remainingFor(p, "expert")).toBe(1);
  });
  it("World Champion needs 10 Impossible and the whole chain", () => {
    const chain = { easy: 3, medium: 3, hard: 5, expert: 5, ultra: 5, impossible: 9, master: 0 };
    expect(isUnlocked(chain, "master")).toBe(false);
    expect(isUnlocked({ ...chain, impossible: 10 }, "master")).toBe(true);
    expect(isUnlocked({ ...chain, impossible: 10, easy: 0 }, "master")).toBe(false);
  });
  it("reports a newly opened level once", () => {
    const b = { ...emptyProgress(), easy: 2 };
    expect(newlyUnlocked(b, { ...b, easy: 3 })).toEqual(["medium"]);
    expect(newlyUnlocked({ ...b, easy: 3 }, { ...b, easy: 4 })).toEqual([]);
  });
});
