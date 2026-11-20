import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// The adaptive foreground is a full-bleed 108dp layer carrying the original
// icon's own background gradient, with the artwork inside the 66dp safe
// circle, so the launcher mask never reveals artwork cut-off or a seam.

it('Android foreground keeps only dark background outside the 66dp safe circle at every density', () => {
  for (const [density, scale] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]] as const) {
    const source = `resources/android/res/mipmap-${density}/ic_launcher_foreground.png`;
    const native = `android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`;
    expect(readFileSync(native).equals(readFileSync(source))).toBe(true);
    const layer = 108 * scale;
    const info = execFileSync('magick', [source, '-format', '%w %h', 'info:'], { encoding: 'utf8' });
    expect(info).toBe(`${layer} ${layer}`);
    // Keep only pixels outside the safe circle and measure the brightest
    // one: the blurred teal gradient stays dark, so any bright pixel out
    // there is artwork leaking past the safe circle.
    const outside = execFileSync('magick', [source,
      '(', '-size', `${layer}x${layer}`, 'xc:none', '-fill', 'white',
      '-draw', `circle ${layer / 2},${layer / 2} ${layer / 2},${(108 - 66) * scale / 2}`, ')',
      '-compose', 'DstOut', '-composite',
      '-background', 'black', '-alpha', 'remove', '-alpha', 'off',
      '-colorspace', 'Gray', '-format', '%[fx:maxima]', 'info:',
    ], { encoding: 'utf8' });
    expect(Number(outside), density).toBeLessThan(0.35);
    // The centre must contain real artwork (not a flat layer).
    const centre = execFileSync('magick', [source, '-alpha', 'off',
      '-gravity', 'center', '-crop', `${66 * scale}x${66 * scale}+0+0`, '+repage',
      '-colorspace', 'Gray', '-format', '%[fx:standard_deviation]', 'info:',
    ], { encoding: 'utf8' });
    expect(Number(centre), density).toBeGreaterThan(0.05);
  }
});
