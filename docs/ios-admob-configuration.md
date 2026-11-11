# Mr B Sudoku – iOS AdMob, 11 november 2026

## Genomfört

| Inställning | iOS produktionsvärde |
| --- | --- |
| Bundle ID (oförändrat) | `se.shiningdays.mrbsudoku` |
| AdMob App ID | `ca-app-pub-7448540924654868~5197213597` |
| App Open | `ca-app-pub-7448540924654868/5823578752` |
| Interstitial – avslutat spel och ledtråd | `ca-app-pub-7448540924654868/3884131928` |

iOS App ID är infört i Info.plist och central annonskonfiguration. Båda interstitial-placeringarna använder redan samma förladdningslager, därför behövdes ingen ändring av annonsvisningens logik. Utgivarkontot kan vara samma som andra appar; dessa app-/annonsenhets-ID är de Sudoku-ID som ägaren bekräftat.

Android är oförändrat: App ID `ca-app-pub-3940256099942544~3347511713`, App Open `ca-app-pub-3940256099942544/9257395921`, Interstitial `ca-app-pub-3940256099942544/1033173712`.

Utvecklingsläge använder Googles testannonsenheter. Produktionsläge använder de nya iOS-enheterna. Ett native testbygge som byggs i produktionsläge behöver registrerade testenheter i AdMob; detta är inte verifierat i kontot. Rapportens tester använder ett simulerat SDK och gör inga verkliga annonsbegäranden.

## Kontrollresultat

- UMP hämtas och kontrolleras innan annonsinitialisering och annonsbegäran. Nekad behörighet blockerar båda formaten. ATT följer UMP på iOS. Testerna verifierar ordningen UMP → ATT → initialisering → annonsbegäran.
- Befintliga förladdningar, cachetider och frekvensregler är oförändrade. App Open har en startmöjlighet per start, 1,5 sekunders fördröjning, första-spelet-skydd, endast startsidan och navigerings-/bakgrundskontroller. Ingen återkomstannons har införts.
- Samtidiga ledtrådstryck blockeras. Hem/Spela igen väntar på stängning och dedupliceras per spel-ID. App Open undertrycks 60 sekunder efter ledtråd/resultatannons. Förladdning visar inte i sig någon annons.
- Synkskripten bevarar produktions-App ID och stoppar vid motstridiga produktions-ID. Det verkliga iOS-skriptet kördes och ett test kör det två gånger med de bekräftade ID:na. Ingen bygg- eller synkskriptsändring behövdes.
- Spellogik, lagring, statistik och upplåsningar har inga kodändringar. I webbläsaren fylldes en korrekt ledtrådssiffra i och samma spel, värden, felantal och ledtrådsantal återlästes efter omladdning; inga sidfel noterades.

## Ledtråd: kravkonflikt – inte åtgärdad utan godkännande

Nuvarande flöde ignorerar resultatet från `showHintInterstitial()`. Därefter fyller det rätt siffra och förbrukar en av tre ledtrådar även om annonsen saknas, misslyckas eller är upptagen. Webbläsarprovet bekräftade det när native-annonser saknades. En stängd vanlig interstitial rapporteras som `shown`; det bevisar inte att annonsen har setts färdigt och är ingen belöningshändelse.

Kravet ”ingen ledtråd förbrukas vid annonsfel/avbrott” är alltså **inte uppfyllt**. Att ändra detta vore en ändring av ledtrådsflödets affärslogik, som ägaren uttryckligen vill godkänna först. Därför har flödet lämnats oförändrat.

### Policy och upplevelse

