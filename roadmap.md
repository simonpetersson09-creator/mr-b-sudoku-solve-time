# Roadmap: Mr.B. Sudoku

## Belöningsannonser för ledtrådar (2026-11-11)
- [ ] Inför godkänt iOS Rewarded-ID, frivilligt erbjudande på 40 språk och exakt en spelbunden ledtråd per SDK-belöning.
- [ ] Verifiera fel, dubbelhändelser, spelbyte, sparning, treledtrådsgräns och hela tillgängliga testsviten; skriv slutrapport.
- [ ] Verklig iPhone: SDK-visning, kontots belöningsinställningar, bakgrund och UMP/ATT kräver installerat osignerat/testsignerat telefonbygge och native-verktyg.

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

## Ledtråd och annonser (2026-11-11)
- [x] Ledtråd fyller markerad tom/felaktig ruta; utan markering behålls befintligt val av ruta. Redan rätt ruta förbrukar ingen ledtråd.
- [x] Jämför annonsers tider, UMP och ATT med Ludo/Yatzy utan ändringar där. Samma UMP/ATT som Ludo, uppstartsdelay 1,5 s och 60 s skydd mot efterföljande App Open; inga återkomstannonser enligt ägarens val av en uppstartsannons. Ludos återkomstgräns är 40 s, Yatzys nu 20 s — dessa används inte i Sudoku.
- [x] Mellanannons per använd ledtråd samt vid Hem/Spela igen efter löst eller förlorat spel. 228 tester godkända; markerad/automatisk ledtråd, gräns 3, vinst→spela igen och förlust→hem provade i 393×706 utan sidfel eller scroll.
- [ ] Annonsvisning inklusive UMP/ATT på installerad telefon: kräver native app och riktig enhet; endast Googles prov-ID:n tills Sudoku får egna.

## Jämförelse och snabbare Sudoku (2026-11-11)
- [x] Jämför Ludos spel, sidor, inställningar, statistik, annonser och admin utan att ändra Ludo; skillnader redovisade utan nya funktioner.
- [x] Förladda lokala sidor, korta startsidans intoning och skapa brickor i browser worker med engångsförberedelse. 217 tester godkända; sju nivåer, spelstart, paus och sparning verifierade i telefonstor webbläsare. Installerad iPhone återstår.

## Före släpp
- [ ] Riktiga annonser: ledtråd, uppstart och efter spel använder fortfarande Googles testannonser
- [ ] Provning på riktig telefon: Mästare och Omöjlig, paus, avsluta spel, vinstfirande
- [ ] Liggande läge på spelsidan är inte anpassat
- [ ] Långa ord på knapparna kan kortas av på vissa språk

## Klart
- [x] Sju nivåer: Lätt, Medel, Svår, Expert, Ultraexpert, Omöjlig, Mästare – varje nivå låst av en egen teknikkontroll
- [x] Månadens flitigaste, årstatistik 2026, sparade spel, effekter och felgräns

# Roadmap: Nya onlineregler (spec 2026-11-04) — KLAR

## Adminstatistik och tekniska fel (2026-11-08)
- [x] Koppla telefonens valda namn till samma onlineprofil, återförsök offline/start/återkomst; namn läst tillbaka via riktig profil i mobilvy. Månadens flitigaste nollställd med gräns 8 november 13:00:01 UTC utan raderade resultat. 367 enhetstester och 36 isolerade databastester godkända; ett befintligt översättningstest rapporterar fyra oanvända nycklar från tidigare dolda adminloggar. Namnkoppling i installerad app kräver nytt appbygge.
- [x] Undanta Simons bekräftade iPhone/konto från adminens aktivitetsstatistik, historiskt och framåt; resultat och diagnostik bevarade. 6 enhetstester + isolerat databastest godkända; riktig admin visar 0 aktiva enheter idag. Publicerad admin kräver publicering av ändringen.
- [x] Datumrader i tabell och diagram börjar vid statistikens nollställning 8 november; inga tomma oktoberrader före mätstart.
- [x] Dölj tekniska fel och annonshändelser i admin utan att radera loggar; appstartsdiagnostik börjar 8 november 2026 UTC, inom rullande 30 dagar.
- [x] Rättat adminvyn efter Yatzys fullbreddstabell, kolumnkontroller, rekord och linjediagram. 12 tester godkända; riktig admin verifierad på dator/mobil, 509 diagnostikrader hämtade/kopierade. Ludos befintliga mätvärden används; saknade uppdelningar visas som —, UTC och rullande 30 dagar behålls. Utloggning ersätts av tillbaka för att bevara spelaridentiteten.
- [x] Yatzys AdMob-diagnostiksektion i Ludo: utfällning, hämta 30 dagar, kopiera, samma loggruta och uppdatera-knapp; 509 riktiga rader hämtade/kopierade som admin. 357 tester och 34 isolerade databastester godkända. Övriga adminens dagstabell/diagram är fortsatt Ludos, inte kopior av hela Yatzy-admin.
- [x] Detaljerad, integritetssäker tidsmätning för profil, vänner och snabbspel i befintliga serverloggar; 356 tester och 33 isolerade databastester godkända. Verkliga nya mätvärden kräver publicering och appaktivitet.
- [x] Nollställ adminstatistik med ny mätstart 2026-11-08 09:43 UTC; spelarresultat och diagnostik bevarade, databasverifierat.
- [x] Granska adminens tekniska fel: push-pluginets Promise-assimilering och Androids saknade randomUUID; äldre webbfel inte reproducerade. Endast granskat, inte åtgärdat.

## Implementerat och verifierat
- [x] Privat match: endast värden startar, minst 2 människor, ingen AI-ifyllnad, ingen autostart vid full lobby
- [x] Väninbjudan: accepterad inbjudan startar matchen direkt (separat flöde bevarat)
- [x] Privata matcher: ingen server-AI/autodrag, ingen auto-uppgivning — pausas och återupptas (test: 2 h och 14 dagar)
- [x] Väntrum: platsen tas bara bort vid uttryckligt "Lämna" (verifierat i koden)
- [x] Snabbspel: 6 s färskhet i matchningen (var 10 s), hård timeout på alla nätverksanrop i sökningen
- [x] Snabbspel: AI-övertagande efter 60 s (var 30 s), även vid ansluten men inaktiv spelare; ingen auto-uppgivning
- [x] Notiser: "Datorn spelar för [namn]" + "[namn] är tillbaka" (40 språk)
- [x] Uppgivning under de två första omgångarna → permanent AI-plats om annan människa finns kvar; AI ger aldrig statistik
- [x] Rensning: privat spelande 14 dagar, snabbspel 24 h/10 min, väntande lobby 6 h — verifierat mot databasen
- [x] Schemalagda jobb verifierade: minutjobb (AI-övertagande) + timjobb (rensning), båda aktiva
- [x] 298 tester + typkontroll + bygg grönt

## Kvar att verifiera på riktiga telefoner
- [ ] Två enheter: privat match pausad i timmar och återupptagen med samma ställning
- [ ] Två enheter: snabbspel med AI-övertagande, återkomst och tidig uppgivning
- [ ] Push vid "din tur" i pausad privat match
