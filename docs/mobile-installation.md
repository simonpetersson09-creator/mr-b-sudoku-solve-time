# Mr.B. Sudoku — mobile test installation

This replaces inherited Ludo instructions. Sudoku has no push, QR scanning, multiplayer or shared Ludo/Yatzy identity. The approved app identifier is `se.shiningdays.mrbsudoku` (version 1.0.0, build 1); the Apple team stays empty until the owner supplies Sudoku’s approved values. No publication or store signing is automatic.

## Prepare the local package
Use Node.js 22+ and Bun. Internet is required for dependencies, not local Sudoku play.
```sh
bun install --frozen-lockfile
bun run test
bun run native:web
bun run native:sync:android
bun run native:sync:ios
bun run native:verify
```
The iOS sync includes 40 localized tracking/photo explanations. To test these changes on a phone, rebuild, sync and reinstall; refreshing the editor preview does not update native system questions.

## Android
Install JDK 21 and Android SDK 36, configure JAVA_HOME and ANDROID_HOME, then connect a device with USB debugging enabled.
```sh
bun run native:build:android
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
This produces a debug app, not a Play Store release.

## iPhone
Use a Mac with compatible Xcode and iOS tools. `bun run native:build:ios` attempts an unsigned simulator build. `bun run native:open:ios` opens the project. Installing on a physical iPhone requires the owner’s approved Apple account, app identifier and provisioning. Do not add Push Notifications. Selecting a profile image through the built-in file picker does not require adding a photo-library capability.

## Physical-device checklist — not certified here
1. Offline cold start; create, save and reopen a Sudoku game.
2. Preserve the anonymous identity and profile image after force-close.
3. Pick, replace, cancel and remove a profile image.
4. Check iOS tracking wording with different iOS app languages; Google's consent form is SDK-controlled.
5. Check startup, hint and result-exit test ads, including dismissal and failed loading.
6. Check pause/background/return, safe areas, keyboard and Android back.

Real advertisements, store URLs, release signing and final privacy disclosures require Sudoku’s own approved details. Never copy Ludo/Yatzy credentials or identifiers.
