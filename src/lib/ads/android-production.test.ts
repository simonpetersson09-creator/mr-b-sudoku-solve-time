import { afterEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ prepare: vi.fn(), load: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true, isPluginAvailable: () => true } }));
vi.mock('./local-stats', () => ({ getRankedGames: () => 1 }));
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@capacitor-community/admob', () => ({ AdmobConsentStatus: { REQUIRED: 'REQUIRED' }, AdMob: {
  requestConsentInfo: async () => ({ canRequestAds: true }), initialize: async () => {},
  prepareInterstitial: sdk.prepare, loadAppOpen: sdk.load, addListener: async () => ({ remove: async () => {} }), isAppOpenLoaded: async () => ({ value: sdk.load.mock.calls.length > 0 }),
} }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('Android release uses only the real Interstitial and App Open units', async () => {
  vi.resetModules(); vi.stubEnv('DEV', false); sdk.load.mockResolvedValue({});
  const ads = await import('./admob');
  expect(await ads.preloadInterstitial()).toBe(true);
  expect(sdk.prepare).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-7448540924654868/7141732539' }));
  expect(await ads.preloadAppOpenAd()).toBe(true);
  expect(sdk.load).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-7448540924654868/3139567484' }));
});
it('Android development retains the official interstitial sample with explicit testing mode', async () => {
  vi.resetModules(); vi.stubEnv('DEV', true);
  const ads = await import('./admob');
  expect(await ads.preloadInterstitial()).toBe(true);
  expect(sdk.prepare).toHaveBeenCalledWith({ adId: 'ca-app-pub-3940256099942544/1033173712', isTesting: true });
});