import { describe, expect, it } from "vitest";
import { backAction } from "./back-policy";

describe("android back button", () => {
  it("minimizes on the home screen instead of closing", () => expect(backAction("/", true)).toBe("minimize"));
  it("goes home from a game (it is saved)", () => expect(backAction("/play", true)).toBe("home"));
  it("goes back from ordinary pages", () => expect(backAction("/settings", true)).toBe("back"));
  it("goes home when there is no history", () => expect(backAction("/stats", false)).toBe("home"));
});
