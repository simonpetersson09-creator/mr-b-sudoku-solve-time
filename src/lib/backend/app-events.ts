/** Low-volume app events shared with Yatzy where the same feature exists in Sudoku. */
export const APP_EVENT_NAMES = [
  "settings_opened",
  "stats_opened",
  "language_changed",
  "ad_privacy_opened",
] as const;

export type AppEventName = (typeof APP_EVENT_NAMES)[number];

export function isAppEventName(value: unknown): value is AppEventName {
  return typeof value === "string" && (APP_EVENT_NAMES as readonly string[]).includes(value);
}
