import { deletePlayerData as deleteOnServer } from "@/lib/backend/online.functions";
import { supabase } from "@/lib/auth/client";
import { forgetDeviceId } from "@/lib/backend/telemetry";

const NS = "mrb-sudoku:v1:";
const KEEP = new Set([NS + "language"]);

/** Sudoku's own player keys; the chosen language is a device preference and stays. */
export const isPlayerStorageKey = (key: string) => key.startsWith(NS) && !KEEP.has(key);

/** Erase the player on the server first, then everything this device keeps about them. */
export async function deletePlayerData(): Promise<void> {
  await deleteOnServer({ data: {} });
  try { await supabase.auth.signOut({ scope: "local" }); } catch { /* the identity is already gone server-side */ }
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) if (isPlayerStorageKey(key)) storage.removeItem(key);
  }
  await forgetDeviceId(); // only reached after the server confirmed deletion

}
