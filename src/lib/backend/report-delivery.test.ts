import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ log: vi.fn() }));
vi.mock('./online.functions', () => ({ logEvent: mocks.log }));
vi.mock('./telemetry', () => ({ deviceId: () => 'android-a', platform: () => 'android' }));
const key = 'mrb-sudoku:v1:report-queue';
beforeEach(() => { vi.resetModules(); localStorage.clear(); vi.useFakeTimers(); mocks.log.mockReset(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it('a report queued while delivery awaits is preserved and acknowledged individually', async () => {
  let acknowledge: (() => void) | undefined;
  mocks.log.mockImplementationOnce(() => new Promise<void>(r => { acknowledge = r; })).mockRejectedValue(new Error('offline'));
  localStorage.setItem(key, JSON.stringify([{ id: 'a', kind: 'local_game', detail: { gid: 'a', phase: 'finish', level: 'easy' }, at: Date.now() }]));
  const m = await import('./report'); const pending = m.flushQueuedReports();
  await vi.waitFor(() => expect(mocks.log).toHaveBeenCalledOnce());
  m.reportLocalGame('finish', { id: 'b', level: 'easy' });
  acknowledge?.(); await vi.advanceTimersByTimeAsync(550); await pending;
  const q = JSON.parse(localStorage.getItem(key) ?? '[]');
  expect(q).toHaveLength(1); expect(q[0].detail.gid).toBe('b');
});
it('retains more than 40 game reports per session beyond seven days, separately from diagnostics', async () => {
  mocks.log.mockRejectedValue(new Error('offline'));
  const m = await import('./report');
  for (let n = 0; n < 100; n++) m.reportLocalGame('finish', { id: `g-${n}`, level: 'easy' });
  await vi.advanceTimersByTimeAsync(0);
  const { parseQueue } = await import('./report-queue');
  expect(parseQueue(localStorage.getItem(key), Date.now() + 30 * 86400000)).toHaveLength(100);
});
it('delivers the original finish time after a month boundary', async () => {
  mocks.log.mockResolvedValue({ ok: true });
  const at = Date.parse('2026-10-31T22:30:00Z');
  localStorage.setItem(key, JSON.stringify([{ id: 'old', kind: 'local_game', detail: { gid: 'g', phase: 'finish', level: 'easy' }, at }]));
  const m = await import('./report'); await m.flushQueuedReports();
  expect(mocks.log.mock.calls[0][0].data.detail.occurredAt).toBe('2026-10-31T22:30:00.000Z');
  expect(localStorage.getItem(key)).toBeNull();
});