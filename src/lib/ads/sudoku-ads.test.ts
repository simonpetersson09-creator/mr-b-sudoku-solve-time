import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true, isPluginAvailable: () => true } }));

const files = ["src/lib/ads/admob.ts", "scripts/set-ios-admob-plist.js", "ios/App/App/Info.plist", "android/app/src/main/AndroidManifest.xml"];

describe("Mr.B. Sudoku ad configuration", () => {
  it("uses Sudoku's approved iOS production IDs", async () => {
    const { ADMOB_IDS } = await import("./admob");
    expect(ADMOB_IDS.ios).toEqual({ appId: "ca-app-pub-7448540924654868~5197213597", appOpen: "ca-app-pub-7448540924654868/5823578752", optional: "ca-app-pub-7448540924654868/3884131928" });
  });
  it("keeps Android sample manifest but disables unconfigured production units", async () => {
    const { ADMOB_IDS } = await import("./admob");
    expect(ADMOB_IDS.android).toEqual({ appId: "ca-app-pub-3940256099942544~3347511713", appOpen: null, optional: null });
    expect(readFileSync("android/app/src/main/AndroidManifest.xml", "utf8")).toContain("ca-app-pub-3940256099942544~3347511713");
  });
  it("puts Sudoku's App ID in iOS", () => {
    expect(readFileSync("ios/App/App/Info.plist", "utf8")).toContain("ca-app-pub-7448540924654868~5197213597");
  });
  it("never uses Yatzy's app or ad unit IDs (publisher account may match)", () => {
    const yatzy = ["6494873071", "8707432437", "6422685490", "1382689760", "2605382885", "7786182090", "2816751438"];
    for (const f of files) for (const id of yatzy) expect(readFileSync(f, "utf8")).not.toContain(id);
  });
  it("has no banner units", async () => {
    const { BANNER_IDS } = await import("./admob");
    expect(BANNER_IDS).toEqual({ ios: null, android: null });
  });
  it("uses the family games' 1.5 second startup delay", async () => {
    const { STARTUP_AD_DELAY_MS } = await import("./home-ads");
    expect(STARTUP_AD_DELAY_MS).toBe(1500);
  });
});
