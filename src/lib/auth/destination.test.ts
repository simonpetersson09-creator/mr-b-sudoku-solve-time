import { expect, it } from "vitest";
import { safeAuthDestination } from "./destination";
it("returns home for missing, removed or foreign auth destinations", () => {
  for (const value of [undefined, "/online", "//attacker.example", "/\\attacker.example", "https://attacker.example", "/missing"]) expect(safeAuthDestination(value)).toBe("/");
});
it("preserves existing private and public page destinations", () => {
  for (const value of ["/profile", "/admin", "/settings", "/stats"]) expect(safeAuthDestination(value)).toBe(value);
});