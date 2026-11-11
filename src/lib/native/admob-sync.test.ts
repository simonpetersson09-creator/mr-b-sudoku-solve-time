import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { configuredAppId, selectAppId, SAMPLE_APP_IDS } from '../../../scripts/admob-app-id.js';

// Synthetic IDs are test fixtures only; they are never installed in app configuration.
const production = 'ca-app-pub-1111111111111111~1111111111';
const other = 'ca-app-pub-2222222222222222~2222222222';

describe.each(['ios', 'android'] as const)('%s App ID safety', platform => {
  it('preserves a native production ID when app config still uses samples', () => {
    expect(selectAppId(platform, SAMPLE_APP_IDS[platform], production)).toBe(production);
  });
  it('preserves a native production ID when app config is empty', () => {
    expect(selectAppId(platform, null, production)).toBe(production);
  });
  it('uses a configured production ID instead of the sample', () => {
    expect(selectAppId(platform, production, SAMPLE_APP_IDS[platform])).toBe(production);
  });
  it('stops on conflicting production IDs', () => {
    expect(() => selectAppId(platform, other, production)).toThrow('conflict');
  });
  it('keeps the platform sample until external IDs are supplied', () => {
    expect(selectAppId(platform, null, undefined)).toBe(SAMPLE_APP_IDS[platform]);
  });
  it('fails closed on unreadable or invalid configuration', () => {
    expect(() => configuredAppId('broken config', platform)).toThrow();
    expect(() => selectAppId(platform, 'invalid', production)).toThrow();
  });
  it('reads the actual platform config, not the earlier test-ID block', () => {
    expect(configuredAppId(readFileSync('src/lib/ads/admob.ts', 'utf8'), platform)).toBe(SAMPLE_APP_IDS[platform]);
  });
  it('runs the actual sync script twice without overwriting production or restoring camera permission', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sudoku-admob-sync-'));
    try {
      cpSync('scripts', join(dir, 'scripts'), { recursive: true });
      mkdirSync(join(dir, 'src/lib/ads'), { recursive: true });
      cpSync('src/lib/ads/admob.ts', join(dir, 'src/lib/ads/admob.ts'));
      const file = platform === 'ios' ? 'ios/App/App/Info.plist' : 'android/app/src/main/AndroidManifest.xml';
      mkdirSync(join(dir, platform === 'ios' ? 'ios/App/App' : 'android/app/src/main'), { recursive: true });
      let initial = readFileSync(file, 'utf8').replace(SAMPLE_APP_IDS[platform], production);
      if (platform === 'ios') initial = initial.replace('<dict>', '<dict><key>NSCameraUsageDescription</key><string>Old QR camera</string>');
      writeFileSync(join(dir, file), initial);
      const script = platform === 'ios' ? 'set-ios-admob-plist.js' : 'set-android-admob-manifest.js';
      const run = () => spawnSync(process.execPath, [join(dir, 'scripts', script)], { cwd: dir, encoding: 'utf8' });
      expect(run().status).toBe(0);
      const result = readFileSync(join(dir, file), 'utf8');
      expect(result).toContain(production);
      expect(result).not.toContain(SAMPLE_APP_IDS[platform]);
      expect(result).not.toContain('NSCameraUsageDescription');
      expect(run().status).toBe(0);
      expect(readFileSync(join(dir, file), 'utf8')).toBe(result);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});