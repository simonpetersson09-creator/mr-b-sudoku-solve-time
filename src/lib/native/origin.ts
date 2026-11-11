/** The packaged game works offline; only online actions need this Sudoku-only origin. */
export function validateSudokuOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || /localhost|id-preview|yatzy|ludo/i.test(url.hostname)) {
    throw new Error("Use the approved published Mr.B. Sudoku HTTPS origin");
  }
  return url.origin;
}

/** Sudoku's pending published server; the app talks to it directly. */
export const PUBLISHED_SUDOKU_ORIGIN = "https://mrbsudoku.lovable.app";

export function nativeOnlineOrigin(): string {
  const value = import.meta.env['VITE_MRB_SUDOKU_ORIGIN'] || PUBLISHED_SUDOKU_ORIGIN;
  return validateSudokuOrigin(value);
}

export function allowedNativeOrigin(origin: string | null): boolean {
  return origin === "capacitor://localhost" || origin === "https://localhost" || origin === "http://localhost";
}