import type { updateProfileInput, logEventInput, setAvatarInput } from "./online-inputs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { healthAlerts } from "./server-timing";
import { activityByDay, type ActivityEvent } from "./activity-stats";
import { adminActivityEvents, adminPeriodStart, adminReportingDays, appPlayerIds } from "./admin-period";
import { appOpenDiagnosticsSince, isAppOpenDiagnostic } from "./ad-diagnostics";
import { appRetention } from './retention';
import { readEventPages } from './event-pages';
import { adminDayMetrics } from './admin-day-metrics';

// The service-role client is only loaded inside handlers, after the caller is authenticated.
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
type Admin = Awaited<ReturnType<typeof admin>>;

async function logEventRow(db: Admin, row: { user_id?: string | null; kind: string; detail?: unknown; device_id?: string | null; platform?: string | null; created_at?: string }) {
  const { error } = await db.from("app_events").insert({ ...row, detail: (row.detail ?? null) as never });
  if (error) throw new Error("err:bad_action");
}

export interface OnlineContext { supabase: SupabaseClient<Database>; userId: string }

// ---------- Profile ----------
export const getMeAction = async ({ context }: { context: OnlineContext }) => {
  const { supabase, userId } = context;
  const [{ data: profile }, { data: isAdmin }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", userId);
  return { userId, profile, isAdmin: !!isAdmin };
};

export const updateProfileAction = async ({ data, context }: { data: ReturnType<typeof updateProfileInput>; context: OnlineContext }) => {
  const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const setAvatarAction = async ({ data, context }: { data: ReturnType<typeof setAvatarInput>; context: OnlineContext }) => {
  const { error } = await context.supabase.from("profiles").update({ avatar_image: data.image }).eq("id", context.userId);
  if (error) throw new Error("err:bad_image");
  return { ok: true };
};

export const deletePlayerDataAction = async ({ context }: { data?: unknown; context: OnlineContext }) => {
  const db = await admin();
  const uid = context.userId;
  // The profile-delete trigger cleans app records in the SAME transaction as auth deletion.
  // Any auth/cleanup failure rolls everything back; the caller retains the identity for retry.
  const { error } = await db.auth.admin.deleteUser(uid);
  if (error) throw new Error("err:delete_failed");
  return { ok: true };
};

// ---------- Reports ----------
export const logEventAction = async ({ data, context }: { data: ReturnType<typeof logEventInput>; context: OnlineContext }) => {
  const db = await admin();
  // Existing atomic server counter; client caps alone cannot protect this endpoint.
  const limit = data.kind === "error" ? 30 : data.kind === "ad" ? 120 : 120;
  const { data: allowed, error: rateError } = await db.rpc("rate_hit", { _key: `report:${context.userId}:${data.kind}`, _max: limit, _window_seconds: 60 });
  if (rateError || allowed !== true) throw new Error("err:rate_limited");
  if (data.kind === "local_game") {
    const { error } = await db.rpc('insert_sudoku_game_report', { _user_id: context.userId,
      _device_id: data.deviceId ?? '', _platform: data.platform, _detail: data.detail as Json,
      ...(typeof data.detail['occurredAt'] === 'string' ? { _created_at: data.detail['occurredAt'] } : {}) });
    if (error) throw new Error("err:bad_action");
    return { ok: true };
  }
  await logEventRow(db, { user_id: context.userId, kind: data.kind, device_id: data.deviceId, platform: data.platform, detail: data.detail,
    ...(data.kind === 'local_game' && typeof data.detail['occurredAt'] === 'string' ? { created_at: data.detail['occurredAt'] } : {}) });
  return { ok: true };
};

// ---------- Admin ----------
async function requireAdmin(context: OnlineContext) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !isAdmin) throw new Error("err:forbidden");
}

export const adminAdDiagnosticsAction = async ({ context }: { context: OnlineContext }) => {
  await requireAdmin(context);
  const db = await admin();
  const since = appOpenDiagnosticsSince(Date.now());
  const diagnostics = (await readEventPages(db, since, ['ad'])).filter(r => r.platform === 'ios').filter(isAppOpenDiagnostic)
    .sort((a,b) => b.id-a.id).map(r => ({ at: r.created_at, platform: r.platform, detail: r.detail }));
  return { diagnostics };
};

