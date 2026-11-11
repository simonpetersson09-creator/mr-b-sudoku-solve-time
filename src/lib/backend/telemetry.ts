import { randomId } from "@/lib/random-id";
const DEVICE_KEY = "mrb-sudoku:v1:device-id";
/** Numbers forgotten after a confirmed server deletion; never adopted again from Keychain/Keystore. */
export const RETIRED_DEVICE_KEY = "mrb-sudoku:v1:device-id-retired";
let cached: string | null = null;
const retiredMemory = new Set<string>();

function retired(): Set<string> {
  const out = new Set(retiredMemory);
  try { for (const id of JSON.parse(localStorage.getItem(RETIRED_DEVICE_KEY) ?? "[]")) if (typeof id === "string") out.add(id); } catch { /* memory copy */ }
  return out;
}
function retire(id: string) {
  retiredMemory.add(id);
  try { localStorage.setItem(RETIRED_DEVICE_KEY, JSON.stringify([...retired()].slice(-10))); } catch { /* memory copy */ }
}

/**
 * Random app-only number for this phone (never a hardware ID). Kept in memory, mirrored to
 * local storage and, in the app, to Keychain/Keystore so cleared web storage does not look like a new phone.
 */
export function deviceId(): string {
  if (cached) return cached;
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (id && retired().has(id)) id = null;
    if (!id) { id = randomId(); localStorage.setItem(DEVICE_KEY, id); }
    cached = id;
  } catch { cached = randomId(); }
  return cached;
}

/** Native only: adopt the durable copy if one exists, otherwise store the current number durably. */
export async function initDeviceId(): Promise<string> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return deviceId();
    const { SecureStoragePlugin } = await import("capacitor-secure-storage-plugin");
    const { value: keys } = await SecureStoragePlugin.keys();
    if (keys.includes(DEVICE_KEY)) {
      const { value } = await SecureStoragePlugin.get({ key: DEVICE_KEY });
      if (value && !retired().has(value)) {
        cached = value;
        try { localStorage.setItem(DEVICE_KEY, value); } catch { /* memory copy is enough */ }
        return value;
      }
    }
    await SecureStoragePlugin.set({ key: DEVICE_KEY, value: deviceId() });
  } catch { /* fall back to the local copy */ }
  return deviceId();
}

/** After a confirmed server deletion: forget this phone's number in memory, web storage and Keychain/Keystore. */
export async function forgetDeviceId(): Promise<void> {
  let old = cached;
  try { old ??= localStorage.getItem(DEVICE_KEY); } catch { /* none */ }
  if (old) retire(old);
  cached = null;
  try { localStorage.removeItem(DEVICE_KEY); } catch { /* nothing stored */ }
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { SecureStoragePlugin } = await import("capacitor-secure-storage-plugin");
    try {
      const { value } = await SecureStoragePlugin.get({ key: DEVICE_KEY });
      if (value) retire(value);
    } catch { /* not stored */ }
    try { await SecureStoragePlugin.remove({ key: DEVICE_KEY }); }
    catch {
      // Removal failed: overwrite with a fresh number so the deleted one cannot come back.
      try { await SecureStoragePlugin.set({ key: DEVICE_KEY, value: deviceId() }); } catch { /* retired list still blocks it */ }
    }
  } catch { /* retired list blocks the old number on next launch */ }
}

/** "ios"/"android" only inside a native app shell; browsers count as "web". */
export function platform(): "ios" | "android" | "web" {
  const w = window as unknown as { Capacitor?: { getPlatform?: () => string } };
  const p = w.Capacitor?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
}
