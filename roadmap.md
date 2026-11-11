# Roadmap: Mr.B. Sudoku

## D1–D14 från lanseringsgranskningen (2026-11-11)
- [x] Tidigare rättningar kontrollerade; D1-dialogpaus efter ägarens beslut, D10-regler och D12-annonsformat/frekvens orörda.
- [x] D2/D3: ID-nyckelpaginering och full diagnostik; D4 verifierbara dagliga appkolumner kopplade.
- [x] D7: Partiella skrivfel reproducerade; durable intent-journal skyddar resultat/ledger/progression/sparningar.
- [x] D8/D9: Sju nivåer på 40 språk, död bannerkod bort, ärvd historik städad, rovingfokus/rader och lång hinttext.
- [x] D11/D13/D14: Bytebegränsad body, godkänd serveradress, atomiskt rapportskydd och native-aktivitet; nätverk kan inte återuppta bakgrund.
- [x] 452 ordinarie + 5 isolerade databastester godkända; admin/spelvyer och native source-only verifierade; individuell rapport i docs/launch-d1-d14-fixes.md. Inget publicerat.
- [ ] D4/D10/D13: Ägarbeslut krävs för installation-/version-/annonsmätning, ny svårighetsklassificering eller full offline anti-fusk.
- [ ] D5/D6/D9/D12/D14: Installerad iPhone/iPad/Xcode krävs för OS-språk, safe-area, root-initiering, VoiceOver/touchmål och saknade SDK-sluthändelser.

## A4–A11 från senaste lanseringsgranskningen (2026-11-11)
- [x] A4: Cachad unikhetskontroll med hårt söknodstak; 350 pussel accepterade, högsta första kontroll 17,8ms i denna miljö.
- [x] A5/A11: Write-ahead-kö med stabila ID, endast kvitterat objekt bort, spelrapporter utan diagnostikens 30/7-dagars-/sessionstak, 550ms mellan leveranser och återförsök efter serverfel; validerad originaltid styr dag/månad.
- [x] A6: Alla profiler pagineras; hela appkohorten efter nollställning läses, inklusive icke-återvändare; retention kräver exakt Stockholm-dag och färdig observationsdag.
- [x] A7: Profiltrigger städar egna appdata i samma transaktion som identitetsradering; fel återställer allt. Migrationskedjans rapportsekvensbehörighet säkrad.
- [x] A8: 20s tidsgräns för identitet, fetch och svarsläsning; abort och ingen automatisk mutationsretry.
- [x] A9: Androidproduktion avstängd utan egna godkända ID, Google-prov kvar endast i utveckling. Ägaren har bekräftat endast iOS-lansering nu; inga Android-ID krävs för detta släpp.
- [x] A10: Native-dokumentets språk initieras och följer spelarens språkval med befintlig språkprenumeration.
- [x] Stegvisa regressioner; 435 ordinarie + 4 isolerade databastester godkända. Native-källkontroll och förhandsvisning godkända; autentiserad admin manuell/fokus/60s och spel/sparning omprovade utan sidfel. Ingen publicering eller ändring i Ludo/Yatzy.
- [ ] Installerad iOS: fysisk annons-, VoiceOver-, nätverks- och offlineraderingstest kräver telefon/Xcode; återstående K-/D-fynd utanför A4–A11 ändras inte.

## A1–A3 från senaste lanseringsgranskningen (2026-11-11)
- [x] A1: Läs migrationsunderlaget före resultatskrivning; varje avslutat spel räknas en gång utan återställning av framsteg.
- [x] A2: Belönad ledtråd skapar ingen Ångra-post och äldre historik kan inte skriva över den. Ångra för senare vanliga drag fungerar fortsatt.
- [x] A3: Räkna delsekunder vid paus, dialog/annons, bakgrund, navigation och sista draget; återupptagning räknar inte paustid. Avslutat/raderat spel återuppstår inte vid avmontering.
- [x] 415 ordinarie + 2 isolerade databastester godkända; 15 nya regressionstester. Verklig spelvy: fyra korta spelpass, fryst paus, inmatning, tillbaka/sparning och återöppning utan sidfel; förhandsvisningens byggkontroll godkänd. Ingen publicering.
- [ ] Installerad telefon och riktiga SDK-belöningar: kräver fysisk enhet; tidigare felräknade framsteg och äldre ledtrådshistorik saknar säkert identifierbart underlag och skrivs inte om.

