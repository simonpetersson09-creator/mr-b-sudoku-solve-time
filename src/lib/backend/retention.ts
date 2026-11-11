import { stockholmDate, type ActivityEvent } from './activity-stats';

type UserActivity = ActivityEvent & { user_id: string | null };
const dayNumber = (at: string | number) => Date.parse(stockholmDate(at)) / 86400000;
/** Dn = an app user returning on exactly the nth Stockholm day after first app activity.
 * Denominator includes nonreturners and only users whose target day has fully elapsed.
 * Caller filters test identities/devices and the reporting reset boundary first.
 */
export function appRetention(events: UserActivity[], profileIds: Set<string>, now: number) {
  const visits = new Map<string, Set<number>>();
  for (const e of events) {
    if (!e.user_id || !profileIds.has(e.user_id) || !['ios', 'android'].includes(e.platform ?? '') || !['session', 'heartbeat', 'session_end', 'local_game'].includes(e.kind)) continue;
    const day = dayNumber(e.created_at);
    if (!Number.isFinite(day) || Date.parse(e.created_at) > now) continue;
    const days = visits.get(e.user_id) ?? new Set<number>(); days.add(day); visits.set(e.user_id, days);
  }
  const today = dayNumber(now);
  const retention = (n: number) => {
    let eligible = 0, returned = 0;
    for (const days of visits.values()) {
      let first = Infinity;
      for (const day of days) first = Math.min(first, day);
      const target = first + n;
      if (target >= today) continue;
      eligible++;
      if (days.has(target)) returned++;
    }
    return eligible ? Math.round(100 * returned / eligible) : null;
  };
  return { players: visits.size, d1: retention(1), d7: retention(7), d30: retention(30) };
}