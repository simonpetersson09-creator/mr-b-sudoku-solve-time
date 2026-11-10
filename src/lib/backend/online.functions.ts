import { createServerFn } from "@tanstack/react-start";
import { timed } from "./server-timing";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { updateProfileInput, logEventInput, setAvatarInput, deleteDataInput, adminPinInput } from "./online-inputs";

export const getMe = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { getMeAction } = await import("./online-actions");
  return timed("getMe", () => getMeAction({ context }));
});

export const updateProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(updateProfileInput).handler(async ({ data, context }) => {
  const { updateProfileAction } = await import("./online-actions");
  return timed("updateProfile", () => updateProfileAction({ data, context }));
});

export const logEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(logEventInput).handler(async ({ data, context }) => {
  const { logEventAction } = await import("./online-actions");
  return timed("logEvent", () => logEventAction({ data, context }));
});

export const adminOverview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { adminOverviewAction } = await import("./online-actions");
  return timed("adminOverview", () => adminOverviewAction({ context }));
});

export const adminAdDiagnostics = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { adminAdDiagnosticsAction } = await import("./online-actions");
  return adminAdDiagnosticsAction({ context });
});

export const setAvatar = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(setAvatarInput).handler(async ({ data, context }) => {
  const { setAvatarAction } = await import("./online-actions");
  return timed("setAvatar", () => setAvatarAction({ data, context }));
});

export const deletePlayerData = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(deleteDataInput).handler(async ({ data, context }) => {
  const { deletePlayerDataAction } = await import("./online-actions");
  return timed("deletePlayerData", () => deletePlayerDataAction({ data, context }));
});

export const adminPinLogin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(adminPinInput).handler(async ({ data, context }) => {
  const { adminPinLoginAction } = await import("./online-actions");
  return timed("adminPinLogin", () => adminPinLoginAction({ data, context }));
});
