import { afterEach, beforeEach, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ callbacks: new Map<string, Set<() => void>>(), showInterstitial: vi.fn(), showAppOpen: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true, isPluginAvailable: () => true } }));
vi.mock("./local-stats", () => ({ getRankedGames: () => 1 }));
vi.mock("./analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@capacitor-community/admob", () => ({
  AdmobConsentStatus: { REQUIRED: "REQUIRED" },
  InterstitialAdPluginEvents: { Dismissed: "close", FailedToShow: "fail" }, AppOpenAdPluginEvents: {},
  AdMob: {
    requestConsentInfo: async () => ({ canRequestAds: true }), initialize: async () => {}, trackingAuthorizationStatus: async () => ({ status: "denied" }),
    prepareInterstitial: async () => {}, showInterstitial: sdk.showInterstitial,
    isAppOpenLoaded: async () => ({ value: true }), showAppOpen: sdk.showAppOpen, noteAppOpenDiagnostic: async () => {},
    addListener: async (name: string, callback: () => void) => {
      const listeners = sdk.callbacks.get(name) ?? new Set(); listeners.add(callback); sdk.callbacks.set(name, listeners);
      return { remove: async () => { listeners.delete(callback); } };
    },
  },
}));
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); sdk.callbacks.clear(); sdk.showInterstitial.mockReset().mockResolvedValue({}); sdk.showAppOpen.mockReset().mockImplementation(() => new Promise(() => {})); history.replaceState({}, "", "/"); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it("interstitial caller timeout keeps ownership until real SDK dismissal", async () => {
  const ads = await import("./admob");
  expect(await ads.preloadInterstitial()).toBe(true);
  const pending = ads.showPostMatchInterstitial();
  await vi.advanceTimersByTimeAsync(100_000);
  expect(await pending).toBe("failed");
  expect(await ads.showPostMatchInterstitial()).toBe("busy");
  expect(await ads.showAppOpenAd()).toBe(false);
  for (const callback of [...(sdk.callbacks.get("close") ?? [])]) callback();
  await vi.advanceTimersByTimeAsync(0);
  const next = ads.showPostMatchInterstitial(); await vi.advanceTimersByTimeAsync(0);
  expect(sdk.showInterstitial).toHaveBeenCalledTimes(2);
  for (const callback of [...(sdk.callbacks.get("close") ?? [])]) callback();
  expect(await next).toBe("shown");
});
it("app-open timeout stays owned past 90 seconds until its native closure promise resolves", async () => {
  let close: () => void = () => {};
  sdk.showAppOpen.mockImplementation(() => new Promise<void>(resolve => { close = resolve; }));
  const ads = await import("./admob");
  const pending = ads.showAppOpenAd(); await vi.advanceTimersByTimeAsync(100_000);
  expect(await pending).toBe(true);
  expect(await ads.showPostMatchInterstitial()).toBe("busy");
  expect(await ads.showAppOpenAd()).toBe(false);
  close(); await vi.advanceTimersByTimeAsync(0);
  await ads.preloadInterstitial();
  const next = ads.showPostMatchInterstitial(); await vi.advanceTimersByTimeAsync(0);
  expect(sdk.showInterstitial).toHaveBeenCalledOnce();
  for (const callback of [...(sdk.callbacks.get("close") ?? [])]) callback();
  expect(await next).toBe("shown");
});