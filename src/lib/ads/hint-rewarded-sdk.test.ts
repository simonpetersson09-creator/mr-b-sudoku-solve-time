import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  platform: 'ios', eligible: true, order: [] as string[],
  prepare: vi.fn(), show: vi.fn(), initialize: vi.fn(),
  callbacks: new Map<string, Set<(event: Record<string, unknown>) => void>>(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => sdk.platform, isNativePlatform: () => true, isPluginAvailable: () => true } }));
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@capacitor-community/admob', () => ({
  AdmobConsentStatus: { REQUIRED: 'REQUIRED' },
  InterstitialAdPluginEvents: { Dismissed: 'interstitialClose', FailedToShow: 'interstitialFail' },
  RewardAdPluginEvents: { Rewarded: 'reward', Showed: 'opened', Dismissed: 'closed', FailedToShow: 'failed' },
  AdMob: {
    requestConsentInfo: async () => { sdk.order.push('ump'); return { canRequestAds: sdk.eligible }; },
    trackingAuthorizationStatus: async () => { sdk.order.push('att'); return { status: 'denied' }; },
    initialize: async () => { sdk.order.push('initialize'); sdk.initialize(); },
    noteAppOpenDiagnostic: async () => {},
    prepareRewardVideoAd: async (o: unknown) => { sdk.order.push('rewarded'); return sdk.prepare(o); },
    showRewardVideoAd: sdk.show,
    discardPrivacyCaches: async () => ({ privacyCacheVersion: 1 }),
    showPrivacyOptionsForm: async () => {},
    addListener: async (name: string, callback: (e: Record<string, unknown>) => void) => {
      const set = sdk.callbacks.get(name) ?? new Set(); set.add(callback); sdk.callbacks.set(name, set);
      return { remove: async () => { set.delete(callback); } };
    },
  },
}));
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.stubEnv('DEV', false); sdk.platform = 'ios'; sdk.eligible = true;
  sdk.order = []; sdk.callbacks.clear(); sdk.initialize.mockReset(); sdk.prepare.mockReset().mockResolvedValue({});
  sdk.show.mockReset().mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); });
