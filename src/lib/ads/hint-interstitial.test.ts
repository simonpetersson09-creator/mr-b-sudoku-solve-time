import { afterEach, beforeEach, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ prepare: vi.fn(async () => {}), show: vi.fn(async () => {}), listeners: new Map<string, Set<() => void>>(), eligible: true }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true, isPluginAvailable: () => true } }));
vi.mock("./analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@capacitor-community/admob", () => ({
  AdmobConsentStatus: { REQUIRED: "REQUIRED" },
  InterstitialAdPluginEvents: { Dismissed: "dismissed", FailedToShow: "failed" },
  AdMob: {
    requestConsentInfo: async () => ({ canRequestAds: sdk.eligible }), initialize: async () => {},
    trackingAuthorizationStatus: async () => ({ status: "denied" }), noteAppOpenDiagnostic: async () => {},
    prepareInterstitial: sdk.prepare, showInterstitial: sdk.show,
    addListener: async (name: string, fn: () => void) => { const set = sdk.listeners.get(name) ?? new Set(); set.add(fn); sdk.listeners.set(name, set); return { remove: async () => { set.delete(fn); } }; },
  },
}));
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); sdk.listeners.clear(); sdk.prepare.mockReset().mockResolvedValue(); sdk.show.mockReset().mockResolvedValue(); sdk.eligible = true; });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it("each of 3 separate hint taps shows its own ad and waits for dismissal", async () => {
  const { showHintInterstitial } = await import("./admob");
  for (let n = 1; n <= 3; n++) {
    let done = false;
    const pending = showHintInterstitial().then(result => { done = true; return result; });
    await vi.advanceTimersByTimeAsync(0);
    expect(sdk.show).toHaveBeenCalledTimes(n);
    expect(done).toBe(false);
    for (const listener of sdk.listeners.get("dismissed") ?? []) listener();
    expect(await pending).toBe("shown");
  }
  expect(sdk.prepare.mock.calls.length).toBeGreaterThanOrEqual(3);
});
it("simultaneous taps cannot open overlapping hint ads", async () => {
  const { showHintInterstitial } = await import("./admob");
  const first = showHintInterstitial(); await vi.advanceTimersByTimeAsync(0);
  expect(await showHintInterstitial()).toBe("busy");
  expect(sdk.show).toHaveBeenCalledOnce();
  for (const listener of sdk.listeners.get("dismissed") ?? []) listener();
  expect(await first).toBe("shown");
});
it("does not request a hint ad when UMP disallows ads", async () => {
  sdk.eligible = false;
  const { showHintInterstitial } = await import("./admob");
  expect(await showHintInterstitial()).toBe("failed");
  expect(sdk.prepare).not.toHaveBeenCalled(); expect(sdk.show).not.toHaveBeenCalled();
});
it("a failed hint ad allows play to continue", async () => {
  sdk.show.mockRejectedValueOnce(new Error("show failed"));
  const { showHintInterstitial } = await import("./admob");
  expect(await showHintInterstitial()).toBe("failed");
});