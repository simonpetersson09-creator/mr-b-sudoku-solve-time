export const updateProfileInput = (d: { display_name: string; avatar: string; country: string }) => {
    const name = String(d.display_name ?? "").trim().slice(0, 20);
    if (name.length < 2) throw new Error("err:name_short");
    const country = String(d.country ?? "").toUpperCase();
    if (!isRealCountry(country)) throw new Error("err:invalid_country");
    return { display_name: name, avatar: String(d.avatar ?? "🧩").slice(0, 8), country };
  };
// A profile picture is a small square JPEG made on the phone before it is sent.
const AVATAR_MAX_CHARS = 120000;
export const setAvatarInput = (d: { image: string | null }) => {
    if (d.image == null || d.image === "") return { image: null };
    const img = String(d.image);
    if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(img)) throw new Error("err:bad_image");
    if (img.length > AVATAR_MAX_CHARS) throw new Error("err:image_too_large");
    return { image: img };
  };
export const LEVELS = ["easy", "medium", "hard", "expert", "ultra", "impossible", "master"] as const;
export const logEventInput = (d: { kind: string; deviceId?: string; platform?: string; detail?: Record<string, unknown> }) => {
    if (!d || !["session", "heartbeat", "session_end", "local_game", "error", "ad"].includes(d.kind)
      || !["ios", "android", "web"].includes(String(d.platform))) throw new Error("err:bad_action");
    const kind = d.kind;
    const platform = String(d.platform);
    const raw = d.detail ?? {};
    if (typeof raw !== "object" || Array.isArray(raw) || JSON.stringify(raw).length > 4000) throw new Error("err:bad_action");
    const v = typeof raw["v"] === "string" ? { v: raw["v"].slice(0, 30) } : {};
    let detail: Record<string, unknown>;
    if (kind === "session" || kind === "heartbeat" || kind === "session_end") {
      // Visit reports keep only a visit id, whole foreground seconds (max 4 h) and the app version.
      const secs = Math.round(Number(raw["seconds"]));
      if (kind === "session_end" && !(secs >= 5 && secs <= 4 * 3600)) throw new Error("err:missing");
      const sid = typeof raw["sid"] === "string" && /^[A-Za-z0-9-]{1,40}$/.test(raw["sid"]) ? { sid: raw["sid"] } : {};
      detail = { ...sid, ...(Number.isFinite(secs) && secs >= 0 ? { seconds: Math.min(secs, 4 * 3600) } : {}), ...v };
    } else if (kind === "local_game") {
      if (!(LEVELS as readonly string[]).includes(String(raw["level"])) || !["start", "finish"].includes(String(raw["phase"]))
        || typeof raw["gid"] !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(raw["gid"]) || platform === "web") throw new Error("err:bad_action");
      const level = String(raw["level"]);
      const gid = typeof raw["gid"] === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(raw["gid"]) ? { gid: raw["gid"] } : {};
      const original = raw['occurredAt'] ?? raw['queued'];
      let occurredAt: string | undefined;
      if (original !== undefined) {
        const at = typeof original === 'string' ? Date.parse(original) : NaN;
        if (!Number.isFinite(at) || at < Date.UTC(2020, 0, 1) || at > Date.now() + 5 * 60_000) throw new Error('err:bad_action');
        occurredAt = new Date(Math.min(at, Date.now())).toISOString();
      }
      detail = { phase: raw["phase"] === "finish" ? "finish" : "start", level, ...gid, ...v, ...(occurredAt ? { occurredAt } : {}) };
    } else {
      detail = {};
      for (const [key, value] of Object.entries(raw).slice(0, 16)) {
        if (/token|password|authorization|consent|email|user_?id/i.test(key)) continue;
        if (typeof value === "string") detail[key.slice(0, 40)] = value.slice(0, key === "stack" ? 600 : 300);
        else if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) detail[key.slice(0, 40)] = value;
      }
    }
    return { kind, platform, deviceId: String(d.deviceId ?? "").slice(0, 64) || null, detail };
  };
export const deleteDataInput = (_d?: unknown) => ({ confirm: true as const });

/** Only real ISO 3166 region codes (not "XX" or "ZZ") may be stored as a player's country. */
export function isRealCountry(code: string): boolean {
  if (!/^[A-Z]{2}$/.test(code)) return false;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" }).of(code);
    return !!name && name !== code && name !== "Unknown Region";
  } catch { return false; }
}
export const adminPinInput = (d: { pin: string }) => {
  const pin = String(d?.pin ?? "").trim();
  if (!/^\d{4,12}$/.test(pin)) throw new Error("err:forbidden");
  return { pin };
};
