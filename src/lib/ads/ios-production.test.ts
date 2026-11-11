import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  order: [] as string[], eligible: true, loaded: false,
  prepare: vi.fn(), load: vi.fn(), show: vi.fn(),
  listeners: new Map<string, Set<() => void>>(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true, isPluginAvailable: () => true } }));
vi.mock('./local-stats', () => ({ getRankedGames: () => 1 }));
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@capacitor-community/admob', () => ({
  AdmobConsentStatus: { REQUIRED: 'REQUIRED' },
  InterstitialAdPluginEvents: { Dismissed: 'dismissed', FailedToShow: 'failed' },
  AppOpenAdPluginEvents: { AdImpression: 'impression' },
  AdMob: {
    requestConsentInfo: async () => { sdk.order.push('ump'); return { canRequestAds: sdk.eligible }; },
    trackingAuthorizationStatus: async () => { sdk.order.push('att'); return { status: 'denied' }; },
    initialize: async () => { sdk.order.push('initialize'); },
    noteAppOpenDiagnostic: async () => {},
    prepareInterstitial: async (options: unknown) => { sdk.order.push('interstitial'); sdk.prepare(options); },
    loadAppOpen: async (options: unknown) => { sdk.order.push('appOpen'); sdk.load(options); sdk.loaded = true; },
    isAppOpenLoaded: async () => ({ value: sdk.loaded }),
    showInterstitial: async () => { sdk.show(); },
    addListener: async (name: string, fn: () => void) => {
      const set = sdk.listeners.get(name) ?? new Set(); set.add(fn); sdk.listeners.set(name, set);
      return { remove: async () => { set.delete(fn); } };
    },
  },
}));
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.stubEnv('DEV', false);
  sdk.order = []; sdk.loaded = false; sdk.eligible = true; sdk.listeners.clear();
  sdk.prepare.mockClear(); sdk.load.mockClear(); sdk.show.mockClear();
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); });

it('production App Open uses the confirmed iOS unit after UMP and ATT', async () => {
  const m = await import('./admob');
  expect(await m.preloadAppOpenAd()).toBe(true);
  expect(sdk.load).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-7448540924654868/5823578752', diagnosticTestMode: false }));
  expect(sdk.order).toEqual(['ump', 'att', 'initialize', 'appOpen']);
  expect(sdk.show).not.toHaveBeenCalled();
});
it.each(['hint', 'result'] as const)('production %s uses the confirmed shared interstitial, waits for dismissal and never grants a reward', async kind => {
  const m = await import('./admob');
  if (kind === 'result') expect(await m.preloadInterstitial()).toBe(true);
  const pending = kind === 'hint' ? m.showHintInterstitial() : m.showPostMatchInterstitial({ matchKey: 'ios-config-fixture', action: 'home' });
  await vi.advanceTimersByTimeAsync(0);
  expect(sdk.prepare).toHaveBeenCalledWith({ adId: 'ca-app-pub-7448540924654868/3884131928', isTesting: false });
  expect(sdk.order.slice(0, 4)).toEqual(['ump', 'att', 'initialize', 'interstitial']);
  expect(sdk.show).toHaveBeenCalledOnce();
  for (const listener of sdk.listeners.get('dismissed') ?? []) listener();
  expect(await pending).toBe('shown');
});
it('development uses Google test units for both formats, not production requests', async () => {
  vi.stubEnv('DEV', true);
  const m = await import('./admob');
  expect(await m.preloadInterstitial()).toBe(true);
  expect(await m.preloadAppOpenAd()).toBe(true);
  expect(sdk.prepare).toHaveBeenCalledWith({ adId: 'ca-app-pub-3940256099942544/4411468910', isTesting: true });
  expect(sdk.load).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-3940256099942544/5575463023', diagnosticTestMode: true }));
});
it('UMP denial prevents both production format requests', async () => {
  sdk.eligible = false;
  const m = await import('./admob');
  expect(await m.preloadInterstitial()).toBe(false);
  expect(await m.preloadAppOpenAd()).toBe(false);
  expect(sdk.prepare).not.toHaveBeenCalled(); expect(sdk.load).not.toHaveBeenCalled();
  expect(sdk.order).toEqual(['ump']);
});