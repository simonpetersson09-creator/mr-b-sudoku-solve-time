import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('native icons and splashes match the existing Sudoku originals exactly', () => {
  const pairs = [
    ['resources/ios/AppIcon.appiconset', 'ios/App/App/Assets.xcassets/AppIcon.appiconset'],
    ['resources/ios/Splash.imageset', 'ios/App/App/Assets.xcassets/Splash.imageset'],
    ['resources/android/res', 'android/app/src/main/res'],
  ];
  let checked = 0;
  for (const [source, destination] of pairs) {
    for (const entry of readdirSync(source, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const relative = join(entry.parentPath.slice(source.length), entry.name);
      expect(readFileSync(join(destination, relative)).equals(readFileSync(join(source, relative))), relative).toBe(true);
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(40);
});