# Mr. B Sudoku – rättningar A1, A2 och A3

Datum: 2026-11-11. Endast Sudoku har ändrats. Ingen publicering, signering, installation av beroenden eller ändring i Ludo/Yatzy.

## Resultat
- **A1:** Progressionens migrationsunderlag läses före skrivning av det nya resultatet. Första avslutade spelet räknas en gång i årssiffror, all-time och progression. Medel öppnas först efter tre olika avslutade Lätt-spel. Befintlig livslång progression och engångsregistret bevaras.
- **A2:** Belönad ledtråd placeras utan Ångra-post. Tidigare historik rensas vid belöningen enligt motorns befintliga ledtrådsregel, så gamla siffer-/anteckningsögonblicksbilder inte kan skriva över ledtråden. Senare vanliga sifferdrag kan fortfarande ångras. Tre Ångra och tre ledtrådar samt SDK-belöningsvillkoren är oförändrade.
- **A3:** En spelbunden monoton klocka räknar även delsekunder före paus, väntan på ledtråd/annons, bakgrund, navigation och det sista draget. Paustid räknas inte, dubbla bakgrundshändelser debiterar inte två gånger och aktiv tid kapas inte vid fördröjda klockslag. Sista dragets tid finns i resultat/statistik före firandet. Uttryckligen raderade spel återställs inte av sidans avslutande sparning. Avslutsbekräftelsens befintliga tidsbeteende är oförändrat fram till bekräftelsen.

## Ändrade filer
- `src/lib/player/storage.ts` – rättad ordning för migrationsläsning.
- `src/lib/player/storage.test.ts` – första räkningen, tre-spelsgränsen och bevarade äldre framsteg.
- `src/lib/ads/hint-reward.ts` – ej ångringsbar belöning och historikgräns.
- `src/lib/ads/hint-reward.test.ts` – direkt Ångra, äldre peer-historik, återläsning och senare vanliga drag.
- `src/lib/sudoku/play-clock.ts` – ny ren, spelbunden tidsmätare.
- `src/lib/sudoku/play-clock.test.ts` – sex tidsregressioner.
- `src/routes/play.tsx` – anslutning av klockan till spelhändelser och stopp/sparning.
- `src/lib/ads/hint-reward-flow.test.tsx` – verklig spelvy med kontrollerad monoton tid, paus, sista drag, belöning och avmontering; befintligt bakgrundstest uppdaterat till samma tidskälla.
- `AGENTS.md` – dokumenterade skyddsregler.
- `roadmap.md` – avgränsning och verifiering.
- `docs/launch-a1-a3-fixes.md` – denna rapport.

## Verifiering
- Hela ordinarie sviten: **415 tester i 61 testfiler godkända** (tidigare 400; 15 nya regressionstester).
- Isolerad databas: **2 tester i 2 testfiler godkända**, ingen produktionsdatabas använd för dessa tester.
- Totalt: **417 godkända tester**.
- Förhandsvisningens automatiska byggkontroll: godkänd.
- Webbläsarprovning av faktisk spelvy: fyra cirka 700ms aktiva intervaller räknades, pausvärdet var oförändrat under väntan, sifferdrag sparades, Tillbaka sparade tid och återöppning behöll tid/drag. Simulerad native-bakgrund pausade brickan. Inga sidfel. Belöningsflödet verifierades med simulerade SDK-callbacks i befintliga spelvytester, inte med riktiga annonser.

## Kvarstående begränsningar
- Installerad iPhone/iPad/Android och riktiga annonsbelöningar återstår att prova på fysisk utrustning. Inget native-paket har byggts eller synkats i denna avgränsade rättning.
- Tidigare felräknade sparade framsteg skrivs inte ned; underlaget kan inte säkert skilja felet från äldre korrekt progression. Förlorad tid från tidigare spel kan inte återskapas.
- Äldre sparningar saknar uppgift om exakt vilka rutor som belönats. Gammal ledtrådshistorik skrivs inte om genom gissning; Ångra-skyddet införs vid nya belöningar.
- Alla övriga fynd i senaste lanseringsgranskningen är lämnade orörda enligt uppdraget.