function emit(name: string, event: Record<string, unknown>) { for (const cb of sdk.callbacks.get(name) ?? []) cb(event); }
async function start() {
  const ads = await import('./admob'); const reward = vi.fn();
  const pending = ads.showOptionalRewarded({ onReward: reward });
  await vi.advanceTimersByTimeAsync(0);
  const options = sdk.show.mock.calls[0]?.[0] as { attemptId: string } | undefined;
  if (!options) throw new Error('No presentation');
  return { ads, reward, pending, attemptId: options.attemptId };
}
it('uses approved production Rewarded only after UMP and ATT, and preload never shows it', async () => {
  const ads = await import('./admob'); expect(await ads.preloadRewarded()).toBe(true);
  expect(sdk.order).toEqual(['ump', 'att', 'initialize', 'rewarded']);
  expect(sdk.prepare).toHaveBeenCalledWith({ adId: 'ca-app-pub-7448540924654868/8705213764', isTesting: false });
  expect(sdk.show).not.toHaveBeenCalled(); expect(ads.REWARDED_IDS.android).toBeNull();
});
it('uses Google Rewarded sample inventory only in development', async () => {
  vi.stubEnv('DEV', true); const ads = await import('./admob'); await ads.preloadRewarded();
  expect(sdk.prepare).toHaveBeenCalledWith({ adId: 'ca-app-pub-3940256099942544/1712485313', isTesting: true });
});
it('does not configure or request iOS Rewarded on Android', async () => {
  sdk.platform = 'android'; const ads = await import('./admob'); expect(await ads.preloadRewarded()).toBe(false);
  expect(await ads.showOptionalRewarded()).toBe('unavailable'); expect(sdk.prepare).not.toHaveBeenCalled();
});
it('UMP false blocks every reward request', async () => {
  sdk.eligible = false; const ads = await import('./admob'); const reward = vi.fn();
  expect(await ads.showOptionalRewarded({ onReward: reward })).toBe('failed');
  expect(sdk.order).toEqual(['ump']); expect(sdk.show).not.toHaveBeenCalled(); expect(reward).not.toHaveBeenCalled();
});
it('a valid reward pays immediately exactly once, even if close resolution later rejects', async () => {
  let reject: (e: Error) => void = () => {}; sdk.show.mockImplementation(() => new Promise((_, r) => { reject = r; }));
  const a = await start(); emit('opened', { attemptId: a.attemptId });
  emit('reward', { attemptId: a.attemptId, amount: 1, type: 'Hint' });
  emit('reward', { attemptId: a.attemptId, amount: 1, type: 'Hint' });
  expect(a.reward).toHaveBeenCalledOnce(); reject(new Error('close failed')); await vi.advanceTimersByTimeAsync(0);
  expect(a.ads.getRewardedState()).toBe('showing');
  emit('closed', { attemptId: a.attemptId }); expect(await a.pending).toBe('rewarded'); expect(a.reward).toHaveBeenCalledOnce();
});
it('close without reward gives nothing and prepares the next ad', async () => {
  const a = await start(); emit('closed', { attemptId: a.attemptId });
  expect(await a.pending).toBe('not_earned'); expect(a.reward).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(0); expect(sdk.prepare).toHaveBeenCalledTimes(2);
});
it('late reward after dismissal pays the same attempt exactly once', async () => {
  const a = await start(); emit('closed', { attemptId: a.attemptId }); expect(await a.pending).toBe('not_earned');
  emit('reward', { attemptId: a.attemptId, amount: 1, type: 'Hint' }); emit('reward', { attemptId: a.attemptId, amount: 1, type: 'Hint' });
  expect(a.reward).toHaveBeenCalledOnce();
});
it.each([{ amount: 2, type: 'Hint' }, { amount: 1, type: 'Coins' }, { amount: 0, type: 'Hint' }, {}, { amount: 1, type: 'Hint', attemptId: 'old' }])('rejects invalid or foreign reward %j', async payload => {
  const a = await start(); emit('reward', { attemptId: a.attemptId, ...payload });
  emit('closed', { attemptId: a.attemptId }); expect(await a.pending).toBe('not_earned'); expect(a.reward).not.toHaveBeenCalled();
});
it('show promise reward flag alone is not a reward event', async () => {
  sdk.show.mockImplementation(async (o: { attemptId: string }) => ({ patched: true, rewarded: true, attemptId: o.attemptId }));
  const a = await start(); expect(await a.pending).toBe('not_earned'); expect(a.reward).not.toHaveBeenCalled();
});
it('load error gives no reward and frees the UI', async () => {
  sdk.prepare.mockRejectedValueOnce(new Error('no fill')); const ads = await import('./admob'); const reward = vi.fn();
  expect(await ads.showOptionalRewarded({ onReward: reward })).toBe('failed'); expect(reward).not.toHaveBeenCalled();
  expect(ads.getRewardedState()).toBe('idle'); expect(sdk.show).not.toHaveBeenCalled();
});
it('load timeout keeps native loading owned; a late load never shows an unsolicited ad', async () => {
  let resolve: (o: object) => void = () => {}; sdk.prepare.mockImplementation(() => new Promise(r => { resolve = r; }));
  const ads = await import('./admob'); const reward = vi.fn(); const pending = ads.showOptionalRewarded({ onReward: reward });
  await vi.advanceTimersByTimeAsync(10001); expect(await pending).toBe('failed'); expect(reward).not.toHaveBeenCalled();
  const again = ads.preloadRewarded(); resolve({}); expect(await again).toBe(true);
  expect(sdk.prepare).toHaveBeenCalledOnce(); expect(sdk.show).not.toHaveBeenCalled();
});
it('double taps and other fullscreen formats cannot overlap; open timeout never releases native ownership', async () => {
  const a = await start(); expect(await a.ads.showOptionalRewarded()).toBe('busy');
  expect(await a.ads.showPostMatchInterstitial()).toBe('busy'); expect(await a.ads.showAdPrivacyOptions()).toBe(false);
  await vi.advanceTimersByTimeAsync(20001); expect(await a.pending).toBe('pending');
  expect(a.ads.getRewardedState()).toBe('waiting'); expect(await a.ads.showOptionalRewarded()).toBe('busy');
  emit('opened', { attemptId: a.attemptId }); emit('reward', { attemptId: a.attemptId, amount: 1, type: 'Hint' });
  expect(a.reward).toHaveBeenCalledOnce(); emit('closed', { attemptId: a.attemptId }); await vi.advanceTimersByTimeAsync(0);
  expect(a.ads.getRewardedState()).toBe('idle'); expect(sdk.show).toHaveBeenCalledOnce();
});
it('SDK presentation failure without reward gives no hint', async () => {
  const a = await start(); emit('failed', { attemptId: a.attemptId });
  expect(await a.pending).toBe('failed'); expect(a.reward).not.toHaveBeenCalled();
});
it('backgrounded app never starts presentation after a pending load', async () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  const ads = await import('./admob'); const reward = vi.fn(); expect(await ads.showOptionalRewarded({ onReward: reward })).toBe('unavailable');
  expect(sdk.show).not.toHaveBeenCalled(); expect(reward).not.toHaveBeenCalled(); vi.restoreAllMocks();
});
it('privacy changes invalidate Rewarded inventory and UMP denial prevents reloading it', async () => {
  const ads = await import('./admob'); expect(await ads.preloadRewarded()).toBe(true);
  expect(await ads.showAdPrivacyOptions()).toBe(true);
  expect(await ads.preloadRewarded()).toBe(true); expect(sdk.prepare).toHaveBeenCalledTimes(2);
  sdk.eligible = false; expect(await ads.showAdPrivacyOptions()).toBe(true);
  expect(await ads.preloadRewarded()).toBe(false); expect(sdk.prepare).toHaveBeenCalledTimes(2);
});
it('App Open cannot appear while Rewarded owns fullscreen presentation', async () => {
  const a = await start(); expect(await a.ads.showAppOpenAd()).toBe(false);
  emit('closed', { attemptId: a.attemptId }); expect(await a.pending).toBe('not_earned');
});