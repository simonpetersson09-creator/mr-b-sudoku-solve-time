/**
 * App activity for the admin panel, like Yatzy: one id per visit, a start report, a heartbeat
 * every minute while the app is in front, and an end report when it is hidden or closed.
 * After 30 minutes in the background a new visit starts. Only the visit id, foreground seconds
 * and app version are sent.
 */
import { randomId } from "@/lib/random-id";
import { logEvent } from "./online.functions";
import { deviceId, platform } from "./telemetry";
import { appVersion } from "./report";
import { PAUSE_EVENT, RESUME_EVENT } from '@/lib/native/runtime';

export const HEARTBEAT_MS = 60_000;
export const NEW_VISIT_AFTER_MS = 30 * 60_000;
const MAX_SECONDS = 4 * 3600;

export function startActivityTracking() {
  let sid: string | null = null;
  let activeMs = 0;
  let visibleSince: number | null = null;
  let hiddenAt = 0;
  let started = false; // start report delivered for this visit
  let nativeHidden = false;
  let startPending = false;

  const seconds = () => Math.min(MAX_SECONDS, Math.round((activeMs + (visibleSince !== null ? Date.now() - visibleSince : 0)) / 1000));
  const send = async (kind: "session" | "heartbeat" | "session_end") => {
    if (!sid) return;
    const visit = sid, elapsed = seconds();
    const v = await appVersion();
    await logEvent({ data: { kind, deviceId: deviceId(), platform: platform(), detail: { sid: visit, seconds: elapsed, v } } });
  };
  const begin = () => { sid = randomId(); activeMs = 0; visibleSince = Date.now(); started = false; };
  const sendStart = () => { if (started || !sid || startPending) return; const visit = sid; startPending = true; send("session").then(() => { if (sid === visit) started = true; }).catch(() => {}).finally(() => { startPending = false; }); };

  const onVisible = () => {
    if (nativeHidden || document.visibilityState !== 'visible') return;
    if (visibleSince !== null) return;
    if (!sid || Date.now() - hiddenAt > NEW_VISIT_AFTER_MS) begin();
    else visibleSince = Date.now();
    if (!started) sendStart(); else void send("heartbeat").catch(() => {});
  };
  const onHidden = () => {
    if (visibleSince === null) return;
    activeMs += Date.now() - visibleSince;
    visibleSince = null;
    hiddenAt = Date.now();
    if (seconds() >= 5) void send("session_end").catch(() => {});
  };
  const onVisibility = () => (document.visibilityState === "visible" ? onVisible() : onHidden());
  const onPause = () => { nativeHidden = true; onHidden(); };
  const onResume = () => { nativeHidden = false; onVisible(); };
  const timer = window.setInterval(() => {
    if (visibleSince === null) return;
    if (!started) sendStart(); else void send("heartbeat").catch(() => {});
  }, HEARTBEAT_MS);

  if (document.visibilityState === "visible") begin();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onHidden);
  window.addEventListener(PAUSE_EVENT, onPause);
  window.addEventListener(RESUME_EVENT, onResume);
  return {
    /** Call when the player identity is ready (start, network back, resume). */
    ready: () => { if (nativeHidden) return; if (!sid && document.visibilityState === "visible") begin(); sendStart(); },
    stop: () => { onHidden(); window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pagehide", onHidden); window.removeEventListener(PAUSE_EVENT, onPause); window.removeEventListener(RESUME_EVENT, onResume); },
  };
}