## Adminstatistik och uppdatering (2026-11-11)
- [x] Automatisk uppdatering var 60s endast synlig/online, samt fokus/nätverk/native-återkomst; inga överlappande anrop eller uppdateringar efter avmontering. Tillfälliga hämtningsfel visas inte som saknad adminbehörighet och gamla data behålls.
- [x] Läsfel för profil/loggar får inte visas som nollor, aktivitetsläsning fortsätter förbi 100000 rader, unika spel-ID/fas/identitet räknas en gång. Appfilter och testundantag bevarade; Stockholmstid och 30-dagarsperiod rätt angivna. Ej tillgängliga kolumner förblir —.
- [x] 400 ordinarie + 2 isolerade databastester godkända. Autentiserad adminsida och rå adminläsning verifierade: manuell/fokus/60s hämtning når servern, inga sidfel. 0 appenheter idag och under alla senaste 30 dagarna, 0 färdiga spel; ingen syntetisk produktionsaktivitet eller publicering.
- [ ] Ny aktivitet från installerad iOS/Android återstår att läsa tillbaka: fysisk enhet och uppdaterad publicerad server/app krävs, befintligt underlag saknar appaktivitet.

## Språk, iPad och förnyad lanseringskontroll (2026-11-11)
- [x] Automatiskt språk följer enheten vid start, languagechange och native-återkomst; manuella/äldre val bevaras. Dokumentets språk följer gränssnittet. Tre nya regressionstester och verkligt franska→manuellt svenska-flöde godkända.
- [x] iPad stående/liggande och delad skärm verifierade på 768×1024, 1024×768, 820×1180, 1180×820, 1024×1366, 1366×1024 och 507×768; inmatning, paus/sparning och återöppning fungerar. iPhone-måtten oförändrade.
- [x] Ludo läst skrivskyddat: samma direkta autentiserade anslutning till egen publicerad /api/public/native finns redan i Sudoku; ingen extra proxy eller omdirigering införs.
- [x] 393 ordinarie + 2 isolerade databastester godkända, tidigare skydd kvar; fokus/dialogtangentblockering och autentiserad auth→hem omprovade. Native-källkontroll godkänd; full native:verify stoppar på osynkade Android-resurser. Inget publicerat/signerat.
- [ ] Installerad iPad/iPhone/Android och slutlig paketering: fysisk utrustning/Xcode/Android SDK saknas; native-synk och installerat testbygge återstår.

## Återstående tekniska säkerhetsåtgärder (2026-11-11)
- [x] Helskärmsägarskap och sena stängningslyssnare kvar efter deadline; SDK-stängning/fel frigör. App Open släpps inte av 90s-timer.
- [x] Spelbundna fördröjningar städas; dialoger/bakgrund/annonser blockerar tangent- och cellinmatning.
- [x] Worker stoppas efter 20s, vid kommunikationsfel och postMessage-fel; ingen huvudtrådsfallback eller reservpussel som missar nivågrinden.
- [x] Befintlig atomisk serverräknare används efter ägarens godkännande; strikta rapportformat, identitetsbunden kontroll av lagrade speldubbletter och skrivfelhantering införda.
- [x] Nivådialogens fokusfälla/återställning, rutornas ARIA/anteckningar/fel, zoom och minskad rörelse förbättrade. Auth går till befintliga sidor; sju nivåer i metadata. Oanvänd online-resultaträknare/väntrum borttagna, diagnostikflagga Sudoku-namngiven och gammal annonsrapport historikmärkt.
- [x] 390 ordinarie tester och 2 isolerade databastester godkända; telefonpaketering och källkontroll godkända. Mobilflöde för fokus, ledtrådsdialogens tangentblockering och autentiserad auth→hem verifierat utan sidfel.
- [ ] Installerad telefon: sena SDK-stängningar samt VoiceOver/TalkBack kräver fysisk iOS/Android och telefonverktyg. Offline-spelrapporter kan inte bevisa verkliga resultat mot en manipulerad klient; ingen fullständig anti-fusk-garanti införs.

