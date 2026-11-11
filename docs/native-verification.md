# Mr.B. Sudoku — native readiness

This document replaces an inherited Ludo report. Previous statements here about online matches, QR codes, push, a specific Apple team or successful Ludo tests were not evidence for Sudoku.

## Current app
Sudoku plays locally from `dist-native` with 40 languages, saved games, per-level statistics and an app-owned anonymous identity. Profile pictures use an HTML file picker and the existing local/avatar synchronization. There is no camera plugin, QR game flow, push capability or push entitlement. The app identifier is `se.shiningdays.mrbsudoku`, version 1.0.0 (1) and the Apple team is intentionally empty.

## Localized iOS questions
`scripts/ios-permission-copy.js` holds tracking and photo-library explanations in all 40 languages. `scripts/ios-permission-localizations.js` creates and registers native resources. `native:sync:ios` refreshes them, and `native:verify` checks their registration and content. These questions follow iOS's preferred app language; changing language inside Sudoku does not itself change iOS system dialogs. Google's UMP form remains SDK-controlled.

## Verification sequence
```sh
bun install --frozen-lockfile
bun run test
bun run native:web
bun run native:sync:android
bun run native:sync:ios
bun run native:verify
```
`bun run native:verify --source-only` checks source configuration without claiming packaged assets or native compilation.

## Not verified by source checks
A real iOS/Android build, installed-app offline launch, Keychain/Keystore persistence, system image picker, localized ATT wording, Google consent form and actual ad presentation require the relevant toolchains and real devices. Signing and store approval require Sudoku's own approved identifiers and the owner's accounts. No signing or publishing is performed automatically.

See [native-configuration-audit.md](native-configuration-audit.md) for current configuration and release limits. Never reuse Ludo/Yatzy identities, credentials or test results as Sudoku's own.
