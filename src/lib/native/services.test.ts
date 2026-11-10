import { expect, it } from "vitest";
import { nativeServices } from "./services";
it("Sudoku has no push notifications", () => {
  expect(nativeServices.push.enabled).toBe(false);
  expect(nativeServices.push.platforms).toEqual([]);
});
