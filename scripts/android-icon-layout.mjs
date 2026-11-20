// Android adaptive layers are 108dp; the guaranteed safe circle is 66dp.
// Keep the entire existing circular artwork at 60dp, including animation margin.
export const ADAPTIVE_LAYER_DP = 108;
export const ADAPTIVE_ARTWORK_DP = 60;

export function adaptiveIconArgs(source, output, scale) {
  const layer = Math.round(ADAPTIVE_LAYER_DP * scale);
  const artwork = Math.round(ADAPTIVE_ARTWORK_DP * scale);
  const center = artwork / 2;
  return [
    source, '-colorspace', 'sRGB', '-resize', `${artwork}x${artwork}`,
    '(', '-size', `${artwork}x${artwork}`, 'xc:none', '-fill', 'white',
    '-draw', `circle ${center},${center} ${center},0`, ')',
    '-alpha', 'set', '-compose', 'DstIn', '-composite',
    '-compose', 'Over', '-background', 'none', '-gravity', 'center',
    '-extent', `${layer}x${layer}`, '-depth', '8', output,
  ];
}