export const adminOverviewAction = async ({ context }: { context: OnlineContext }) => {
  await requireAdmin(context);
  const db = await admin();
  const day = 86_400_000;
  const now = Date.now();
  const since30 = new Date(now - 30 * day).toISOString();
  const { data: reset, error: resetError } = await db.from("app_events").select("created_at")
    .eq("kind", "admin_statistics_reset").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (resetError) throw resetError;
  const periodStart = adminPeriodStart(now, reset?.created_at ?? null);
  const sinceStats = new Date(periodStart).toISOString();
  const [events, exclusions] = await Promise.all([
    readEventPages(db, since30),
    db.from("admin_activity_exclusions").select("user_id, device_id"),
  ]);
  if (exclusions.error) throw exclusions.error;
  const profiles: { id: string; created_at: string; last_seen: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: page, error } = await db.from('profiles').select('id, created_at, last_seen').order('id').range(offset, offset + 999);
    if (error) throw new Error('err:bad_action');
    profiles.push(...(page ?? []));
    if ((page?.length ?? 0) < 1000) break;
  }
  // Visit/local-game reports are read in full pages so busy diagnostics can never crowd them out.
  const visitRows = await readEventPages(db, reset?.created_at ?? '2020-01-01T00:00:00Z', ['session','heartbeat','session_end','local_game']);
  const ev = events.sort((a,b) => b.created_at.localeCompare(a.created_at));
  const allActivity = adminActivityEvents([...ev, ...visitRows] as typeof ev, exclusions.data ?? []);
  const activeAppUsers = appPlayerIds(allActivity, new Date(Math.max(periodStart, now - day)).toISOString());
  const activeNowUsers = appPlayerIds(allActivity, new Date(Math.max(periodStart, now - 2 * 60_000)).toISOString());
  const reportDays = adminReportingDays(now, periodStart);
  const metrics = adminDayMetrics(adminActivityEvents(visitRows, exclusions.data ?? []), reportDays);
  const byDay = activityByDay(adminActivityEvents(visitRows as (ActivityEvent & { user_id: string | null })[], exclusions.data ?? []), reportDays);
  const days = reportDays.map((d) => {
    const a = byDay.get(d);
    if (!a) throw new Error("err:bad_action");
    const metric = metrics.get(d);
    if (!metric) throw new Error('err:bad_action');
    return { date: d, appSessions: a.appSessions, avgMinutes: a.avgMinutes, started: a.localStarted, finished: a.localFinished, appDevices: a.appDevices, ...metric };
  });
  // Full app cohort, including users who never returned; last_seen is NOT day-specific evidence.
  const retention = appRetention(adminActivityEvents(visitRows as (ActivityEvent & { user_id: string | null })[], exclusions.data ?? []), new Set(profiles.map(p => p.id)), now);
  return {
    totals: { players: retention.players, activeNow: activeNowUsers.size, active24h: activeAppUsers.size },
    retention: { d1: retention.d1, d7: retention.d7, d30: retention.d30 },
    days,
    healthAlerts: healthAlerts(ev.filter((e) => e.kind === "server_timing" && !(e.detail && typeof e.detail === "object" && "steps" in e.detail) && now - new Date(e.created_at).getTime() < 7 * day)
      .map((e) => { const x = (e.detail ?? {}) as { op?: string; ms?: number; ok?: boolean }; return { at: e.created_at, op: String(x.op ?? "?"), ms: Number(x.ms) || 0, ok: x.ok !== false }; })).slice(0, 20),
    slowOps: ev.filter((e) => e.kind === "server_timing").slice(0, 30).map((e) => ({ at: e.created_at, detail: e.detail })),
    errors: ev.filter((e) => e.kind === "error").slice(0, 30).map((e) => ({ at: e.created_at, platform: e.platform, detail: e.detail })),
    ads: ev.filter((e) => e.kind === "ad").slice(0, 40).map((e) => ({ at: e.created_at, platform: e.platform, detail: e.detail })),
  };
};

async function sha256(s: string) { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))); }
/** Constant-time comparison of the two hashes, so timing reveals nothing about the PIN. */
export async function pinMatches(input: string, expected: string) {
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export const PIN_LIMITS = { perUser: 5, perIp: 10, windowSeconds: 15 * 60, global: 300, globalWindowSeconds: 3600 };
async function callerIp(): Promise<string | null> {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const raw = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0];
    const ip = raw?.trim();
    return ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
  } catch { return null; }
}
/** Owner-only admin access: the right PIN (server secret ADMIN_PIN) makes the caller's own player identity an admin. */
export const adminPinLoginAction = async ({ data, context }: { data: { pin: string }; context: OnlineContext }) => {
  const expected = process.env['ADMIN_PIN'];
  if (!expected) throw new Error("err:forbidden");
  const db = await admin();
  const ip = await callerIp();
  const keys = [
    { key: `pin:user:${context.userId}`, max: PIN_LIMITS.perUser, win: PIN_LIMITS.windowSeconds },
    ...(ip ? [{ key: `pin:ip:${ip}`, max: PIN_LIMITS.perIp, win: PIN_LIMITS.windowSeconds }] : []),
    { key: "pin:all", max: PIN_LIMITS.global, win: PIN_LIMITS.globalWindowSeconds },
  ];
  // Every attempt is counted atomically BEFORE the PIN is compared.
  const hits = await Promise.all(keys.map((k) => db.rpc("rate_hit", { _key: k.key, _max: k.max, _window_seconds: k.win })));
  if (hits.some((r) => r.error || r.data !== true)) throw new Error("err:rate_limited");
  if (!(await pinMatches(data.pin, expected))) {
    await logEventRow(db, { user_id: context.userId, kind: "admin_pin_fail" });
    throw new Error("err:forbidden");
  }
  const { data: has } = await db.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!has) {
    const { error } = await db.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("err:forbidden");
  }
  return { ok: true };
};
