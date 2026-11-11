import { expect, it } from 'vitest';
import { appRetention } from './retention';
const event = (user_id: string, created_at: string, platform = 'ios') => ({ user_id, created_at, platform, kind: 'session', device_id: user_id, detail: {} });
it('counts nonreturners and requires an exact return day, not a later last_seen', () => {
  const events = [event('a', '2026-09-01T10:00:00Z'), event('b', '2026-09-01T10:00:00Z'), event('c', '2026-09-01T10:00:00Z'), event('a', '2026-09-02T10:00:00Z'), event('a', '2026-09-08T10:00:00Z'), event('a', '2026-10-01T10:00:00Z'), event('c', '2026-10-10T10:00:00Z'), event('web', '2026-09-01T10:00:00Z', 'web')];
  expect(appRetention(events, new Set(['a', 'b', 'c', 'web']), Date.parse('2026-11-11T10:00:00Z'))).toEqual({ players: 3, d1: 33, d7: 33, d30: 33 });
});
it('uses Stockholm calendar dates and excludes target days not yet finished', () => {
  const events = [event('a', '2026-11-09T22:30:00Z'), event('a', '2026-11-09T23:30:00Z')];
  expect(appRetention(events, new Set(['a']), Date.parse('2026-11-11T10:00:00Z')).d1).toBe(100);
  expect(appRetention(events, new Set(['a']), Date.parse('2026-11-10T10:00:00Z')).d1).toBeNull();
});