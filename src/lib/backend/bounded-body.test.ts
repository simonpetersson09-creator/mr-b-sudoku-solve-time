import { expect, it } from 'vitest';
import { BodyTooLarge, readNativeBody } from './bounded-body';
it('stops consuming an oversized streaming body at 200000 bytes', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(100001)); }, cancel() { cancelled = true; } });
  const request = new Request('https://example.test', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  await expect(readNativeBody(request)).rejects.toBeInstanceOf(BodyTooLarge);
  expect(cancelled).toBe(true);
});
it('counts UTF-8 bytes rather than string characters', async () => {
  const r = new Request('https://example.test', { method: 'POST', body: 'å'.repeat(6001) });
  expect((await readNativeBody(r)).bytes).toBe(12002);
});
it('rejects an oversized declared body without reading it', async () => {
  const r = new Request('https://example.test', { method: 'POST', headers: { 'content-length': '200001' }, body: 'x' });
  await expect(readNativeBody(r)).rejects.toBeInstanceOf(BodyTooLarge);
});