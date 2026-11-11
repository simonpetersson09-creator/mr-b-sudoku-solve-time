import type { updateProfileInput, logEventInput, setAvatarInput } from "./online-inputs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { healthAlerts } from "./server-timing";
import { activityByDay, type ActivityEvent } from "./activity-stats";
import { adminActivityEvents, adminPeriodStart, adminReportingDays, appPlayerIds } from "./admin-period";
import { appOpenDiagnosticsSince, isAppOpenDiagnostic } from "./ad-diagnostics";

// The service-role client is only loaded inside handlers, after the caller is authenticated.
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
type Admin = Awaited<ReturnType<typeof admin>>;

async function logEventRow(db: Admin, row: { user_id?: string | null; kind: string; detail?: unknown; device_id?: string | null; platform?: string | null }) {
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
  const { error: evErr } = await db.from("app_events").delete().eq("user_id", uid);
  if (evErr) throw new Error("err:delete_failed");
  const { error } = await db.auth.admin.deleteUser(uid); // removes profile and roles too
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
    const { data: existing, error } = await db.from("app_events").select("id").eq("user_id", context.userId)
      .eq("kind", "local_game").eq("detail->>gid", String(data.detail["gid"]))
      .eq("detail->>phase", String(data.detail["phase"])).limit(1);
    if (error) throw new Error("err:bad_action");
    if (existing?.length) return { ok: true };
  }
  await logEventRow(db, { user_id: context.userId, kind: data.kind, device_id: data.deviceId, platform: data.platform, detail: data.detail });
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
  const diagnostics: { at: string; platform: string | null; detail: Database["public"]["Tables"]["app_events"]["Row"]["detail"] }[] = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const { data, error } = await db.from("app_events").select("id, created_at, platform, detail")
      .eq("kind", "ad").eq("platform", "ios").eq("detail->>name", "ios_app_open_diag")
      .gte("created_at", since).order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
    if (error) throw new Error("err:missing");
    diagnostics.push(...(data ?? []).filter(isAppOpenDiagnostic).map((r) => ({ at: r.created_at, platform: r.platform, detail: r.detail })));
    if ((data?.length ?? 0) < 500) break;
  }
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
  const [events, profiles, exclusions] = await Promise.all([
    db.from("app_events").select("kind, user_id, device_id, platform, detail, created_at").gte("created_at", since30).order("created_at", { ascending: false }).limit(10000),
    db.from("profiles").select("id, created_at, last_seen").limit(10000),
    db.from("admin_activity_exclusions").select("user_id, device_id"),
  ]);
  if (exclusions.error) throw exclusions.error;
  if (events.error || profiles.error) throw new Error("err:bad_action");
  // Visit/local-game reports are read in full pages so busy diagnostics can never crowd them out.
  const visitRows: ActivityEvent[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: page, error } = await db.from("app_events").select("kind, user_id, device_id, platform, detail, created_at")
      .in("kind", ["session", "heartbeat", "session_end", "local_game"]).gte("created_at", sinceStats)
      .order("created_at").order("id").range(offset, offset + 999);
    if (error) throw error;
    visitRows.push(...(page ?? []));
    if ((page?.length ?? 0) < 1000) break;
  }
  const ev = events.data ?? [];
  const allActivity = adminActivityEvents([...ev, ...visitRows] as typeof ev, exclusions.data ?? []);
  const appUsers = appPlayerIds(allActivity, sinceStats);
  const activeAppUsers = appPlayerIds(allActivity, new Date(Math.max(periodStart, now - day)).toISOString());
  const activeNowUsers = appPlayerIds(allActivity, new Date(Math.max(periodStart, now - 2 * 60_000)).toISOString());
  const reportDays = adminReportingDays(now, periodStart);
  const byDay = activityByDay(adminActivityEvents(visitRows as (ActivityEvent & { user_id: string | null })[], exclusions.data ?? []), reportDays);
  const days = reportDays.map((d) => {
    const a = byDay.get(d);
    if (!a) throw new Error("err:bad_action");
    return { date: d, appSessions: a.appSessions, avgMinutes: a.avgMinutes, started: a.localStarted, finished: a.localFinished, appDevices: a.appDevices };
  });
  // Keep existing identities intact; the player cohort restarts at the reset.
  const profs = (profiles.data ?? []).filter((p) => appUsers.has(p.id) && (!reset || p.created_at >= reset.created_at));
  const retention = (n: number) => {
    const cohort = profs.filter((p) => now - new Date(p.created_at).getTime() > n * day);
    if (!cohort.length) return null;
    const kept = cohort.filter((p) => new Date(p.last_seen).getTime() - new Date(p.created_at).getTime() >= n * day).length;
    return Math.round((kept / cohort.length) * 100);
  };
  return {
    totals: { players: profs.length, activeNow: activeNowUsers.size, active24h: activeAppUsers.size },
    retention: { d1: retention(1), d7: retention(7), d30: retention(30) },
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
