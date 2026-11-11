const JOURNAL = 'mrb-sudoku:v1:storage-transaction';
type Writes = Record<string, string | null>;
export const JOURNAL_QUARANTINE = JOURNAL + ':quarantine';
function valid(raw: string): Writes | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const [key, v] of Object.entries(value)) {
    if (!key.startsWith('mrb-sudoku:v1:') || key === JOURNAL || key === JOURNAL_QUARANTINE || (v !== null && typeof v !== 'string')) return null;
  }
  return value as Writes;
}
/** A valid intent stays authoritative; an unreadable one is quarantined so the last durable keys are used again. */
function pending(): Writes | null {
  const raw = localStorage.getItem(JOURNAL);
  if (!raw) return null;
  const intent = valid(raw);
  if (intent) return intent;
  try { localStorage.setItem(JOURNAL_QUARANTINE, raw.slice(0, 200_000)); } catch { /* quarantine copy is best effort */ }
  try { localStorage.removeItem(JOURNAL); } catch { /* reads still ignore it below */ }
  return null;
}
/** The durable intent is authoritative until every legacy key has been copied. */
export function readPlayerStorage(key: string): string | null {
  const intent = pending();
  if (intent && Object.hasOwn(intent, key)) return intent[key];
  return localStorage.getItem(key);
}
function apply(intent: Writes) {
  for (const [key, value] of Object.entries(intent)) {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  }
  localStorage.removeItem(JOURNAL);
}
export function transactPlayerStorage(values: Record<string, unknown>) {
  const old = pending();
  if (old) apply(old); // No new result may overwrite a partially applied result.
  const intent: Writes = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === undefined ? null : k === 'mrb-sudoku:v1:active-game-id' && typeof v === 'string' ? v : JSON.stringify(v)]));
  localStorage.setItem(JOURNAL, JSON.stringify(intent)); // Atomic commit point; quota failure leaves old data untouched.
  try { apply(intent); } catch { /* durable intent remains and all reads see the committed data */ }
}