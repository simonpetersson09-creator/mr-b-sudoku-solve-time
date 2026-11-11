import { ensurePlayerSession } from "@/lib/auth/player";
import { nativeOnlineOrigin } from "./origin";
import type * as ServerFunctions from "@/lib/backend/online.functions";

type Functions = typeof ServerFunctions;
type Operation = keyof Functions;

/** Static-package transport only: authentication/authorization stay on the server.
 * No retries for mutations (especially PIN attempts and account deletion).
 * Type-only references keep server modules and privileged clients out of the app.
 */
async function request<K extends Operation>(operation: K, data?: unknown): Promise<Awaited<ReturnType<Functions[K]>>> {
  const origin = nativeOnlineOrigin();
  const session = await ensurePlayerSession();
  if (!session.access_token) throw new Error("err:forbidden");
  const response = await fetch(`${origin}/api/public/native`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ operation, ...(data === undefined ? {} : { data }) }),
    credentials: "omit",
    redirect: "error",
  });
  let result: unknown;
  try { result = await response.json(); } catch { throw new Error("err:bad_action"); }
  if (!response.ok) {
    const error = result && typeof result === "object" && "error" in result ? result.error : null;
    throw new Error(typeof error === "string" && /^err:[a-z_]+$/.test(error) ? error : "err:bad_action");
  }
  return result as Awaited<ReturnType<Functions[K]>>;
}

export const getMe = () => request("getMe");
export const updateProfile = (options: Parameters<Functions["updateProfile"]>[0]) => request("updateProfile", options.data);
export const setAvatar = (options: Parameters<Functions["setAvatar"]>[0]) => request("setAvatar", options.data);
export const logEvent = (options: Parameters<Functions["logEvent"]>[0]) => request("logEvent", options.data);
export const deletePlayerData = (options: Parameters<Functions["deletePlayerData"]>[0]) => request("deletePlayerData", options?.data);
export const adminPinLogin = (options: Parameters<Functions["adminPinLogin"]>[0]) => request("adminPinLogin", options.data);
export const adminOverview = () => request("adminOverview");
export const adminAdDiagnostics = () => request("adminAdDiagnostics");
export const getMonthlyMostActive = () => request("getMonthlyMostActive");