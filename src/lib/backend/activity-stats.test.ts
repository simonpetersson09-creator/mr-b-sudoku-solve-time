import { describe, expect, it } from "vitest";
import { activityByDay, stockholmDate, stockholmDays } from "./activity-stats";
import { logEventInput } from "./online-inputs";

describe("admin activity", () => {
  it("counts each app game phase once across duplicate reports, retaining independent players", () => {
    const e = (user_id: string, phase: string, created_at: string, platform = "ios") => ({ kind: "local_game", user_id, platform, device_id: user_id, detail: { gid: "game-a", phase }, created_at });
    const rows = activityByDay([
      e("a", "finish", "2026-11-10T10:00:00Z"), e("a", "finish", "2026-11-09T10:00:00Z"),
      e("a", "start", "2026-11-09T09:00:00Z"), e("a", "start", "2026-11-09T09:01:00Z"),
      e("b", "finish", "2026-11-09T11:00:00Z", "android"), e("web", "finish", "2026-11-09T11:00:00Z", "web"),
    ], ["2026-11-09", "2026-11-10"]);
    expect(rows.get("2026-11-09")?.localStarted).toBe(1);
    expect(rows.get("2026-11-09")?.localFinished).toBe(2);
    expect(rows.get("2026-11-10")?.localFinished).toBe(0);
  });
  it("buckets days in Stockholm time, not UTC", () => {
    expect(stockholmDate("2026-11-09T23:30:00Z")).toBe("2026-11-10");
    expect(stockholmDays(Date.parse("2026-11-09T23:30:00Z"), Date.parse("2026-11-08T09:43:00Z"))).toEqual(["2026-11-08", "2026-11-09", "2026-11-10"]);
  });
  it("counts a visit without an end report and uses the longest heartbeat", () => {
    const e = (kind: string, at: string, detail: object, platform = "ios", device_id = "d1") => ({ kind, platform, device_id, detail, created_at: at });
    const m = activityByDay([
      e("session", "2026-11-09T10:00:00Z", { sid: "a", seconds: 0 }),
      e("heartbeat", "2026-11-09T10:02:00Z", { sid: "a", seconds: 120 }),
      e("session", "2026-11-09T11:00:00Z", { sid: "b", seconds: 0 }, "android", "d2"),
      e("session_end", "2026-11-09T11:01:00Z", { sid: "b", seconds: 60 }, "android", "d2"),
      e("session", "2026-11-09T12:00:00Z", { sid: "w" }, "web", "d3"),
      e("session", "2026-11-09T12:00:00Z", { sid: "u" }, "android", "unknown"),
      e("local_game", "2026-11-09T12:00:00Z", { phase: "start" }),
      e("local_game", "2026-11-09T12:20:00Z", { phase: "finish" }),
    ], ["2026-11-09"]).get("2026-11-09")!;
    expect(m.appDevices).toBe(2);
    expect(m.appSessions).toBe(3);
    expect(m.localStarted).toBe(1);
    expect(m.localFinished).toBe(1);
  });
  it("accepts heartbeat and local game reports with only allowed fields", () => {
    expect(logEventInput({ kind: "heartbeat", platform: "ios", detail: { sid: "abc", seconds: 61.2, v: "1.0 (5)", x: 1 } }).detail).toEqual({ sid: "abc", seconds: 61, v: "1.0 (5)" });
    expect(logEventInput({ kind: "local_game", platform: "android", detail: { phase: "finish", level: "expert", gid: "game-a", humans: 1, v: "1.0", name: "x" } }).detail)
      .toEqual({ phase: "finish", level: "expert", gid: "game-a", v: "1.0" });
  });
});
