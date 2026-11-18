import { expect, it } from 'vitest';
import { adminDayMetrics, adminDiagnosticsByDay } from './admin-day-metrics';

type TestEvent = {
  device_id: string | null;
  user_id?: string | null;
  platform: string;
  kind: string;
  detail: Record<string, unknown>;
  created_at: string;
};
const event = (id: string, day: string, platform = 'ios', kind = 'local_game', detail: Record<string, unknown> = {}): TestEvent =>
  ({ device_id: id, user_id: id, platform, kind, detail, created_at: `${day}T12:00:00Z` });

it('counts distinct app devices, first games and exact previous-day players, never web sessions', () => {
  const events = [event('a', '2026-11-09'), event('a', '2026-11-10'), event('a', '2026-11-10'), event('b', '2026-11-10', 'android'), event('w', '2026-11-10', 'web')];
  const metrics = adminDayMetrics(events, ['2026-11-09', '2026-11-10']);
  expect(metrics.get('2026-11-10')).toEqual({ ios: 1, android: 1, played: 2, newPlayers: 1, returningPlayed: 1, avgAppAgeDays: 0.5 });
});

it('uses full first-activity history and equal device weight for mean app age', () => {
  const events = [
    event('a', '2026-10-01', 'ios', 'session'),
    event('a', '2026-11-10', 'ios', 'session'),
    event('a', '2026-11-10'),
    event('b', '2026-11-10', 'android', 'heartbeat'),
  ];
  expect(adminDayMetrics(events, ['2026-11-10']).get('2026-11-10')?.avgAppAgeDays).toBe(20);
  expect(adminDayMetrics([], ['2026-11-10']).get('2026-11-10')?.avgAppAgeDays).toBeNull();
});

it('counts issues on the two latest releases and deduplicates completed post-match opportunities', () => {
  const day = '2026-11-10';
  const error = (id: string, v: string, platform = 'ios') => event(id, day, platform, 'error', { v });
  const exit = (id: string, matchKey: string, result: string, completed = true, platform = 'ios') =>
    event(id, day, platform, 'ad', { name: 'post_match_exit', matchKey, result, completed });
  const events = [
    error('old', '1.0.0'),
    error('a', '2.0.0 (2)'), error('a', '2.0.0 (2)'), error('b', '2.0.0 (2)', 'android'), error('c', '1.9.0'),
    error('unknown-version', 'unknown'), error('web', '2.0.0', 'web'),
    exit('a', 'game-a', 'clicked'), exit('a', 'game-a', 'shown'), exit('a', 'game-a', 'clicked'),
    exit('b', 'game-a', 'clicked', true, 'android'),
    exit('a', 'unfinished', 'clicked', false), exit('a', 'unfinished', 'shown', false),
    exit('a', 'missing-click', 'shown'), exit('web', 'web-game', 'clicked', true, 'web'),
  ];
  expect(adminDiagnosticsByDay(events, [day]).get(day)).toEqual({ issues: 4, issueDevices: 3, postMatchShown: 1, postMatchOpportunities: 2 });
});
