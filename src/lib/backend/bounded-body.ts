export const MAX_NATIVE_BODY_BYTES = 200_000;
export const MAX_NATIVE_ACTION_BYTES = 12_000;
export class BodyTooLarge extends Error {}

/** Bound bytes while streaming, rather than allocating an unbounded request.text(). */
export async function readNativeBody(request: Request): Promise<{ text: string; bytes: number }> {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > MAX_NATIVE_BODY_BYTES) throw new BodyTooLarge();
  const reader = request.body?.getReader();
  if (!reader) return { text: '', bytes: 0 };
  const decoder = new TextDecoder();
  let text = '', bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_NATIVE_BODY_BYTES) { await reader.cancel(); throw new BodyTooLarge(); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return { text: text + decoder.decode(), bytes };
  } finally { reader.releaseLock(); }
}