## Fyra fel från lanseringsgranskningen (2026-11-11)
- [x] Liggande spelsida har bricka vänster och verktyg/siffror höger; kontroller inom skärmen på 852×394, 667×375 och 568×320. Stående mått verifierade på 394×852 och 320×568.
- [x] Skadade sparningar valideras och filtreras individuellt; giltiga siffror, anteckningar och Ångra bevaras, äldre saknad Ångra-gräns normaliseras.
- [x] Engångsräkning bevaras utan 200-ID-tak; 250-resultat och äldre listformat regressionstestade för år, all-time och progression.
- [x] Native-bakgrund/telefonlås och dold sida pausar och sparar synkront; delsekunder räknas en gång och återkomst kräver Fortsätt. 372 ordinarie och 2 isolerade databastester godkända; telefonpaketering och källkontroll godkända.
- [ ] Verklig telefonlåsning och installerad iOS/Android: kräver fysisk telefon och Xcode/Android SDK; simulerad native-händelse, liggande input, paus, Fortsätt och återöppning verifierade i webbläsare.

## K1: Telefonpaketets backendkoppling (2026-11-11)
- [x] Rättad importstyrning och autentiserad native-klient för samtliga nio backendanrop; Sudokus egen tjänsteadress används.
- [x] 347 ordinarie tester och 2 isolerade databastester godkända; lokalt telefonpaket byggt, native-källkontroll och AdMob-patchkontroll godkända. Faktisk profil och rapportering verifierade genom paketet via lokal testkoppling.
- [ ] Installerad iOS/Android och publicerad tjänsteadress: kräver telefonverktyg och senare publicering; ingenting publiceras i denna åtgärd.

## Förenklade inställningar och tydligare regler (2026-11-11)
- [x] Profilgenväg och profilrubrik borttagna; namn och bildval behållna. Vald bild sparad och återläst med autentiserad session i telefonstor webbläsare.
- [x] Rätt siffra avmarkerar rutan direkt; endast mörk bricka och vibration valbara, äldre hjälpreglage normaliseras till på.
- [x] Regler rättade på 40 språk; 295 tester godkända och mobilvy kontrollerad utan sidfel.
- [ ] Bildbibliotekets systemruta i installerad iPhone-app: kräver riktig telefon; befintlig filväljare utan kameratvång behållen.

## Belöningsannonser för ledtrådar (2026-11-11)
- [x] Inför godkänt iOS Rewarded-ID, frivilligt erbjudande på 40 språk och exakt en spelbunden ledtråd per SDK-belöning.
- [x] Verifiera fel, dubbelhändelser, spelbyte, sparning och treledtrådsgräns: 291 vanliga tester och 2 isolerade databastester godkända, native-källkontroll och iOS-patchkontroll godkända; slutrapport sparad.
- [ ] Verklig iPhone: SDK-visning, kontots belöningsinställningar, bakgrund och UMP/ATT kräver installerad testapp och native-verktyg. Inget signerats eller publicerats.

## iOS AdMob-produktionsuppgifter (2026-11-11)
- [x] Bekräftade iOS-ID:n införda; Android oförändrat och Googles enheter används i utveckling. Synkskydd och UMP-ordning verifierade.
- [x] Ledtråd, dubbelvisning och sparning granskade; 257 tester godkända och återöppning provad utan sidfel.
- [x] Ägaren har godkänt byte från ledtrådsmellanannons till frivillig belöningsannons med SDK-bekräftelse.
- [ ] Verklig annonsvisning/UMP: kräver installerad app och kontots meddelanden; ingen publicering.

