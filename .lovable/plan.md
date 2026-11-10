# Plan: Mr.B. Sokudo (Sudoku)

Grunden kopieras från en skrivskyddad kopia av Mr.B. Ludo. Ludo- och Yatzy-projekten ändras aldrig. Sokudo får en egen Lovable Cloud-databas och egna lagringsnycklar (`mrb-sudoku:v1:`), så inget delas med Ludo.

## Det som behålls exakt
- Utseende: teal + guld, Inter/Space Grotesk, 44 px-knappar, startsidan med runda guldgenvägar.
- Alla 40 språk och samma översättningstest.
- Inställningar, Statistik, profil (namn, emoji, profilbild) och anonym spelaridentitet.
- Sparade pågående spel (max 10) och spel utan internet.
- iOS/Android-skalet: tillbaka-knapp, svep tillbaka, vibration, safe area, ikon- och splashflöde.
- Annonser med samtyckesfråga, App Open och helskärmsannons efter avslutat spel. Testannonser tills vidare.
- Adminpanel med PIN och enhetsstatistik: beständigt enhets-ID, heartbeat, dygn räknade i Stockholmstid, testenheter uteslutna, endast appenheter (iOS/Android) räknas.
- Betygsfråga, felrapportering och nedladdningssidan på webben.

## Det som tas bort helt
- Ludo/Fia-motorn, brädet, tärningen och 3D-tärningsmotorn.
- Onlinespel, snabbspel, inbjudningar, matchkoder, väntrum, QR-skanner, snabbchatt.
- Vänner, topplistor och onlinepush (push-paketet, APNs/FCM-kod).
- Tillhörande tabeller och serverfunktioner. Den nya databasen skapas bara med tabellerna för enheter, heartbeat, admin, felrapporter och annonsdiagnostik.
- Översättningsnycklar som inte längre används, i alla 40 språk.

## Sudoku
- 9×9 med nivåerna Lätt, Medel, Svår och Expert.
- Varje pussel har exakt en lösning. Det kontrolleras av en lösare som räknar lösningar.
- Siffror 1–9, anteckningsläge, ångra, radera, ledtråd, felmarkering, markering av samma siffra, rad, kolumn och ruta.
- Timer, paus (brädet döljs), automatisk sparning.
- Statistik per nivå: spelade (endast färdiga spel), vinster och bästa tid.
- Bara mot datorn. Ingen vän- eller onlinefunktion.

## Identiteter
- Appnamn: **Mr.B. Sokudo**. Notera: stavas "Sokudo", inte "Sudoku". Bekräfta att det är avsiktligt.
- Bundle-ID/paketnamn: inte bestämt. En platshållare används och är tydligt markerad tills du ger mig det riktiga.
- Apple-team: inte bestämt. Lämnas tomt.
- AdMob: Googles officiella test-ID:n.
- Firebase och push: ingen.
- Ingen publicering och ingen signering.

## Tekniska detaljer
- Motor: `src/lib/sudoku/engine.ts` (ren TS: generator med seed, lösare som räknar lösningar och avbryter vid 2, nivåer styrda av antal givna siffror och vilka lösningstekniker som krävs, validering, ledtråd). Tester: unik lösning för varje nivå, giltig lösning, ledtråd, felmarkering, ångra/anteckningar.
- Spelstatus och sparning: `src/lib/sudoku/storage.ts` (max 10, äldsta tas bort först), `stats.ts` (spelade räknas endast vid färdigt spel). Tester för reglerna "max 10" och "spelade = endast färdiga".
- Sidor: `/`, `/play`, `/setup` (nivåval), `/settings`, `/stats`, `/rules`, `/profile`, `/admin-login`, `/admin`, `/api/public/native` (heartbeat/felrapporter). Borttagna: `join`, `online.*`, `friends`, `leaderboard`.
- Native: `capacitor.config.ts` med nya namn, ios/android-mapparna kopieras och byter namn; push-plugin och push-patchar tas bort, AdMob-patcharna behålls.
- Översättningar: ett skript listar oanvända nycklar, tar bort dem i alla språk och lägger till Sudoku-nycklar i alla 40. Det befintliga testet säkerställer att alla språk har samma nycklar.
- Arbetet görs i etapper. Etapp 1: kopiera, rensa, ny databas och tester gröna. Etapp 2: Sudokumotor och spelsida. Etapp 3: översättningar, native och annonser.
