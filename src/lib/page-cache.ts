// Yatzy-style "show saved copy first, refresh in background" cache for list pages.
const NS = "mrb-sudoku:v1:cache:";

export function readPageCache<T>(name: string): T | null {
  try {
    const raw = localStorage.getItem(NS + name);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function writePageCache(name: string, value: unknown): void {
  try { localStorage.setItem(NS + name, JSON.stringify(value)); } catch { /* full or blocked storage: cache is optional */ }
}

