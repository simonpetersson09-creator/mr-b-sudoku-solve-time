import { createFileRoute } from "@tanstack/react-router";
import { timed } from "@/lib/backend/server-timing";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { allowedNativeOrigin } from "@/lib/native/origin";

function cors(request: Request) {
  const origin = request.headers.get("origin");
  return new Headers({ "Cache-Control": "no-store", "Vary": "Origin", ...(allowedNativeOrigin(origin) && origin ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type" } : {}) });
}
export const Route = createFileRoute("/api/public/native")({ server: { handlers: {
  OPTIONS: ({ request }) => new Response(null, { status: allowedNativeOrigin(request.headers.get("origin")) ? 204 : 403, headers: cors(request) }),
  POST: async ({ request }) => {
    const headers = cors(request);
    const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });
    const callerOrigin = request.headers.get("origin");
    if (callerOrigin && callerOrigin !== new URL(request.url).origin && !allowedNativeOrigin(callerOrigin)) return reply({ error: "err:forbidden" }, 403);
    const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return reply({ error: "err:forbidden" }, 401);
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) return reply({ error: "err:missing" }, 503);
    const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error } = await db.auth.getUser(token);
    if (error || !userData.user) return reply({ error: "err:forbidden" }, 401);
    const context = { supabase: db, userId: userData.user.id };
    try {
      const raw = await request.text();
      if (raw.length > 200000) return reply({ error: "err:bad_action" }, 413);
      const body = JSON.parse(raw) as { operation?: unknown; data?: unknown };
      // Only a profile picture carries a bigger body; every other operation stays small.
      if (body.operation !== "setAvatar" && raw.length > 12000) return reply({ error: "err:bad_action" }, 413);
      const actions = await import("@/lib/backend/online-actions");
      const inputs = await import("@/lib/backend/online-inputs");
      switch (body.operation) {
        case "getMe": return reply(await timed("getMe", () => actions.getMeAction({ context })));
        case "setAvatar": return reply(await timed("setAvatar", () => actions.setAvatarAction({ data: inputs.setAvatarInput(body.data as Parameters<typeof inputs.setAvatarInput>[0]), context })));
        case "deletePlayerData": return reply(await timed("deletePlayerData", () => actions.deletePlayerDataAction({ data: inputs.deleteDataInput(body.data), context })));
        case "updateProfile": return reply(await timed("updateProfile", () => actions.updateProfileAction({ data: inputs.updateProfileInput(body.data as Parameters<typeof inputs.updateProfileInput>[0]), context })));
        case "logEvent": return reply(await timed("logEvent", () => actions.logEventAction({ data: inputs.logEventInput(body.data as Parameters<typeof inputs.logEventInput>[0]), context })));
        case "adminOverview": return reply(await timed("adminOverview", () => actions.adminOverviewAction({ context })));
        case "adminAdDiagnostics": return reply(await actions.adminAdDiagnosticsAction({ context }));
        case "adminPinLogin": return reply(await timed("adminPinLogin", () => actions.adminPinLoginAction({ data: inputs.adminPinInput(body.data as Parameters<typeof inputs.adminPinInput>[0]), context })));
        case "getMonthlyMostActive": {
          const { data, error } = await context.supabase.rpc("get_monthly_most_active", { _limit: 10 });
          if (error) throw new Error("err:bad_action");
          return reply({ me: context.userId, rows: data ?? [] });
        }
        default: return reply({ error: "err:bad_action" }, 400);
      }
    } catch (error) {
      const message = error instanceof Error && /^err:[a-z_]+$/.test(error.message) ? error.message : "err:bad_action";
      return reply({ error: message }, message === "err:forbidden" ? 403 : 400);
    }
  },
} } });
