<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Mr.B. Sudoku architecture

- Standalone app: never share code, storage, backend, ad or native identities with Mr. B Ludo or Mr. B Yatzy; shared ideas are copied, never linked.
- Sudoku rules live in `src/lib/sudoku/engine.ts` as pure functions (no React/DOM/network); generation is seeded, always verifies exactly one solution, and every level is gated by a solver that must fail on it: `solvableBySingles` for Easy/Medium (must be solvable by singles) and Hard/Expert (must not be), `solvableWithPairs` for Ultra, `solvableAdvanced` for Impossible, `solvableMaster` for Master (singles, pointing/claiming, subsets to four, X-Wing/Swordfish, simple coloring).
- All play is local against the computer; there is no online play, matchmaking, friends or push. The only shared list is "Månadens flitigaste", computed by `get_monthly_most_active` from app-only `local_game` finish reports (distinct game id, Stockholm month, test devices excluded).
- Saved games (max 10) and per-level statistics live in browser/device storage under the `mrb-sudoku:v1:` namespace; "played" counts finished games only and each game id is counted once.
- Board styling uses `--sudoku-*` tokens in `src/styles.css`; components never hardcode colors.
- Board cells are memoized with primitive visual props and a stable selection callback so clock ticks do not re-render all 81 cells.
- Normalize legacy gameplay-help settings on both reads and writes; hidden choices must not preserve different game behavior across devices.
- Validate saved puzzle/solution, note masks, undo entries and counters before exposing a game to play; reject corrupt entries individually while retaining the legacy missing-undo-allowance migration.
- Keep finished-game IDs without eviction in the existing local ledger so yearly/all-time statistics and unlock progress cannot recount older results.
- Native background and document hiding share synchronous pause-and-save handling; foreground never resumes play without an explicit player action, and duplicate lifecycle signals cannot charge the clock twice.
- `noUncheckedIndexedAccess` is off: the engine indexes fixed-size 81-cell arrays heavily.
- i18n lives in `src/lib/i18n/`: sv.ts is the key source of truth; every one of the 40 dictionaries must have identical keys and placeholders and no unused keys (enforced by `i18n.test.ts`). Server functions throw stable `err:<code>` strings translated by `errorMessage()`.
- Automatic language choices re-detect device preferences on languagechange/native resume; manual and legacy choices win, and the document language follows the translated UI for screen readers.
- Tablet play uses bounded portrait width and separate board/control columns in wide landscape; board sizing remains measured from available space so phone and split-screen layouts stay contained.
- App-owned auth goes through `src/lib/auth/client.ts` (anonymous identity; namespaced Keychain/Keystore storage on native); startup never discards a saved identity on storage/network failure, and server middleware verifies every private request.
- Admin access is granted only by the server-secret PIN (rate-limited, constant-time) to the caller's own anonymous identity; admin UI never signs out.
- Admin activity: durable device number, per-visit heartbeats, `local_game` reports, Stockholm days in pure `activity-stats.ts`; app errors/ad events reach admin only via `src/lib/backend/report.ts` → `app_events`.
- The published website is download-only (`src/server.ts` + pure `src/lib/web-access.ts`); preview hosts and native origins are never gated.
- Capacitor launches the `dist-native` static bundle from `vite.native.config.ts`, so local play needs no server; native projects contain no signing credentials, and build scripts never publish.
- Native packaging redirects every backend-function import spelling to `src/lib/native/online-client.ts`; it sends the app-owned session bearer to Sudoku's authenticated native endpoint, mirrors all web operations, and imports server types only to keep privileged code out of both platform bundles.
- Native identity/version must agree across Capacitor, both platform projects and verification tests; the Apple team stays empty until supplied, so unsigned preparation cannot silently become a release build.
- Ads use the existing AdMob/UMP/ATT flow in `src/lib/ads/`; hint offers use tagged SDK Rewarded events and a one-shot game-bound claim persisted at the reward boundary, because dismissal and resolved show promises are not rewards. Fullscreen ownership survives timeouts until SDK closure; result exits are deduplicated by game ID and startup is guarded per launch. Production uses approved platform-specific Sudoku units; development uses Google's samples and unconfigured Rewarded platforms stay disabled.
- AndroidBackButton is the only owner of native back events; leaving a game via back returns home because games save continuously.
- App icon/splash source is `resources/icon.png`; `scripts/make-icons.mjs` regenerates committed `resources/` and `scripts/set-native-icons.mjs` copies them into the native projects.
- Native AdMob sync scripts share a conservative App ID selector: preserve production IDs and reject conflicts or unreadable configuration, preventing sample IDs from replacing production configuration.
- DB integration tests (`*.db.test.ts`, `bun run test:db`) run only against a throwaway local PostgreSQL+PostgREST, never the live backend.
- All new-game entry points use the browser worker generation helper; prepared puzzles are consumed once and start timestamps are reset on delivery, keeping solver work off the UI thread without changing the pure engine.
- Generation workers have a bounded lifetime and terminate on every outcome; failures never fall back to synchronous solving, and generation rejects rather than returning a puzzle that fails its level gate.
- Delayed play callbacks are game-ID-bound and cleaned on game replacement/unmount; keyboard and cell input share dialog/background/fullscreen blocking.
- Reports use the existing atomic per-user server counter and strict event validation; database write failures remain failures, and repeat game reports are checked against stored user/game/phase before insertion.
- Admin refresh polls only visible online pages and catches up on foreground/network return, without overlapping requests; activity pagination has no silent cutoff and duplicate game phases count once per identity.
- Home preloads only public local content routes; protected pages and authentication are not part of background navigation warming.
- Native permission copy lives in `scripts/ios-permission-copy.js`; iOS sync regenerates and registers all 40 `InfoPlist.strings` resources so system prompts follow iOS language preferences independently of the in-game language.
- Profile images use the existing HTML file picker and canvas conversion, not a camera plugin or photo-library capability; only the chosen file is read and the existing local/server avatar flow is retained.
