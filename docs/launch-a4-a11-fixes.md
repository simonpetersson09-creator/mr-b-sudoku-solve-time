# Mr. B Sudoku – A4–A11

2026-11-11. Endast Sudoku ändrat; ingen publicering, signering, nativepaketering eller ändring i Ludo/Yatzy. Ägaren har bekräftat att aktuell lansering gäller endast iOS.

## Rättningar
- **A4:** Unikhet kontrolleras med motorns lösningsräknare, högst 25 000 söknoder. Ett uttömt sökutrymme godkänns aldrig som unikhet. Resultatet cachas för exakt puzzle+solution, max 100 par; ändrad klocka, siffra eller anteckning startar inte ny lösning. Befintliga giltiga spel och framsteg behålls; korrupta poster avvisas individuellt.
- **A5:** Rapporten sparas före leverans. Stabila rapport-ID migreras även för äldre köposter, och endast kvitterat ID tas bort efter att aktuell kö lästs igen. Rapport B som tillkommer medan A levereras förloras inte.
- **A6:** Profiler läses utan 10 000-tak. Appaktivitet från hela perioden efter eventuell nollställning läses, inklusive spelare som inte återvänt. D1/D7/D30 är återkomst på exakt första-appdagen + n Stockholm-dagar, och endast helt passerade observationsdagar ingår i nämnaren. Last_seen används inte som ersättning. Webben och testundantag räknas inte. Utan observationsunderlag visas okänt, inte falsk nollretention.
- **A7:** Servern raderar inte längre händelser först. En appägd trigger på profilsradering tar bort egna händelser, testundantag och användarbundna rapport/PIN-räknare inom samma transaktion som identitetsraderingens profilkaskad. Fel återställer identitet, profil och historik; klienten får fel och kan försöka igen. Inga befintliga användare raderades vid införandet.
- **A8:** Native-anrop har totalt 20s för identitetsåterställning, fetch och svarsläsning. Tidsgränsen aborterar fetch; sent färdig identitetsåterställning får inte starta mutation efter gränsen. Ingen automatisk retry av PIN/radering/profilmutation. Ett tidsgränsfel kan inte garantera att servern inte redan hann genomföra åtgärden.
- **A9:** Android App Open/Interstitial är null i produktionskonfiguration tills egna ID finns. Utveckling behåller Googles samples med isTesting=true. Android Rewarded är fortsatt avstängd. iOS-ID, annonsvillkor, UMP/ATT och belöningsflöden är oförändrade. Android-ID begärdes, ägaren bekräftade endast iOS-lansering nu.
- **A10:** Native-roten initierar dokumentets lang från spelarens val och prenumererar på befintliga automatiska/manuella språkhändelser. Manuellt språk respekteras. Ingen design-/textändring.
- **A11:** Spelrapporter har inte längre 40-rapporter/session eller diagnostikens 30-poster/7-dagar-eviktion. De ligger kvar tills kvitterade, dedupliceras i kön per spel/fas och skickas sekventiellt med 550ms mellan rapporter. Befintligt serverskydd 120/min behålls; fel lämnar kön för senare leverans med 60s återförsök. Originaltid skickas alltid för spelrapporten och lagras som händelsedatum efter format-/framtidsvalidering. Äldre queued accepteras som originaltid när den finns. Både administratörens dagar och Månadens flitigaste använder samma ursprungliga datum.

## Tester och verifiering
- Stegvisa tester kördes efter varje grupp rättningar.
- **435 ordinarie tester i 67 filer godkända**; 20 nya jämfört med föregående 415.
- **4 isolerade PostgreSQL/PostgREST-tester godkända**, inklusive tvingat raderingsfel med full rollback och föregående månads finish som inte hamnar i aktuell månadslista. Aldrig destruktivt test mot live backend.
- Totalt **439 godkända tester**.
- **350/350 pussel** (50 per nivå) passerade nya sparunikhetskontrollen. Max första kontroll **17,8ms**, sammanlagt **346,6ms** i sandboxen. Inte fysisk iPhoneprestanda; upprepade kontrollanrop nyttjar cache.
- Autentiserad verklig adminsida: manuell hämtning, fokusåterkomst och automatisk minutuppdatering når servern utan sidfel. Verkligt underlag: inga iOS/Android-enheter eller finishrapporter idag eller på någon av de 30 senaste dagarna; ingen syntetisk produktionsaktivitet tillagd. Retentionens icke-nollunderlag testades isolerat.
- Verklig spelvy: korta spelpass, paus, sifferdrag, tillbaka och återöppning klarades utan sidfel.
- Native-källkontroll godkänd. Xcode/Android SDK saknas; ingen nativekompilering eller fysisk provning påstås.
- Förhandsvisningens automatiska byggkontroll godkänd. Dataraderingstriggern verifierades skrivskyddat i projektets backend. Två additiva migrationer har applicerats; ingen befintlig data har återställts eller raderats.

## Ändrade filer
- `src/lib/sudoku/engine.ts`
- `src/lib/player/storage.ts`, `storage.test.ts`, nya `puzzle-validation.ts`, `puzzle-validation.test.ts`
- `src/lib/backend/report.ts`, `report-queue.ts`, `online-inputs.ts`, `online-actions.ts`
- `src/lib/backend/admin-overview.test.ts`, `report-security.test.ts`
- Nya `src/lib/backend/retention.ts`, `retention.test.ts`, `report-delivery.test.ts`, `player-deletion.test.ts`, `player-deletion.db.test.ts`, `report-dates.db.test.ts`
- `src/lib/native/online-client.ts`, `online-client.test.ts`
- `src/native/root.tsx`, nya `src/lib/i18n/document-language.ts`, `document-language.test.tsx`
- `src/lib/ads/admob.ts`, `sudoku-ads.test.ts`, nya `android-production.test.ts`
- Genererade migrationer `drizzle/migrations/0002_atomic_player_cleanup.sql`, `0003_report_sequence_access.sql` samt verktygets journal och snapshots
- `AGENTS.md`, `roadmap.md`, denna rapport

## Kvarstående begränsningar
- Fysisk iOS-provning av VoiceOver, nätverksbortfall, lång offlinekö, riktiga annonser och kontoradering samt slutpaket återstår.
- Valideringens hårda sökbudget kan avvisa ett ovanligt men giltigt importerat pussel som överskrider budgeten; de 350 appgenererade proverna gjorde det inte. Ingen obegränsad synkron lösning tillåts.
- Beständig browser/native-lagring kan fortfarande vara full eller blockerad. Spelkö har ingen avsiktlig eviktion, men lagrings-/enhetsförlust kan inte garanteras bort. Historiskt redan tappade rapporter saknar säkert återställningsunderlag.
- Offline-originaltid valideras, men en manipulerad klient kan fortfarande hävda falska resultat/datum. Ingen fullständig anti-fusk-garanti.
- Händelser utan historisk originaltid får inte ett gissat speldatum. Retention kan bara beräknas från faktiskt lagrad appaktivitet, inte osynliga offlinebesök.
- Skyddet i nya serverkoden och native-språk-/nätverksrättningarna kräver senare publicering respektive uppdaterat telefonpaket; inget publicerades nu. Dataraderingens additiva databastrigger är redan applicerad.
- Alla kvarvarande K-/D-fynd utanför A4–A11 lämnas orörda enligt avgränsningen. Androidproduktion är avsiktligt avstängd och inte ett hinder för det nu valda iOS-släppet.