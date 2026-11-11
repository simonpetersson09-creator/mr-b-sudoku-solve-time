import { afterEach, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ log: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('./online.functions', () => ({ logEvent: calls.log }));
vi.mock('./telemetry', () => ({ deviceId: () => 'phone', platform: () => 'ios' }));
vi.mock('./report', () => ({ appVersion: async () => '1.0 (1)' }));
import { startActivityTracking } from './activity';
afterEach(() => { vi.useRealTimers(); calls.log.mockClear(); });
it('native pause while document remains visible excludes background and duplicates', async () => {
  vi.useFakeTimers();vi.setSystemTime(10000);
  const tracker = startActivityTracking();tracker.ready();await vi.advanceTimersByTimeAsync(6000);
  window.dispatchEvent(new Event('mrb-sudoku:pause'));await vi.advanceTimersByTimeAsync(60000);
  window.dispatchEvent(new Event('mrb-sudoku:pause'));await vi.advanceTimersByTimeAsync(60000);
  expect(calls.log.mock.calls.at(-1)?.[0].data.detail.seconds).toBe(6);
  window.dispatchEvent(new Event('mrb-sudoku:resume'));await vi.advanceTimersByTimeAsync(6000);
  tracker.stop();await vi.advanceTimersByTimeAsync(0);
  expect(calls.log.mock.calls.at(-1)?.[0].data.detail.seconds).toBe(12);
});