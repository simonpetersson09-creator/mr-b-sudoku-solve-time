// Svenska — fallback-språk och källa för alla nycklar.
export const sv = {
  // Generellt
  back: "Tillbaka",
  loading: "Laddar…",
  save: "Spara",
  undo: "Ångra",
  genericError: "Något gick fel",

  // Startsida
  stats: "Statistik",
  settings: "Inställningar",

  // Ny match

  // Färger

  // Spelskärm
  home: "Hem",
  notFoundTitle: "Sidan finns inte",
  notFoundBody: "Sidan du letar efter finns inte eller har flyttats.",
  rateNow: "Ge betyg",
  rateLater: "Senare",
  errorPageTitle: "Sidan kunde inte laddas",
  errorPageBody: "Något gick fel hos oss. Försök igen eller gå tillbaka till start.",
  tryAgain: "Försök igen",
  reconnecting: "Återansluter…",
  playAgain: "Spela igen",

  // Regler
  rulesTitle: "Regler",

  // Inställningar
  settingsTitle: "Inställningar",
  yourName: "Ditt namn",
  haptics: "Vibration",
  languageLabel: "Språk",

  // Statistik
  statsTitle: "Statistik",
  statWins: "Vinster",
  resetStats: "Nollställ statistik",

  // Inloggning
  signIn: "Logga in",
  playerName: "Spelarnamn",
  pinCode: "PIN",

  // Online-lobby
  profile: "Profil",
  admin: "Admin",

  // Väntrum

  // Profil
  profileTitle: "Profil",
  profileSaved: "Profilen sparad",
  saveFailed: "Kunde inte spara",
  avatar: "Avatar",
  country: "Land",

  // Vänner

  // Topplista

  // Admin
  adminTitle: "Admin",
  noAdmin: "Du har inte adminbehörighet.",
  adminPlayers: "Spelare totalt",
  adminActive24: "Aktiva 24 h",
  adminRetD1: "Retention D1 %",
  adminRetD7: "Retention D7 %",
  adminRetD30: "Retention D30 %",
  last30Days: "Senaste 30 dagarna",
  colDate: "Datum",
  colAppDevices: "Appenheter",
  colStarted: "Startade",
  colFinished: "Avslutade",

  // Serverfel (koder från online-funktionerna)
  errNameShort: "Namnet måste ha minst 2 tecken",
  errInvalidCountry: "Ogiltigt land",
  errBadAction: "Ogiltigt drag",
  errMissing: "Saknas",
  errRateLimited: "Vänta en stund innan du skickar igen",
  errForbidden: "Åtkomst nekad",
  statGamesShort: "Spelade",
  changeAvatar: "Byt bild",
  removeAvatar: "Ta bort",
  avatarSaved: "Profilbild sparad",
  avatarRemoved: "Profilbild borttagen",
  avatarLocalOnly: "Profilbilden gäller bara på den här enheten",
  adPrivacy: "Annonsinställningar",
  resetStatsConfirm: "Är du säker? All statistik raderas.",
  resetDone: "Statistik återställd",
  deleteData: "Radera mina uppgifter",
  deleteDataConfirm: "Radera permanent",
  deleteDataError: "Raderingen kunde inte slutföras. Kontrollera internetanslutningen och försök igen.",
  deleteDataDone: "Dina spelaruppgifter är raderade",
  deleteDataRestart: "Dina uppgifter har tagits bort från telefonen och våra aktiva spelarregister. Tryck OK för att börja om som en ny spelare.",
  cancel: "Avbryt",
  ok: "OK",
  deleteDataAcknowledge: "Jag förstår att detta inte kan ångras.",
  storeApple: "App Store",
  storeGoogle: "Google Play",
  appVersion: "Version {v}",
  adminChartDevices: "Appenheter per dag",
  adminChartMinutes: "Snittid per besök (min)",
  adminChartMinutesNote: "Hur länge appen är öppen per besök, iPhone och Android.",
  adminSessions: "Besök",
  firstPlayHint: "Börja här – spela direkt!",
  adPrivacyChange: "Ändra annonsval",
  adChoiceStorage: "Spara på enheten",
  adChoiceProfile: "Anpassade annonser",
  adChoiceUseProfile: "Använda annonsprofil",
  adChoiceAllowed: "Tillåtet",
  adChoiceDenied: "Nekat",
  adChoiceUnknown: "Okänt",
  adPrivacyFailed: "Det gick inte att öppna annonsvalen just nu",

  // Sudoku
  tagline: "Sudoku – 81 rutor, en lösning",
  rateTitle: "Gillar du Mr.B. Sudoku?",
  rateBody: "Du har löst flera Sudoku! Ett betyg hjälper oss enormt. 💛",
  rule1: "Fyll rutnätet så att varje rad, kolumn och 3×3-ruta innehåller siffrorna 1–9 exakt en gång.",
  rule2: "Varje pussel har exakt en lösning. Givna siffror kan inte ändras.",
  rule3: "Tryck på en ruta och sedan på en siffra. Felaktiga siffror markeras i rött.",
  rule4: "Slå på Anteckningar för att skriva små kandidatsiffror i en ruta.",
  rule5: "Ångra tar tillbaka senaste draget. En ledtråd fyller i rätt siffra men räknas inte som vinst.",
  rule6: "Spelet sparas automatiskt. Du kan ha upp till 10 pågående spel.",
  statPlayed: "Spelade",
  adminInMatch: "Aktiva nu",
  adsOffInfo: "Mr.B. Sudoku visar annonser från Google. Du kan ändra dina annonsval här nedan.",
  deleteDataDescription: "Ditt namn, profilbild, statistik och sparade spel raderas från telefonen och servern. Fortsätter du spela skapas en ny spelaridentitet.",
  storeSoon: "Mr.B. Sudoku finns snart i App Store och Google Play.",
  webOnlyTitle: "Mr.B. Sudoku spelas i appen",
  webOnlyBody: "Ladda ner appen gratis och lös Sudoku i fyra nivåer – även utan internet.",
  newGame: "Nytt spel",
  newGameTitle: "Nytt spel",
  chooseLevel: "Välj nivå",
  givensN: "{n} givna siffror",
  startGame: "Starta",
  resumeGame: "Fortsätt pågående spel",
  levelEasy: "Lätt",
  levelMedium: "Medel",
  levelHard: "Svår",
  levelExpert: "Expert",
  rules: "Regler",
  gameHelp: "Spelhjälp",
  showMistakes: "Visa fel",
  showMistakesDesc: "Felaktiga siffror markeras i rött",
  highlightSame: "Markera samma siffror",
  autoRemoveNotes: "Ta bort anteckningar automatiskt",
  statBestTime: "Bästa tid",
  statAvgTime: "Snittid",
  statsNote: "Spelade räknar bara färdiga spel. Vinst = löst utan ledtråd.",
  hofGamesTitle: "Månadens flitigaste",
  hofGamesSubtitle: "Flest lösta Sudoku den här månaden",
  hofGames: "spel",
  hofEmpty: "Ingen har löst något Sudoku än den här månaden",
  mistakes: "Fel",
  level: "Nivå",
  pause: "Pausa",
  endShort: "Avsluta",
  time: "Tid",
  resume: "Fortsätt",
  paused: "Pausat",
  tapToResume: "Tryck för att fortsätta",
  board: "Sudokubräde",
  cellLabel: "Rad {row}, kolumn {col}",
  erase: "Radera",
  notes: "Anteckningar",
  hint: "Ledtråd",
  solvedTitle: "Löst!",
  gameOverTitle: "Spelet är slut",
  gameOverBody: "Du gjorde {n} fel. Försök igen!",
  endGame: "Avsluta spel",
  endGameBody: "Spelet raderas och räknas inte i statistiken.",
};

export type TranslationKey = keyof typeof sv;
