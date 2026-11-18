/** Pure helpers for the offline report queue (no DOM/network) so they can be tested. */
export type QueuedReport = { id?: string; kind: "error" | "ad" | "app" | "local_game"; detail: Record<string, unknown>; at: number };

export const REPORT_QUEUE_MAX = 30;
/** Older reports are dropped: they no longer help and must not pile up forever. */
export const REPORT_QUEUE_MAX_AGE_MS = 7 * 24 * 3600_000;
const isKind = (value: unknown): value is QueuedReport["kind"] => value === "error" || value === "ad" || value === "app" || value === "local_game";

export function parseQueue(raw: string | null, now: number): QueuedReport[] {
  try {
    const list = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(list)) return [];
    const valid = list.filter((r): r is QueuedReport =>
      !!r && isKind((r as QueuedReport).kind) && Number.isFinite((r as QueuedReport).at) && (r as QueuedReport).at >= 0
      && (r as QueuedReport).detail !== null && typeof (r as QueuedReport).detail === "object" && !Array.isArray((r as QueuedReport).detail)
      && ((r as QueuedReport).kind === 'local_game' || now - (r as QueuedReport).at < REPORT_QUEUE_MAX_AGE_MS),
    ).map((r, i) => ({ ...r, id: typeof r.id === 'string' ? r.id : `legacy:${r.at}:${i}:${r.kind}` }));
    const diagnosticIds = new Set(valid.filter(r => r.kind !== 'local_game').slice(-REPORT_QUEUE_MAX).map(r => r.id));
    return valid.filter(r => r.kind === 'local_game' || diagnosticIds.has(r.id));
  } catch { return []; }
}

export function enqueue(queue: QueuedReport[], item: QueuedReport): QueuedReport[] {
  if (item.kind === 'local_game' && queue.some(r => r.kind === 'local_game' && r.detail['gid'] === item.detail['gid'] && r.detail['phase'] === item.detail['phase'])) return queue;
  const all = [...queue, item];
  const diagnostics = all.filter(r => r.kind !== 'local_game').slice(-REPORT_QUEUE_MAX);
  return all.filter(r => r.kind === 'local_game' || diagnostics.includes(r));
}
