# Mr.B. Sudoku — native configuration status

Updated 11 November 2026. This replaces an inherited Ludo audit incorrectly labelled as Sudoku. Its historical claims about multiplayer, QR scanning, Push capability, Apple team and successful device checks do not describe Sudoku and must not be used for release decisions.

## Current source configuration
- Standalone Sudoku with local play and a packaged `dist-native` client; no matchmaking, friends, QR scanning or push.
- Temporary application identifier `com.pending.mrbsudoku`; Apple team remains empty. No signing credentials or store submission.
- iOS has no Push capability, APNs entitlement, camera usage description or background modes.
- All 40 app languages are declared. Tracking and photo-library usage descriptions have registered localized `InfoPlist.strings` resources. Native iOS sync regenerates them.
- Profile image selection uses the existing HTML image file picker. It does not require adding a photo-library capability or camera plugin in Xcode. The OS controls its picker; only the selected image is processed, cropped and saved through the existing avatar flow.
- Ads use Google's sample identifiers and existing UMP/ATT logic. Google controls its consent form and its supported language selection; the app's native strings translate the app-supplied iOS permission descriptions only.

## Verification limits
Automated source checks are not iOS/Android compilation or store approval. Actual iOS permission wording and image selection must be checked in a newly built installed app. The editor preview cannot display Apple's real system dialogs. No app was signed or published for this update.

## Before release
Supply Sudoku's own approved application identifier, Apple team, store URLs and AdMob identifiers. Generate the local package, sync both platforms, run verification, and compile with the appropriate Xcode/Android toolchains. Check offline launch, saved games, image selection, identity persistence, UMP/ATT, ads and safe areas on real devices. Complete store privacy disclosures against the final packaged app.
