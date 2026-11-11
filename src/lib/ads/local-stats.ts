/** Sudoku waits for one finished local game before a startup ad. */
import { loadStats } from "@/lib/player/storage";

export function getRankedGames(): number {
  try { return loadStats().lifetimePlayed ?? 0; } catch { return 0; }
}
