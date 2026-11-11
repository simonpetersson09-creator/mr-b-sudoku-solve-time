# K1 – iOS-överlämning till MacinCloud/Xcode, 2026-11-11

## Status
Produktionspaketet är byggt och iOS synkat. K1 är **inte helt löst**: Xcode-kompilering, Swift-paketupplösning och installerad iPhone/iPad-provning återstår. Miljön här saknar macOS/Xcode och anslutna Apple-enheter.

## Verifierat
- Hela testsviten: **455 ordinarie tester i 74 filer + 5 isolerade databastester = 460 godkända**. Tre nya regressioner kontrollerar iOS utan Androidoutput, gammalt kopierat paket och fel bundle ID.
- Synkat paket startat i Chromium med extern trafik blockerad: startsida, nivåval och worker-genererat spel med 81 rutor fungerar utan sidfel. Detta är inte en WKWebView-/SDK-/enhetsverifiering.
- Native-importtester täcker alias, relativa/absoluta sökvägar, Windows-separatorer och query-suffix. Samtliga nio serveroperationer ersätts med den autentiserade native-klienten; inga privilegierade serverimplementationer följer med.
- `bun run native:web`: nytt minifierat produktionsbygge av det lokalt paketerade spelet, inte en fjärrwebbplats. `bun run native:sync:ios`: lyckad kopiering, åtta plugins, verifierade AdMob-patchar, 40 behörighetsspråk, ikoner och splash.
- `node scripts/verify-ios-package.mjs`: identiska kopierade filer, worker, typsnitt, identitet/version, plugins, egna annons-ID och godkänd tjänsteadress. Källkontrollen `bun run native:verify --source-only` godkänd. Den äldre fullkontrollen kräver även Android-synk och stoppar därför på Android-filer; det påverkar inte denna iOS-överlämning.
- Bundle ID `se.shiningdays.mrbsudoku`; version `1.0.0`; build `1`, i Debug och Release. Apple-team lämnas tomt.
- AdMob App ID `ca-app-pub-7448540924654868~5197213597`; App Open `/5823578752`, Interstitial `/3884131928`, Rewarded `/8705213764`, samtliga med prefix `ca-app-pub-7448540924654868`.
- AppDelegate, SceneDelegate, båda storyboards, entitlements, privacy manifest, språkresurser och resursreferenser finns. Integritetsdeklarationernas sakliga fullständighet hör till K2, inte denna K1-kontroll.

## Överlämningspaket
ZIP innehåller iOS-projektet med färska webbassets och konfiguration. Endast de åtta nödvändiga pluginernas Swift-källor, paketmanifest och licenser inkluderas i `ios/Vendor`, med samma verifierade AdMob-patchar. Överlämningskopians Swift-manifest pekar på Vendor i stället för node_modules. Det ordinarie projektets Capacitor-genererade manifest ändras inte. Inga repositorymetadata, JavaScript-beroendeinstallationer, nycklar eller signeringsuppgifter medföljer.

Xcode behöver internet för Capacitor 8.6.0, Google Mobile Ads 13.11.0, UMP och SwiftKeychainWrapper. Fullständig fjärrpaketupplösning och dess plattforms-/Xcode-krav kan endast godkännas på Mac. Använd en uppdaterad MacinCloud-installation med Xcode 26 eller senare för Capacitor 8.

## På MacinCloud
1. Packa upp hela ZIP-filen. Flytta inte bara `.xcodeproj`; behåll App- och Vendor-mapparna tillsammans.
2. Öppna `ios/App/App.xcodeproj`. Låt Xcode Resolve Package Dependencies slutföras och kontrollera eventuella SDK-/deployment-target-fel innan något ändras.
3. Välj schemat App och en tillgänglig iPhone-simulator. Kompilera utan signering. Kommandot i medföljande README använder `CODE_SIGNING_ALLOWED=NO`.
4. För riktig enhet: välj ditt godkända Apple-team i Signing & Capabilities. Behåll bundle ID, version och build; låt Xcode skapa rätt provisioning.
5. Installera och prova på både iPhone och iPad. Ingen Archive/Upload/publicering behövs för K1-testningen.

## Obligatorisk fysisk provning
- Kallstart: endast en huvudvy, ingen blank/dubbel root; rätt ikon/splash, iPhone-safe-area och iPad stående/liggande/delad skärm.
- Offline-start, pusselgenerering, anteckningar/Ångra, sparning/återöppning, paus och telefonlås utan dubbel tid eller dataförlust.
- Profilbildens systemväljare, språk/behörighetsdialoger, Keychain-identitet över omstarter och autentiserad profil/admin/rapportering. Testa radering bara med ett uttryckligen avsett testkonto.
- UMP före annonsanrop, ATT, App Open, resultatannons och frivillig Rewarded; exakt en belöning och ingen hint vid stängning utan reward. Kontrollera lång annons och bakgrund utan överlappning.
- Denna överlämning är ett produktionsbygge med riktiga iOS-annonsenheter. Registrera enheten som test device i AdMob före annonsprovning; klicka aldrig på egna produktionsannonser. UMP:s region/testinställningar måste också verifieras utan att ändra integritetsflödet.
- Native pekar på den publicerade Sudoku-tjänsten. De senaste serverrättningarna är ännu inte publicerade; full end-to-end-provning av dem är därför blockerad tills en separat godkänd serverpublicering görs. Inget publiceras här.

## Varningar och avgränsning
Webbpaketet byggs utan fel men med tidigare varningar om stor huvudchunk (~1,49 MB) och importvägar som inte ger extra koddelning. Ingen prestanda-/design-/regeländring görs i K1.
Ingen Xcode-kompilering eller fysisk enhetstestning har utförts. Ingen signering/publicering eller ändring i Ludo/Yatzy. K2/K3 och D6:s osäkra dubbla root-initiering är inte markerade lösta.

## Ändrade projektfiler
`scripts/verify-ios-package.mjs`, dess typdeklaration `scripts/verify-ios-package.d.mts`, `src/lib/native/ios-package.test.ts`, denna rapport, `roadmap.md` och `AGENTS.md`. Synkat genererat spelpaket ligger i ignorerade `dist-native` och `ios/App/App/public`, och medföljer ZIP-överlämningen. Den befintliga iOS-konfigurationen behövde ingen saklig ändring.