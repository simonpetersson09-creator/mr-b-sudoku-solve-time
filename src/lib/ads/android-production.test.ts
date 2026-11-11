import { afterEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ prepare: vi.fn(), load: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true, isPluginAvailable: () => true } }));
vi.mock('./local-stats', () => ({ getRankedGames: () => 1 }));
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@capacitor-community/admob', () => ({ AdmobConsentStatus: { REQUIRED: 'REQUIRED' }, AdMob: {
  requestConsentInfo: async () => ({ canRequestAds: true }), initialize: async () => {},
  prepareInterstitial: sdk.prepare, loadAppOpen: sdk.load,
} }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('Android release never requests Google sample units in production mode', async () => {
  vi.resetModules(); vi.stubEnv('DEV', false);
  const ads = await import('./admob');
  expect(await ads.preloadInterstitial()).toBe(false);
  expect(await ads.preloadAppOpenAd()).toBe(false);
  expect(await ads.preloadRewarded()).toBe(false);
  expect(sdk.prepare).not.toHaveBeenCalled(); expect(sdk.load).not.toHaveBeenCalled();
});
it('Android development retains the official interstitial sample with explicit testing mode', async () => {
  vi.resetModules(); vi.stubEnv('DEV', true);
  const ads = await import('./admob');
  expect(await ads.preloadInterstitial()).toBe(true);
  expect(sdk.prepare).toHaveBeenCalledWith({ adId: 'ca-app-pub-3940256099942544/1033173712', isTesting: true });
});