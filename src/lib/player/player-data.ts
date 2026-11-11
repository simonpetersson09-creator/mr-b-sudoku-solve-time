import { deletePlayerData as deleteOnServer } from "@/lib/backend/online.functions";
import { supabase } from "@/lib/auth/client";
import { forgetDeviceId, RETIRED_DEVICE_KEY } from "@/lib/backend/telemetry";

const NS = "mrb-sudoku:v1:";
const KEEP = new Set([NS + "language", RETIRED_DEVICE_KEY]);

/** Sudoku's own player keys; the chosen language is a device preference and stays. */
export const isPlayerStorageKey = (key: string) => key.startsWith(NS) && !KEEP.has(key);

/** Erase the player on the server first, then everything this device keeps about them. */
export async function deletePlayerData(): Promise<void> {
  await deleteOnServer({ data: {} }); // throws before any local step unless the server confirmed
  // Each local step is independent: one failing storage operation never stops the rest.
  try { await supabase.auth.signOut({ scope: "local" }); } catch { /* the identity is already gone server-side */ }
  for (const get of [() => localStorage, () => sessionStorage]) {
    let keys: string[] = [];
    try { keys = Object.keys(get()); } catch { continue; }
    for (const key of keys) if (isPlayerStorageKey(key)) { try { get().removeItem(key); } catch { /* continue with next key */ } }
  }
  try { await forgetDeviceId(); } catch { /* best effort; retired list blocks reuse */ }
}
