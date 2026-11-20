// Android adaptive layers are 108dp; the guaranteed safe circle is 66dp.
// Keep the entire existing circular artwork at 60dp, including animation margin.
export const ADAPTIVE_LAYER_DP = 108;
export const ADAPTIVE_ARTWORK_DP = 60;
// The layer is filled with the artwork's own edge teal, and the circular
// artwork's edge is feathered over several dp, so its gradient fades
// gradually into the background — no hard line, no lighter ring.
export const ADAPTIVE_EDGE_BG = '#002431';

export function adaptiveIconArgs(source, output, scale) {
  const layer = Math.round(ADAPTIVE_LAYER_DP * scale);
  const artwork = Math.round(ADAPTIVE_ARTWORK_DP * scale);
  const center = artwork / 2;
  const feather = Math.max(4, Math.round(6 * scale));
  return [
    '-size', `${layer}x${layer}`, `xc:${ADAPTIVE_EDGE_BG}`,
    '(', source, '-colorspace', 'sRGB', '-resize', `${artwork}x${artwork}`,
    '(', '-size', `${artwork}x${artwork}`, 'xc:none', '-fill', 'white',
    '-draw', `circle ${center},${center} ${center},0`,
    '-blur', `0x${feather}`, ')',
    '-alpha', 'set', '-compose', 'DstIn', '-composite', ')',
    '-gravity', 'center', '-compose', 'Over', '-composite',
    '-alpha', 'off', '-depth', '8', output,
  ];
}