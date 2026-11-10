import type { Level } from "./engine";
import type { TranslationKey } from "@/lib/i18n";

/** m:ss, or h:mm:ss from one hour. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const LEVEL_KEY: Record<Level, TranslationKey> = { easy: "levelEasy", medium: "levelMedium", hard: "levelHard", expert: "levelExpert", ultra: "levelUltra", impossible: "levelImpossible" };
