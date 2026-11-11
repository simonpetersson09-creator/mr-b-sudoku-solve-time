# Mr B Sudoku – D1–D14, 2026-11-11

## Resultat per fynd
| Fynd | Status | Åtgärd eller kvarstående begränsning |
|---|---|---|
| D1 | Rättat | A3 räknade delsekunder men stoppade inte avslutsdialogen. Efter ägarens beslut pausas dialogtiden, Avbryt återupptar, tidigare paus/bakgrund kvarstår. |
| D2 | Rättat | ID-nyckelpaginering med fångat högsta ID ersätter offset för händelser. Radering av tidigare lästa rader orsakar inte hopp. Nya högre ID kommer vid nästa uppdatering. Ingen full MVCC-snapshot över flera anrop utlovas. |
| D3 | Rättat | Både diagnostik och översikt läser hela händelseunderlaget utan 10000-tak. |
| D4 | Rättat för verifierbara värden; kräver ditt beslut för resterande | Dagliga iOS/Android-enheter, spelande enheter, första registrerade spel och återkomst från igår kopplade. Installationsålder, problem för exakt två senaste versioner och annonsandel saknar komplett tillförlitlig mätgrund och visas fortsatt —. Att införa sådan mätning kräver separat definition och godkännande. |
| D5 | Delvis redan löst; rättat; återstår för fysisk telefonprovning | A10 synkade dokumentets språk. Native iOS-klass använder nu plattformsidentitet, inte iPad-user-agent. 40 OS-dialoger, språk och faktiska safe-area på iPhone/iPad kräver installerad enhet. |
| D6 | Återstår för fysisk telefonprovning | Storyboard och SceneDelegate är redundanta statiskt men ingen dubbelvisning/krasch bevisad. Ingen riskabel initieringsändring gjord utan reproduktion. |
| D7 | Rättat för styrkt partiell skrivning | Durable intent-journal publicerar räknare, ledger, progression och borttagning av färdigt spel atomiskt ur läsarens perspektiv. Misslyckad journal lämnar gamla data orörda; misslyckad kopiering behåller journal som auktoritativ. Ingen radering av äldre framsteg. |
| D8 | Rättat | Fyrnivåtext ändrad till sju på 40 språk. 450+ rader oanvänd bannerkod bort; inert kompatibilitet kvar. Ärvt Ludo-avsnitt bort från arbetslistan; tidigare annonsflöde historikmärkt. Historiska rapporter skrivs inte om. |
| D9 | Rättat för tangentfokus; återstår för fysisk telefonprovning | Nio gridrader, en tabbstopp, flyttat pilfokus och inga vänster/höger-radövergångar. Lång ledtråd kan rullas inom reserverad yta och finns som titel. VoiceOver, touchmål och verklig språkförstoring kräver telefon. |
| D10 | Kräver ditt beslut | Överlappande teknikgrindar/samma seed mellan nivåer är inte ett verifierat generatorfel. Motor, givna tal och nivåregler orörda. Separat klassificering kräver ditt godkännande. |
| D11 | Rättat | Streaming stoppar vid 200000 UTF-8-byte, övriga operationer max 12000 byte. Native-serveroverride får bara använda Sudokus godkända publicerade adress. |
| D12 | Redan löst för timeoutupplåsning; återstår för fysisk telefonprovning | Timeout släpper inte ägarskap. Inga nya annonsformat/frekvenser eller timerupplåsningar. Saknad SDK-sluthändelse och säker native-återhämtning kräver enhet. |
| D13 | Rättat för atomiska dubbletter; kräver ditt beslut för anti-fusk | Server-only funktion låser identitet/spel/fas och lagrar högst en samtidig rapport. Äldre dubbletter bevaras och aggregat deduplicerar. Offlineklienten kan fortfarande fabricera giltiga resultat; total anti-fusk kräver annan verifieringsmodell och kan påverka offlinefunktion. |
| D14 | Rättat; återstår för fysisk telefonprovning | Aktivitet pausar vid explicit native PAUSE även när dokumentet förblir visible. Dubbelpaus räknas inte två gånger; resume återupptar. Rapporter fångar sid/tid före await. Upptäckt extra risk: nätverksåterkomst under native-bakgrund kunde sända resume; nu spärrad. |

## Verifiering
- 452 ordinarie tester i 73 filer godkända, inklusive 40-språkstest och annonsregressioner.
- 5 isolerade PostgreSQL/PostgREST-tester godkända; tio samtidiga slutrapporter gav exakt en rad med originaldatum. Inga destruktiva tester på produktion.
- Native source-only verifiering godkänd; inga paketbyggen eller signering. Mac/Xcode och Android SDK saknas.
- Verklig webbläsarvy: avslutsdialog fryst över 2,1 sekunder, Avbryt, pilfokus, en tabbstopp och nio rader; 402×874, 852×394 och 1032×1376 utan sidöverflöde eller JS-fel.
- Autentiserad admin läst och manuellt uppdaterad utan syntetiska appresultat. Serverfunktionen finns och är exekverbar bara för serverrollen, inte spelare.
- Senaste automatiska byggkontroll: build OK.