## Lanseringsförberedelser steg 1 (2026-11-11)
- [x] Konsekvent native-identitet/version; endast tillfälligt Android-ID etablerat i projektet, Google Play-registrering ej tillgänglig.
- [x] Sudoku-ikoner/startbilder, borttagna oanvända kamera-/pushinställningar och säkra AdMob-synkskript.
- [x] Uppdaterade verifieringskontroller, tester och dokumentation; 250 tester och native source-kontroll godkända; ingen signering/publicering.
- [ ] Externa produktionsuppgifter och installerad telefonprovning: inväntar ägarens uppgifter och native-verktyg.

## iPhone-frågor, profilbild och dokumentation (2026-11-11)
- [x] Översatt spårnings- och bildfrågor på 40 språk och registrerat i iPhone-appen; 17 relevanta tester och native source-verifiering godkända.
- [x] Befintlig bildväljare, autentiserad sparning och återöppning verifierade i 393×706 utan sidfel eller sidöverflöde; inga nya capabilities.
- [x] Ersatt tre ärvda Ludo-rapporter och rättat kvarlämnade push-/QR-kontroller. Inaktiv Push capability och QR-kameratext borttagna; Sudoku har inte push.
- [ ] iPhones verkliga systemfrågor och bildväljare: kräver nytt installerat appbygge och riktig telefon.

## Historik: tidigare ledtrådsflöde (ersatt av Rewarded ovan)
- [x] Ledtråd fyller markerad tom/felaktig ruta; utan markering behålls befintligt val av ruta. Redan rätt ruta förbrukar ingen ledtråd.
- [x] Jämför annonsers tider, UMP och ATT med Ludo/Yatzy utan ändringar där. Samma UMP/ATT som Ludo, uppstartsdelay 1,5 s och 60 s skydd mot efterföljande App Open; inga återkomstannonser enligt ägarens val av en uppstartsannons. Ludos återkomstgräns är 40 s, Yatzys nu 20 s — dessa används inte i Sudoku.
- [x] Mellanannons per använd ledtråd samt vid Hem/Spela igen efter löst eller förlorat spel. 228 tester godkända; markerad/automatisk ledtråd, gräns 3, vinst→spela igen och förlust→hem provade i 393×706 utan sidfel eller scroll.
- [ ] Annonsvisning inklusive UMP/ATT på installerad telefon: kräver native app och riktig enhet; endast Googles prov-ID:n tills Sudoku får egna.

## Jämförelse och snabbare Sudoku (2026-11-11)
- [x] Jämför Ludos spel, sidor, inställningar, statistik, annonser och admin utan att ändra Ludo; skillnader redovisade utan nya funktioner.
- [x] Förladda lokala sidor, korta startsidans intoning och skapa brickor i browser worker med engångsförberedelse. 217 tester godkända; sju nivåer, spelstart, paus och sparning verifierade i telefonstor webbläsare. Installerad iPhone återstår.

## Före släpp
- [ ] Riktiga annonser på installerad telefon: iOS-produktions-ID:n är införda för Rewarded, uppstart och efter spel; utveckling använder Google-testannonser, Android har inga godkända produktions-ID:n.
- [ ] Provning på riktig telefon: Mästare och Omöjlig, paus, avsluta spel, vinstfirande
- [x] Liggande spelsida anpassad och verifierad i telefon- och iPad-storlekar; installerad enhet återstår ovan.
- [ ] Långa ord på knapparna kan kortas av på vissa språk

## Klart
- [x] Sju nivåer: Lätt, Medel, Svår, Expert, Ultraexpert, Omöjlig, Mästare – varje nivå låst av en egen teknikkontroll
- [x] Månadens flitigaste, årstatistik 2026, sparade spel, effekter och felgräns

