# K1 – rättad backendkoppling i Mr B Sudoku

Datum: 2026-11-11. Endast K1 åtgärdat. Inget publicerat eller signerat; Ludo och Yatzy orörda.

## Resultat

Det saknade native-klientfelet och den felaktiga importmatchningen är rättade. Det gemensamma statiska telefonpaketet för iOS och Android byggs nu framgångsrikt.

- `vite.native.config.ts`: alias, absoluta sökvägar, relativa sökvägar, filändelse, frågesuffix och normaliserade sökvägsseparatorer styrs till den befintliga platsen för native-klienten. Orelaterade filer med samma namn styrs inte om.
- `src/lib/native/online-client.ts`: ny transport för samtliga nio befintliga funktioner: getMe, updateProfile, setAvatar, logEvent, deletePlayerData, adminPinLogin, adminOverview, adminAdDiagnostics och getMonthlyMostActive.
- Klienten återanvänder appens befintliga sessionshantering och skickar aktuell användares bearer-token för varje anrop. Sessionsfel ger inget anrop. Inga automatiska återförsök för muterande anrop, ingen utloggning eller ny identitet i transporten.
- Anrop går till Sudokus `/api/public/native`. Inga privilegierade klienter eller serverimplementationer importeras i telefonpaketet; serverreferenser är endast typer.
- `src/lib/native/origin.ts`: den gamla obekräftade standardadressen ersatt med detta projekts egen adress, `https://mr-b-sudoku-solve-time.lovable.app`. Befintligt validerat adressöverstyrningsstöd behållet.
- `src/routes/api/public/native.ts`: den redan befintliga månadsfunktionen har fått en motsvarande native-dispatch, med samma RPC, gräns 10 och verifierade användar-ID. Ingen ny statistikregel.
- Profil, admin, rapportering och radering går genom befintliga serveråtgärder. Backendens tokenverifiering, inmatningsvalidering och adminbehörighetskontroller är oförändrade.
- `AGENTS.md` och `roadmap.md`: dokumenterat och avprickat K1.

## Tester och verifiering

| Kontroll | Resultat |
| --- | --- |
| Hela ordinarie sviten, `bunx vitest run` | 347 godkända, 0 misslyckade; 54 testfiler |
| Isolerade databastester, `bun run test:db` | 2 godkända, 0 misslyckade; ingen produktionsradering |
| K1-fokuserade tester inkl. befintliga adresskontroller | 54 godkända; 52 nya tester tillkom |
| `bun run native:web` | Statisk native-paketering godkänd |
| `node scripts/native.mjs verify --source-only` | Godkänd; ingen plattformskompilering |
| `node scripts/verify-admob-patches.js` | Befintlig iOS-kontroll godkänd; annonser oförändrade |
| Automatisk ordinarie projektkontroll | Senaste resultat: build OK |
| Genomsökning av byggda JS-filer | Ingen träff på supabaseAdmin, SUPABASE_SERVICE_ROLE_KEY, createServerFn eller online-actions |

Nya regressionstester finns i `src/lib/native/online-client.test.ts`, `module-resolution.test.ts`, `backend-endpoint.test.ts` samt kompletterat `origin.test.ts`.

De verifierar importmatchning, fullständig exporttäckning, rätt tjänsteadress, aktuell identitet, alla nio operationer, sessionsfel, avvisade token, 401/403, raderingsfel utan återförsök, adminavslag, tillåtna iOS/Android-origins samt nekade främmande origins. Endpointens verifiering är testad med simulerad auth och simulerade åtgärder; detta ska inte förväxlas med fysisk telefonprovning eller verklig kontoradering.

## Faktiskt provat genom det byggda paketet

Det byggda `dist-native` kördes i Chromium. Befintlig autentiserad session återställdes enbart på testets lokala origin. En testkoppling ledde paketets anrop till den opublicerade Sudoku-servern, eftersom inget får publiceras i denna åtgärd.

- `/profile` visade den verkliga spelarprofilen efter getMe med HTTP 200.
- Paketets vanliga aktivitetsrapportering fick HTTP 200.
- Inga JavaScript-sidfel registrerades.
- Ingen profilredigering, PIN-inloggning eller verklig dataradering utfördes. Vanlig profilhämtning uppdaterar befintligt last_seen och appstart ger ordinarie aktivitetsrapporter.

Testkopplingen finns bara i temporär testkod och ingår inte i appen. Webbläsarprovet verifierar transporten och återläsningen, inte telefonens Keychain/Keystore eller installerad app.

## Kvarstående begränsningar

1. **Installerad iOS/Android ej verifierad:** miljön saknar Xcode och konfigurerad Android SDK. Native-sync, Xcode-kompilering, Android-kompilering och fysisk enhetsprovning har därför inte körts. Statisk paketering är verifierad och dess utdata finns i `dist-native`, men ingen synkad/signad release levereras här.
2. **Tjänsten måste publiceras senare:** projektet är fortfarande opublicerat. Installerade appar kan därför inte garanteras nå den rättade produktionsadressen förrän Sudoku-servern publiceras. Ingen publicering gjordes.
3. **Verklig PIN-behörighet och dataradering:** anropsväg, identitetskoppling och felhantering är regressionstestade, men inga verkliga PIN-försök eller destruktiva raderingar gjordes mot användardata.
4. **Befintliga paketeringsvarningar:** stor JS-fil och blandade statiska/dynamiska importer rapporteras, men stoppar inte bygget. Ingen prestandaändring gjordes eftersom uppdraget endast gäller K1.

Övriga fynd från lanseringsgranskningen ligger utanför detta uppdrag och är inte åtgärdade. Spelregler, annons-ID:n, annonsflöden, språk och UI har inte ändrats.