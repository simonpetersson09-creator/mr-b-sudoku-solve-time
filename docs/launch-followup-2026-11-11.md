# Språk, iPad och lanseringsläge

## Denna ändring
- Enhetens språk identifierades redan vid första start. Sparat automatiskt val uppdateras nu vid läsning, språkändring och native-återkomst. Manuellt val och äldre sparade val har företräde. 40 språk och befintlig svensk fallback behålls.
- Dokumentets språk följer gränssnittet för skärmläsare.
- Stående iPad har bredare men begränsad bricka och större kontroller; liggande iPad har bricka vänster och kontroller höger. Delad skärm använder den befintliga mindre layouten.
- Ludo revision 60bfc920 lästes skrivskyddat. Dess native-klient anropar den egna publicerade serverns `/api/public/native` direkt med spelarens bearer. Sudoku använder redan samma upplägg, sin egen adress och `redirect: error`. Ingen serverändring eller gemensam server behövs för detta önskemål.

## Tidigare rättningar återkontrollerade
- Helskärmsägarskap kvar efter timeout tills SDK avslutar, regressionstester godkända.
- Spelbundna fördröjningar och tangentblockering bakom dialog, regressionstester och webbläsarflöde godkända.
- Genereringsworker har 20 sekunders gräns, städning och ingen synkron fallback; regressionstester godkända.
- Rapportering validerar format och använder befintlig atomisk användarbunden räknare, hanterar skrivfel och kontrollerar lagrade speldubbletter. Detta bevisar inte verkliga offline-resultat från en manipulerad klient; dubblettkontrollen är inte en atomisk unikhetsgaranti för samtidiga anrop.
- Fokusfälla, cellinformation, zoom, minskad rörelse, befintliga inloggningsdestinationer och tidigare text/kodstädning kvar. Fullständig VoiceOver/TalkBack-certifiering är inte gjord.

## Verifiering
- 393 tester i 58 filer samt 2 isolerade databastester godkända.
- Previewkontroll: build OK, inga sidfel i provade flöden.
- iPad 768×1024, 1024×768, 820×1180, 1180×820, 1024×1366, 1366×1024 och delad skärm 507×768: bricka, rubrik, verktyg och sifferknappar inom skärmen. Rätt siffra, bakgrundspaus/sparning, Fortsätt och återöppning verifierade. Inställningar utan sidöverflöde på 1024×768.
- iPhone 394×852 och 320×568 samt liggande 852×394 behåller tidigare mått.
- Automatiskt franska och manuellt svenska trots japanskt enhetsspråk verifierade i gränssnittet.
- Native-källkontroll godkänd. Full `native:verify` misslyckar eftersom Androids synkade public/index.html och capacitor.config.json saknas. Ingen full native-kompilering, ny paketering eller plattformssynk utförd. Mac/Xcode och Android SDK saknas.

## Återstår inför lansering
1. Synka den nya appversionen till båda nativeprojekten, kompilera och prova installerad iPhone/iPad/Android: rotation/delad skärm, språk, VoiceOver/TalkBack, bildbibliotek/HEIC, bakgrund/lås, offline/omstart samt svåra nivåers prestanda.
2. Prova verkliga annonser och UMP/ATT, sena stängningar och belöningar. Androids egna produktions-ID:n saknas; Rewarded är inte produktionskonfigurerat där och ger därför inga Android-ledtrådar.
3. Färdigställ integritetspolicy, kontaktuppgifter, app-ads.txt och butikernas datadeklarationer/SDK-integritetsuppgifter; riktiga butikslänkar och signerings-/kontouppgifter återstår.
4. Publicera senare den uppdaterade Sudoku-servern innan installerade appers profil, admin och rapportering förväntas använda de nya rättningarna. Ingenting publiceras här.
5. Bedöm och åtgärda tidigare noterade beroendesårbarheter; ingen ny säkerhetsskanning eller beroendeändring gjord här. Fullständigt manipulationsskydd för lokala offline-resultat ingår inte.

Bedömning: inte verifierad redo för butikslansering; lokala tester är gröna men installerad provning, externa uppgifter och driftsättning återstår. Ludo och Yatzy är orörda.