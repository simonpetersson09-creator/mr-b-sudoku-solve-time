import type { getMe } from "./online.functions";
type Me = Awaited<ReturnType<typeof getMe>>;
const PROFILE_KEY = "mrb-sudoku:v1:profile-snapshot";

/** Display cache only. Never use this to authorize or assign roles. */
export function saveProfileSnapshot(me: Me) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...me, isAdmin: false })); } catch { /* optional display cache */ }
}
export function loadProfileSnapshot(): Me | null {
  try { const raw = localStorage.getItem(PROFILE_KEY); return raw ? { ...JSON.parse(raw), isAdmin: false } : null; } catch { return null; }
}
