/** Ads: Yatzy-ported AdMob flow in `src/lib/ads/` (Google test IDs until Sokudo has its own). No push. */
export const nativeServices = Object.freeze({
  advertising: { enabled: true, provider: "admob", platforms: ["ios", "android"] as const },
  push: { enabled: false, registerOnLaunch: false, platforms: [] as const },
});
