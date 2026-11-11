/**
 * Patch android/app/src/main/AndroidManifest.xml with the AdMob App ID.
 *
 * Missing com.google.android.gms.ads.APPLICATION_ID is fatal on Android: the
 * Google Mobile Ads SDK crashes the app at startup.
 *
 * The Android App ID is read from ADMOB_IDS.android.appId in src/lib/ads/admob.ts.
 * While it is still null, Google's official SAMPLE App ID is written so debug
 * builds start. Never ship a release with the sample ID.
 *
 * Run after `npx cap add android` / `npx cap sync android`. Idempotent.
 */
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { configuredAppId, selectAppId } from './admob-app-id.js';

const MANIFEST = resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
const ADMOB_TS = resolve(process.cwd(), 'src/lib/ads/admob.ts');
const META = 'com.google.android.gms.ads.APPLICATION_ID';

async function main() {
  if (!existsSync(MANIFEST)) {
    console.error(`[Android manifest] Not found: ${MANIFEST}. Run "npx cap add android" first.`);
    process.exit(1);
  }
  let xml = await readFile(MANIFEST, 'utf8');
  const source = await readFile(ADMOB_TS, 'utf8');
  const existing = xml.match(/<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*android:value="([^"]*)"/)?.[1];
  const appId = selectAppId('android', configuredAppId(source, 'android'), existing);
  const tag = `<meta-data android:name="${META}" android:value="${appId}"/>`;
  const re = new RegExp(`<meta-data\\s+android:name="${META.replace(/\./g, '\\.')}"[^>]*/>`);
  if (re.test(xml)) {
    xml = xml.replace(re, tag);
    console.log('[Android manifest] Updated AdMob App ID.');
  } else {
    xml = xml.replace(/<application([^>]*)>/, `<application$1>\n        ${tag}`);
    console.log('[Android manifest] Added AdMob App ID.');
  }
  await writeFile(MANIFEST, xml);
}

main().catch((e) => { console.error(e); process.exit(1); });
