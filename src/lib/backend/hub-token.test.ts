import { describe, expect, it } from "vitest";
import { hubSignature, verifyHubToken } from "./hub-token";

const secret = "test-hub-secret";
const now = 1_800_000_000_000;

describe("MrB. Admin hub token", () => {
  it("accepts a valid, unexpired token", async () => {
    const exp = String(now + 60_000);
    expect(await verifyHubToken(`${exp}.${await hubSignature(secret, exp)}`, secret, now)).toBe(true);
  });
  it("rejects a wrong signature", async () => {
    const exp = String(now + 60_000);
    expect(await verifyHubToken(`${exp}.${await hubSignature("other-secret", exp)}`, secret, now)).toBe(false);
  });
  it("rejects an expired token", async () => {
    const exp = String(now - 1);
    expect(await verifyHubToken(`${exp}.${await hubSignature(secret, exp)}`, secret, now)).toBe(false);
  });
  it("rejects when no secret is configured", async () => {
    const exp = String(now + 60_000);
    expect(await verifyHubToken(`${exp}.${await hubSignature(secret, exp)}`, undefined, now)).toBe(false);
  });
});
