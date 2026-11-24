import { describe, expect, it } from "vitest";
import { adminActivityEvents } from "./admin-period";
import { logEventInput } from "./online-inputs";
import { testFlightDetail } from "@/lib/native/app-environment";

describe("TestFlight admin exclusion", () => {
  it("omits TestFlight activity, games and diagnostics without changing stored events", () => {
    const events = [
      { user_id: "tester", device_id: "test-phone", platform: "ios", detail: { testFlight: true } },
      { user_id: "player", device_id: "store-phone", platform: "ios", detail: { testFlight: false } },
      { user_id: "android", device_id: "android-phone", platform: "android", detail: { testFlight: true } },
    ];
    expect(adminActivityEvents(events, [])).toEqual([events[1], events[2]]);
    expect(events).toHaveLength(3);
  });

  it("preserves the native TestFlight marker through every validated report kind", () => {
    for (const [kind, extra] of [
      ["session", { sid: "visit", seconds: 1 }],
      ["local_game", { phase: "start", level: "easy", gid: "game" }],
      ["app", { name: "settings_opened" }],
      ["ad", { name: "post_match_exit" }],
      ["error", { message: "test" }],
    ] as const) {
      const input = logEventInput({ kind, platform: "ios", deviceId: "phone", detail: { ...extra, ...testFlightDetail(true) } });
      expect(input.detail["testFlight"]).toBe(true);
    }
  });

  it("does not mark App Store, Android or web reports as TestFlight", () => {
    expect(testFlightDetail(false)).toEqual({});
    expect(logEventInput({ kind: "session", platform: "ios", detail: testFlightDetail(false) }).detail["testFlight"]).toBeUndefined();
    expect(logEventInput({ kind: "session", platform: "android", detail: { testFlight: true } }).detail["testFlight"]).toBeUndefined();
    expect(logEventInput({ kind: "session", platform: "web", detail: { testFlight: true } }).detail["testFlight"]).toBeUndefined();
  });
});
