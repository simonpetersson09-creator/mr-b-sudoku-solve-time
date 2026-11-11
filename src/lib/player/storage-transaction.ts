const JOURNAL = 'mrb-sudoku:v1:storage-transaction';
type Writes = Record<string, string | null>;
function pending(): Writes | null {
  const raw = localStorage.getItem(JOURNAL);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('err:bad_action');
  for (const [key, v] of Object.entries(value)) {
    if (!key.startsWith('mrb-sudoku:v1:') || key === JOURNAL || (v !== null && typeof v !== 'string')) throw new Error('err:bad_action');
  }
  return value as Writes;
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