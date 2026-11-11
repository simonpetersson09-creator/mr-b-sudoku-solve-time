import { expect, it } from "vitest";
import { allowedNativeOrigin, PUBLISHED_SUDOKU_ORIGIN, validateSudokuOrigin } from "./origin";
it("defaults to this Sudoku project's own deployment", () => {
  expect(PUBLISHED_SUDOKU_ORIGIN).toBe("https://mr-b-sudoku-solve-time.lovable.app");
});
it("only accepts a separate stable HTTPS Sudoku service", () => {
  expect(validateSudokuOrigin("https://sudoku.example.org/")).toBe("https://sudoku.example.org");
  for (const value of ["https://ludo.example.org", "http://sudoku.example.org", "https://yatzy.example.org", "https://id-preview--example.lovable.app", "https://user:pass@sudoku.example.org", "https://sudoku.example.org/path"]) expect(() => validateSudokuOrigin(value)).toThrow();
});
it("restricts native browser origins; bearer verification is still required", () => {
  expect(allowedNativeOrigin("capacitor://localhost")).toBe(true);
  expect(allowedNativeOrigin("https://localhost")).toBe(true);
  expect(allowedNativeOrigin("https://attacker.example")).toBe(false);
  expect(allowedNativeOrigin(null)).toBe(false);
});