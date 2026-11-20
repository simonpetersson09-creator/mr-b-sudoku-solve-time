import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('Android foreground artwork stays inside the 66dp safe circle at every density', () => {
  for (const [density, scale] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]] as const) {
    const source = `resources/android/res/mipmap-${density}/ic_launcher_foreground.png`;
    const native = `android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`;
    expect(readFileSync(native).equals(readFileSync(source))).toBe(true);
    const layer = 108 * scale;
    const info = execFileSync('magick', [source, '-format', '%w %h', 'info:'], { encoding: 'utf8' });
    expect(info).toBe(`${layer} ${layer}`);
    // No alpha may exist outside the safe circle, irrespective of launcher mask.
    const outside = execFileSync('magick', [source, '-alpha', 'extract',
      '(', '-size', `${layer}x${layer}`, 'xc:white', '-fill', 'black',
      '-draw', `circle ${layer / 2},${layer / 2} ${layer / 2},${(108 - 66) * scale / 2}`, ')',
      '-compose', 'Multiply', '-composite', '-format', '%[fx:maxima]', 'info:',
    ], { encoding: 'utf8' });
    expect(Number(outside), density).toBe(0);
    const alpha = execFileSync('magick', [source, '-alpha', 'extract', '-format', '%[fx:mean]', 'info:'], { encoding: 'utf8' });
    expect(Number(alpha), density).toBeGreaterThan(0.2);
  }
});