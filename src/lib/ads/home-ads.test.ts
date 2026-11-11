import { afterEach, beforeEach, expect, it, vi } from "vitest";
const ads = vi.hoisted(() => ({ preload: vi.fn(async () => true), show: vi.fn(async (allowed: () => boolean) => allowed()), listener: null as null | ((state: { isActive: boolean }) => void) }));
vi.mock("./admob", () => ({ isAdMobAvailable: () => true, preloadAppOpenAd: ads.preload, showAppOpenAd: ads.show }));
vi.mock("./analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@capacitor/app", () => ({ App: { addListener: async (_name: string, listener: typeof ads.listener) => { ads.listener = listener; } } }));
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); ads.preload.mockClear(); ads.show.mockClear(); ads.listener = null; window.history.replaceState({}, "", "/"); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it("offers exactly one startup ad at 1500 ms even after Home remounts", async () => {
  const { startHomeAds } = await import("./home-ads");
  const stop = startHomeAds();
  await vi.advanceTimersByTimeAsync(1499);
  expect(ads.show).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(ads.show).toHaveBeenCalledOnce();
  stop(); startHomeAds(); await vi.advanceTimersByTimeAsync(1500);
  expect(ads.show).toHaveBeenCalledOnce();
});
it("does not show an extra App Open ad when returning from background", async () => {
  const { startHomeAds } = await import("./home-ads");
  startHomeAds(); await vi.advanceTimersByTimeAsync(1500);
  ads.listener?.({ isActive: false }); await vi.advanceTimersByTimeAsync(120_000);
  ads.listener?.({ isActive: true }); await vi.advanceTimersByTimeAsync(1500);
  expect(ads.show).toHaveBeenCalledOnce();
});
it("leaving Home cancels the startup opportunity without deferring it", async () => {
  const { startHomeAds } = await import("./home-ads");
  startHomeAds()(); startHomeAds(); await vi.advanceTimersByTimeAsync(1500);
  expect(ads.show).not.toHaveBeenCalled();
});