## Begränsningar / nya problem
- Full lagringskvot eller blockerad lagring kan inte garantera persistens. Nu bevaras senaste hållbara data och skrivfel visas i spelet; ett ännu osparat nytt drag kan förloras vid tvångsstopp.
- Rapportköers kvotfel från A5 är inte en garanti mot all dataförlust; inga redan förlorade rapporter återskapas.
- Profilpaginering har fortfarande offset (ordnad ID); D2:s händelsepaginering är rättad, ingen full transaktionssnapshot över profiler/händelser utlovas.
- Systemdialoger, dubbel native-initiering, SDK utan sluthändelse och skärmläsar-/touchprovning kräver iPhone/iPad och Xcode.
- Inget publicerat; migrationsfunktionen är applicerad, app-/serverkod tas i bruk först efter senare publicering/ny paketering. Ludo och Yatzy oförändrade.

## Ändrade filer
- `AGENTS.md`
- `drizzle/migrations/0004_atomic_local_game_reports.sql`
- `drizzle/migrations/meta/0004_snapshot.json`
- `drizzle/migrations/meta/_journal.json`
- `roadmap.md`
- `src/components/admin/AdminAnalytics.tsx`
- `src/components/app/SudokuCell.tsx`
- `src/integrations/supabase/types.ts`
- `src/lib/ads/admob.ts`
- `src/lib/ads/hint-reward-flow.test.tsx`
- `src/lib/ads/sudoku-ads.test.ts`
- `src/lib/backend/activity.test.ts`
- `src/lib/backend/activity.ts`
- `src/lib/backend/admin-day-metrics.test.ts`
- `src/lib/backend/admin-day-metrics.ts`
- `src/lib/backend/admin-overview.test.ts`
- `src/lib/backend/atomic-game-report.db.test.ts`
- `src/lib/backend/bounded-body.test.ts`
- `src/lib/backend/bounded-body.ts`
- `src/lib/backend/event-pages.test.ts`
- `src/lib/backend/event-pages.ts`
- `src/lib/backend/online-actions.ts`
- `src/lib/backend/report-security.test.ts`
- `src/lib/i18n/translations/bn.ts`
- `src/lib/i18n/translations/ca.ts`
- `src/lib/i18n/translations/cs.ts`
- `src/lib/i18n/translations/da.ts`
- `src/lib/i18n/translations/de.ts`
- `src/lib/i18n/translations/el.ts`
- `src/lib/i18n/translations/en.ts`
- `src/lib/i18n/translations/es.ts`
- `src/lib/i18n/translations/fi.ts`
- `src/lib/i18n/translations/fr.ts`
- `src/lib/i18n/translations/gu.ts`
- `src/lib/i18n/translations/hi.ts`
- `src/lib/i18n/translations/hr.ts`
- `src/lib/i18n/translations/hu.ts`
- `src/lib/i18n/translations/id.ts`
- `src/lib/i18n/translations/it.ts`
- `src/lib/i18n/translations/ja.ts`
- `src/lib/i18n/translations/kn.ts`
- `src/lib/i18n/translations/ko.ts`
- `src/lib/i18n/translations/ml.ts`
- `src/lib/i18n/translations/mr.ts`
- `src/lib/i18n/translations/ms.ts`
- `src/lib/i18n/translations/nl.ts`
- `src/lib/i18n/translations/no.ts`
- `src/lib/i18n/translations/or.ts`
- `src/lib/i18n/translations/pa.ts`
- `src/lib/i18n/translations/pl.ts`
- `src/lib/i18n/translations/pt.ts`
- `src/lib/i18n/translations/ptBR.ts`
- `src/lib/i18n/translations/ro.ts`
- `src/lib/i18n/translations/ru.ts`
- `src/lib/i18n/translations/sk.ts`
- `src/lib/i18n/translations/sl.ts`
- `src/lib/i18n/translations/sv.ts`
- `src/lib/i18n/translations/ta.ts`
- `src/lib/i18n/translations/te.ts`
- `src/lib/i18n/translations/th.ts`
- `src/lib/i18n/translations/tr.ts`
- `src/lib/i18n/translations/uk.ts`
- `src/lib/i18n/translations/vi.ts`
- `src/lib/native/origin.test.ts`
- `src/lib/native/origin.ts`
- `src/lib/native/platform-style.test.ts`
- `src/lib/native/platform-style.ts`
- `src/lib/native/runtime.test.ts`
- `src/lib/native/runtime.ts`
- `src/lib/player/storage-transaction.test.ts`
- `src/lib/player/storage-transaction.ts`
- `src/lib/player/storage.ts`
- `src/native/root.tsx`
- `src/routes/api/public/native.ts`
- `src/routes/play.tsx`
- `src/styles.css`
- `docs/launch-d1-d14-fixes.md`
