import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true, isPluginAvailable: () => true } }));

const files = ["src/lib/ads/admob.ts", "scripts/set-ios-admob-plist.js", "ios/App/App/Info.plist", "android/app/src/main/AndroidManifest.xml"];

describe("Mr.B. Sudoku ad configuration", () => {
  it("uses only Google's sample ad IDs until Sudoku has its own", async () => {
    const { ADMOB_IDS } = await import("./admob");
    for (const p of ["ios", "android"] as const)
      for (const id of Object.values(ADMOB_IDS[p])) expect(id).toMatch(/^ca-app-pub-3940256099942544[~/]/);
  });
  it("puts Google's sample App IDs in the native projects", () => {
    expect(readFileSync("ios/App/App/Info.plist", "utf8")).toContain("ca-app-pub-3940256099942544~1458002511");
    expect(readFileSync("android/app/src/main/AndroidManifest.xml", "utf8")).toContain("ca-app-pub-3940256099942544~3347511713");
  });
  it("never uses Ludo's or Yatzy's AdMob account anywhere", () => {
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toContain("7448540924654868");
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
