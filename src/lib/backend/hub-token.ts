/** MrB. Admin hub token: "<exp>.<hex(HMAC-SHA256(secret, "mrb-hub:" + exp))>", exp in ms since epoch. Web Crypto only (workerd-safe). */
const enc = new TextEncoder();

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hubSignature(secret: string, exp: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`mrb-hub:${exp}`)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyHubToken(token: unknown, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret || typeof token !== "string" || token.length > 200) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1).toLowerCase();
  if (!/^\d{1,16}$/.test(exp) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const expected = await hubSignature(secret, exp);
  return constantTimeEqual(sig, expected) && Number(exp) > now;
}
