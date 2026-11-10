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

# Mr.B. Sokudo architecture

- Standalone app: never share code, storage, backend, ad or native identities with Mr. B Ludo or Mr. B Yatzy; shared ideas are copied, never linked.
- Sudoku rules live in `src/lib/sudoku/engine.ts` as pure functions (no React/DOM/network); generation is seeded, always verifies exactly one solution, and levels are checked by `solvableBySingles` (Easy/Medium yes, Hard/Expert no).
- All play is local against the computer; there is no online play, matchmaking, friends, leaderboards or push, so the backend holds only profiles, roles, app events and admin activity.
- Saved games (max 10) and per-level statistics live in browser/device storage under the `mrb-sudoku:v1:` namespace; "played" counts finished games only and each game id is counted once.
- Board styling uses `--sudoku-*` tokens in `src/styles.css`; components never hardcode colors.
- `noUncheckedIndexedAccess` is off: the engine indexes fixed-size 81-cell arrays heavily.
- i18n lives in `src/lib/i18n/`: sv.ts is the key source of truth; every one of the 40 dictionaries must have identical keys and placeholders and no unused keys (enforced by `i18n.test.ts`). Server functions throw stable `err:<code>` strings translated by `errorMessage()`.
- App-owned auth goes through `src/lib/auth/client.ts` (anonymous identity; namespaced Keychain/Keystore storage on native); startup never discards a saved identity on storage/network failure, and server middleware verifies every private request.
- Admin access is granted only by the server-secret PIN (rate-limited, constant-time) to the caller's own anonymous identity; admin UI never signs out.
- Admin activity: durable device number, per-visit heartbeats, `local_game` reports, Stockholm days in pure `activity-stats.ts`; app errors/ad events reach admin only via `src/lib/backend/report.ts` → `app_events`.
- The published website is download-only (`src/server.ts` + pure `src/lib/web-access.ts`); preview hosts and native origins are never gated.
- Capacitor launches the `dist-native` static bundle from `vite.native.config.ts`, so local play needs no server; native projects contain no signing credentials, and build scripts never publish.
- Native app ID is a temporary placeholder and the Apple team is intentionally empty until the owner supplies real values; `scripts/native.mjs` and `config.test.ts` enforce this and the absence of push.
- Ads are the AdMob/UMP flow in `src/lib/ads/` (App Open + post-game interstitial) and must use only Google's sample IDs until the app has its own AdMob account (enforced by `sokudo-ads.test.ts`).
- AndroidBackButton is the only owner of native back events; leaving a game via back returns home because games save continuously.
- App icon/splash source is `resources/icon.png`; `scripts/make-icons.mjs` regenerates committed `resources/` and `scripts/set-native-icons.mjs` copies them into the native projects.
- DB integration tests (`*.db.test.ts`, `bun run test:db`) run only against a throwaway local PostgreSQL+PostgREST, never the live backend.
