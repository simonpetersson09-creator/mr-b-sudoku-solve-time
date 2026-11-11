import { RESUME_EVENT } from "@/lib/native/runtime";

export const ADMIN_REFRESH_MS = 60_000;

/** No polling while hidden/offline; foreground catches up immediately. */
export function startAdminRefresh(refresh: () => void): () => void {
  const update = () => {
    if (document.visibilityState === "visible" && navigator.onLine) refresh();
  };
  const timer = window.setInterval(update, ADMIN_REFRESH_MS);
  window.addEventListener("focus", update);
  window.addEventListener("online", update);
  window.addEventListener(RESUME_EVENT, update);
  document.addEventListener("visibilitychange", update);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", update);
    window.removeEventListener("online", update);
    window.removeEventListener(RESUME_EVENT, update);
    document.removeEventListener("visibilitychange", update);
  };
}