/** Never silently replace a native production App ID with Google's sample. */
export const SAMPLE_APP_IDS = {
  ios: 'ca-app-pub-3940256099942544~1458002511',
  android: 'ca-app-pub-3940256099942544~3347511713',
};

export function configuredAppId(source, platform) {
  const config = source.match(/export const ADMOB_IDS\b[\s\S]*?=\s*\{([\s\S]*?)\n\};/)?.[1];
  if (!config) throw new Error('Cannot read ADMOB_IDS; refusing to change native app IDs');
  const match = config.match(new RegExp(`${platform}:\\s*\\{\\s*appId:\\s*(null|['\"]([^'\"]+)['\"])`));
  if (!match) throw new Error(`Cannot read ${platform} AdMob App ID`);
  return match[2] ?? null;
}

export function selectAppId(platform, configured, existing) {
  const valid = /^ca-app-pub-\d{16}~\d{10}$/;
  for (const id of [configured, existing]) {
    if (id && !valid.test(id)) throw new Error(`Invalid ${platform} AdMob App ID; refusing to overwrite`);
  }
  const production = id => Boolean(id && !id.startsWith('ca-app-pub-3940256099942544~'));
  if (production(existing)) {
    if (production(configured) && configured !== existing) throw new Error(`${platform} AdMob production ID conflict; resolve explicitly before sync`);
    return existing;
  }
  return configured || SAMPLE_APP_IDS[platform];
}