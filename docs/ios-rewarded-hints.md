# Mr B Sudoku – belöningsannonser för ledtrådar

## Levererat

- Frivilligt erbjudande innan annonsvisning, med avbryt och acceptans på alla 40 språk.
- iOS Rewarded: `ca-app-pub-7448540924654868/8705213764`. Produktion kräver SDK-belöning med `amount: 1`, `type: Hint` och annonsförsökets matchande `attemptId`.
- Utveckling använder Googles Rewarded-enhet `ca-app-pub-3940256099942544/1712485313`. Googles egna belöningsmetadata accepteras där, men ger exakt en ledtråd.
- Androids befintliga App ID/App Open/Interstitial är oförändrade. Rewarded var okonfigurerat och är fortsatt avstängt på Android; inga iOS-ID:n används där.
- App ID, App Open-ID och Interstitial efter spel är oförändrade. Ledtrådskopplingen till Interstitial är borttagen.

## Belöningshändelse och dubbelskydd

Den befintliga native-patchen skickar SDK-händelser med `attemptId`. Bara en giltig `Rewarded`-händelse ger belöning; en stängningshändelse eller ett löfte med `rewarded: true` är inte tillräckligt. Händelsen belönar direkt, innan stängning, så ett senare stängningsfel inte tar bort belöningen. En sent levererad SDK-belöning efter stängning kopplas tillbaka till samma annonsförsök.

`createHintReward` har ett engångsskydd. Spelsidan kontrollerar aktuell spelidentitet, aktivt sparat spel, monterad spelsida, avslutat/förlorat spel och treledtrådsgränsen. Gamla belöningar kan därför aldrig fylla ett nytt spel. Spelet sparas synkront vid belöningshändelsen. Sudoku-motorn, statistikreglerna och upplåsningsreglerna har inte ändrats.

## Fel, tid och bakgrund

- Laddningsfel, nekad UMP-behörighet, saknad annons eller stängning utan reward ger ingen ledtråd och förbrukar inget.
- Laddningsväntan har tidsgräns, men en pågående native-laddning behåller sin ägare. Sen laddning visar aldrig automatiskt en annons.
- Om visningen inte öppnas inom 20 sekunder blir status väntande. Ingen ledtråd förbrukas; helskärmslåset behålls tills SDK rapporterar faktisk stängning/fel. En okancellable native-visning släpps inte bara för att en timer går ut.
- App i bakgrunden får inte starta visning efter laddning. En redan öppen annons behåller ägarskap; giltig reward är fortfarande giltig. Speltiden och inmatningen stoppas under erbjudande/annonsväntan.
- Om SDK varken stänger eller felrapporterar förblir helskärmslåset upptaget tills SDK svarar eller appen startas om. Detta skyddar mot dubbla annonser; återhämtning måste telefonprovas.
- Nästa Rewarded förladdas efter avslutad visning. UMP → ATT → initiering → annonsbegäran behålls. Integritetsändringar ogiltigförklarar annonscache och generationer.
- Befintliga frekvensregler för App Open och avslutade spel ändras inte.

## Verifiering

- Hela vanliga sviten: **291 godkända, 0 misslyckade**, 51 testfiler.
- Isolerad lokal databassvit: **2 godkända, 0 misslyckade**, 2 testfiler. Ingen live-databas användes.
- Slutligt omprov efter dialogens utseendejustering: **9 godkända, 0 misslyckade** spelflödestester.
- Native source-only och iOS AdMob-patchkontroll godkända. Ingen native-kompilering, signering eller publicering gjord.
- Förhandsvisning, 394×852: nytt spel → erbjudande → avbryt → acceptans utan native-annons → återöppning. 81 rutor, samma spel/siffror, 0 förbrukade ledtrådar, inga sidfel eller sidöverflöden. Dialog och felbesked granskade visuellt.
- Verkligt SDK-reward kan inte produceras av webbpreview. Det positiva spelflödet verifierades genom spelsidan med simulerade SDK-händelser, inklusive dublett och återställning.

## Återstår på riktig iPhone

1. Installera nytt testbygge med alla befintliga native-patchar. Mac/Xcode är inte tillgängligt här.
2. Bekräfta Rewarded-enhetens inställningar i AdMob: belöning 1 / Hint och koppling till rätt iOS-app.
3. Prova UMP-formulär och ATT på verklig telefon, med kontots korrekta meddelanden.
4. Visa testannons, stäng utan belöning, slutför för belöning, prova bakgrund/återkomst och sena/felaktiga stängningssvar.
5. Kontrollera att App Open och avslutsannonser inte överlappar Rewarded.
6. Använd Google-testenhet i utveckling; produktionslikt testbygge får bara använda produktions-ID med registrerad testenhet. Kontots testenhetsregistrering är inte verifierad.

Ingen ändring har gjorts i Mr B Ludo eller Mr B Yatzy.
## Exakt ändrade projektfiler

- `AGENTS.md`
- `docs/ios-rewarded-hints.md`
- `roadmap.md`
- `src/lib/ads/admob.ts`
- `src/lib/ads/hint-interstitial.test.ts` — borttagen, ersatt av Rewarded-tester.
- `src/lib/ads/hint-reward-flow.test.tsx`
- `src/lib/ads/hint-reward.test.ts`
- `src/lib/ads/hint-reward.ts`
- `src/lib/ads/hint-rewarded-sdk.test.ts`
- `src/lib/ads/ios-production.test.ts`
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
- `src/routes/play.tsx`