[Googles förbjudna interstitial-implementationer](https://support.google.com/admob/answer/6201362?hl=en) varnar för upprepade annonser efter användarhandlingar, direkt efter andra interstitials och oväntade avbrott mitt i spel. Sudoku visar en vanlig mellanannons när Ledtråd trycks, utan särskild förvarning eller naturlig paus och utan minimiavstånd mellan två separata ledtrådar. Tre snabba ledtrådar kan därför ge tre annonser i tät följd. Det är en konkret policyrisk och upplevelserisk, inte ett besked om Googles slutliga bedömning.

[Googles rekommenderade placeringar](https://support.google.com/admob/answer/6201350?hl=en) är naturliga pauser mellan innehåll/nivåer. Även nuvarande annons efter Hem/Spela igen på resultatsidan är värd slutlig placeringsgranskning: Google rekommenderar visning före fortsättningsknappar snarare än efter dem. Placeringen har inte flyttats utan godkännande.

En vanlig interstitial ska inte hanteras som en belöningsannons. Om ledtråden ska tjänas in genom att se reklam bör ett godkänt belöningsformat med tydligt frivilligt erbjudande och riktig belöningshändelse användas; det kräver separat annonsenhets-ID och godkänd ny logik. Alternativt frikopplas ledtrådar från reklam och interstitials begränsas till naturliga pauser. Inget av alternativen har implementerats.

### Kvarstående tekniska granskningspunkter

- Interstitial-flödet har en säkerhetstimeout som kan släppa JavaScript-låset om SDK aldrig rapporterar stängning. En riktig telefon måste verifiera att en mycket sen native-händelse inte orsakar dubbla/sena annonser; normala stängnings-, fel- och dubbeltrycksfall är testade, men detta är inte en garanti för alla native-fel.
- Ledtråd fortsätter efter annonsväntan med det fångade speltillståndet. Vanliga drag och timer blockeras under väntan, men navigering/bakgrund och sena svar kräver native-prov. Ingen förändring av detta flöde har gjorts i uppdraget.
- Inga verkliga iOS-annonser, UMP-formulär, ATT-dialoger eller kontoinställningar har testats. Xcode/riktig telefon saknas här. Synkade paketerade filer och ett komplett native-bygge har inte verifierats.

## Tester

- Hela testsviten: **49 filer, 257 godkända tester**.
- Riktad körning annonser/native/lagring/upplåsning/motor: **24 filer, 160 godkända tester**.
- Sju nya tester: produktions-App Open, ledtråds-/resultat-ID och ordning, utvecklingsenheter, UMP-blockering samt upprepad verklig iOS-synk med bekräftat App ID.
- Native källkontroll och iOS-pluginpatchkontroll godkända. Automatisk byggkontroll: inga fel.
- Spel → ledtråd → omladdning: samma sparade progression, inga sidfel.
- Inga databasändringar och inga databas-integrationstester i detta uppdrag.

## Exakta ändrade projektfiler

1. `src/lib/ads/admob.ts` – iOS produktions-ID och förklarande kommentar; inga beteendeändringar.
2. `ios/App/App/Info.plist` – iOS AdMob App ID.
3. `src/lib/ads/sudoku-ads.test.ts` – nya godkända iOS-värden, exakta oförändrade Android-värden och fortsatt spärr mot Yatzys app-/enhets-ID, inte dess gemensamma utgivarkonto.
4. `src/lib/ads/ios-production.test.ts` – ny simulerad SDK-testning av produktions-/utvecklings-ID och UMP-ordning.
5. `src/lib/native/admob-sync.test.ts` – uppdaterade fixtures och regressionsprov av bekräftat App ID vid verklig upprepad synk.
6. `AGENTS.md` – uppdaterad regel för godkända produktionsenheter och utvecklingstestannonser.
7. `roadmap.md` – genomförda kontroller och uttryckliga kvarstående godkännanden/telefonprov.
8. `docs/ios-admob-configuration.md` – denna rapport.

Projektminnet har också uppdaterats med ägarens bekräftade iOS-ID och krav på godkännande före ändrad ledtrådslogik.

## Behövs fortfarande

- Ägarens beslut om ledtrådsflödet och dess koppling till reklam; om belöningsformat väljs behövs dess eget iOS-annonsenhets-ID.
- Bekräftelse att Sudoku har publicerade UMP-meddelanden och registrerade testenheter för native testbyggen i produktionsläge.
- Installerad telefonprovning före lansering; ingen publicering eller releasesignering har gjorts.
- Tidigare lanseringsuppgifter kvarstår separat: Androids egna produktions-ID, integritetspolicy, utvecklarwebbplats/app-ads.txt, slutlig tjänsteadress, butikslänkar och säker lokal signering.

Endast Mr B Sudoku har ändrats; Ludo och Yatzy har inte öppnats eller ändrats i detta uppdrag.