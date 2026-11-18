import { stockholmDate, type ActivityEvent } from './activity-stats';
type Event = ActivityEvent & { user_id?: string | null };
type Detail = Record<string, unknown>;
const APP = (platform: string | null) => platform === 'ios' || platform === 'android';
const validDevice = (id: string | null): id is string => !!id && id !== 'unknown';
const detail = (event: ActivityEvent): Detail => event.detail && typeof event.detail === 'object' ? event.detail as Detail : {};
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

/** App-only daily metrics. Full visit history supplies first activity and previous-day play. */
export function adminDayMetrics(events: Event[], days: string[]) {
  const active = new Map<string, Map<string, string>>();
  const played = new Map<string, Set<string>>();
  const firstGame = new Map<string, string>();
  const firstActivity = new Map<string, string>();
  for (const event of events) {
    if (!APP(event.platform) || !validDevice(event.device_id)) continue;
    const id = event.device_id;
    const day = stockholmDate(event.created_at);
    const devices = active.get(day) ?? new Map<string, string>();
    devices.set(id, event.platform);
    active.set(day, devices);
    if (!firstActivity.has(id) || day < firstActivity.get(id)!) firstActivity.set(id, day);
    if (event.kind !== 'local_game') continue;
    const dailyPlayers = played.get(day) ?? new Set<string>();
    dailyPlayers.add(id);
    played.set(day, dailyPlayers);
    const user = event.user_id ?? id;
    if (!firstGame.has(user) || day < firstGame.get(user)!) firstGame.set(user, day);
  }
  return new Map(days.map(day => {
    const devices = active.get(day) ?? new Map<string, string>();
    const dailyPlayers = played.get(day) ?? new Set<string>();
    const yesterday = new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    const ages = [...devices.keys()].flatMap(id => {
      const first = firstActivity.get(id);
      return first ? [Math.max(0, dayNumber(day) - dayNumber(first))] : [];
    });
    const avgAppAgeDays = ages.length ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length * 10) / 10 : null;
    return [day, {
      ios: [...devices.values()].filter(platform => platform === 'ios').length,
      android: [...devices.values()].filter(platform => platform === 'android').length,
      played: dailyPlayers.size,
      newPlayers: [...firstGame.values()].filter(first => first === day).length,
      returningPlayed: [...dailyPlayers].filter(id => played.get(yesterday)?.has(id)).length,
      avgAppAgeDays,
    }];
  }));
}

function release(version: unknown): [number, number, number] | null {
  if (typeof version !== 'string') return null;
  const match = /^(\d{1,6})(?:\.(\d{1,6}))?(?:\.(\d{1,6}))?(?: \(\d+\))?$/.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)] : null;
}
const releaseKey = (value: [number, number, number]) => value.join('.');
const compareReleases = (a: [number, number, number], b: [number, number, number]) =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Yatzy's issue-release and completed-post-match rules, applied to Sudoku's app_events. */
export function adminDiagnosticsByDay(events: Event[], days: string[]) {
  const rows = new Map(days.map(day => [day, { issues: 0, issueDevices: 0, postMatchShown: 0, postMatchOpportunities: 0 }]));
  const versions = new Map<string, [number, number, number]>();
  for (const event of events) {
    if (!APP(event.platform)) continue;
    const parsed = release(detail(event)['v']);
    if (parsed) versions.set(releaseKey(parsed), parsed);
  }
  const latest = new Set([...versions.values()].sort(compareReleases).slice(-2).map(releaseKey));
  const issueDevices = new Map<string, Set<string>>();
  const exits = new Map<string, { device: string; match: string; clickedAt: string | undefined; shown: boolean }>();

  for (const event of events) {
    if (!APP(event.platform) || !validDevice(event.device_id)) continue;
    const day = stockholmDate(event.created_at);
    const data = detail(event);
    if (event.kind === 'error' && rows.has(day)) {
      const version = release(data['v']);
      if (version && latest.has(releaseKey(version))) {
        rows.get(day)!.issues++;
        const devices = issueDevices.get(day) ?? new Set<string>();
        devices.add(event.device_id);
        issueDevices.set(day, devices);
      }
    }
    if (event.kind !== 'ad' || data['name'] !== 'post_match_exit' || data['completed'] !== true || typeof data['matchKey'] !== 'string' || !data['matchKey']) continue;
    const key = JSON.stringify([event.device_id, data['matchKey']]);
    const exit = exits.get(key) ?? { device: event.device_id, match: data['matchKey'], clickedAt: undefined, shown: false };
    if (data['result'] === 'clicked' && (!exit.clickedAt || event.created_at < exit.clickedAt)) exit.clickedAt = event.created_at;
    if (data['result'] === 'shown') exit.shown = true;
    exits.set(key, exit);
  }
  for (const [day, devices] of issueDevices) rows.get(day)!.issueDevices = devices.size;
  for (const exit of exits.values()) {
    if (!exit.clickedAt) continue;
    const day = stockholmDate(exit.clickedAt);
    const row = rows.get(day);
    if (!row) continue;
    row.postMatchOpportunities++;
    if (exit.shown) row.postMatchShown++;
  }
  return rows;
}
