// Brontaal én vangnet: ontbreekt een vertaling in een andere taal, dan valt i18next hierop terug.
// Enkel teksten die zichtbaar zijn zonder Admin-mode worden vertaald; alles wat enkel in
// Admin-mode verschijnt (wedstrijdregistratie, Inzichten, bewerk-/verwijderknoppen) blijft
// gewoon Nederlands in de componenten zelf staan.
export const nl = {
  nav: {
    start: 'START',
    matches: 'WEDSTRIJDEN',
    team: 'PLOEG',
  },
  language: {
    label: 'Taal',
  },
  common: {
    opponent: 'Tegenstander',
    quarter: 'Kwart {{number}}',
  },
  scoreboard: {
    live: '● Live',
    lastMatch: 'Laatste wedstrijd',
    won: 'GEWONNEN 🎉',
    lost: 'VERLOREN ⚽️',
    draw: 'GELIJKSPEL 🤝',
    minuteUnit: 'min',
  },
  dashboard: {
    noData: 'Nog geen wedstrijdgegevens',
    resultsForm: 'Resultaten & Vorm',
    winShort: 'W',
    drawShort: 'G',
    lossShort: 'V',
    // Letters in de bolletjes van de laatste 5 wedstrijden
    formWin: 'W',
    formLoss: 'L',
    formDraw: 'D',
    noFormData: 'Geen data',
    goalDiff: 'Doelsaldo',
    goalsFor: 'voor',
    goalsAgainst: 'tegen',
    teamStats: 'Team Stats',
    matches: 'Matchen',
    goals: 'Goals',
    assists: 'Assists',
    tackles: 'Tackles',
    saves: 'Saves',
    fun: 'Plezier',
    season: 'Seizoen {{season}}',
  },
  history: {
    title: 'Wedstrijden',
    empty: 'Nog geen voltooide wedstrijden.',
    course: 'Wedstrijdverloop',
    noEvents: 'Geen events dit kwart.',
  },
  timeline: {
    unknown: 'Onbekend',
    goal: 'Goal',
    ownGoalOpponent: 'Eigen doelpunt tegenstander',
    assist: 'Assist',
    tackle: 'Tackle',
    save: 'Redding',
    opponentGoal: 'Tegendoelpunt',
    injury: 'Blessure',
    substitution: 'Wissel',
  },
  goalTypes: {
    collectieve_aanval: 'Collectieve aanval',
    individuele_actie: 'Individuele actie',
    hoekschop: 'Hoekschop',
    vrije_trap: 'Vrije trap',
    penalty: 'Penalty',
    counter: 'Counter',
    rebound: 'Rebound',
    kopbal: 'Kopbal',
    owngoal: 'Owngoal',
  },
  team: {
    title: 'Ploeg',
    playerSubtitle: 'Speler U10 Kaulille',
    matches: 'Matchen',
    goals: 'Goals',
    assists: 'Assists',
    tackles: 'Tackles',
  },
  // Teksten met een aantal. i18next kiest zelf de juiste meervoudsvorm per taal
  // (_one, _two, _few, _many, _other, _zero — afhankelijk van de taal), daarom worden deze
  // niet mee gecontroleerd door het Locale-type hieronder.
  plurals: {
    viewers_one: '{{count}} kijker volgt mee',
    viewers_other: '{{count}} kijkers volgen mee',
    // Bewust geen enkelvoud: zo stond het er al ("1 Reddingen").
    saves_one: '{{count}} Reddingen',
    saves_other: '{{count}} Reddingen',
  },
};

// Elke vertaling moet exact dezelfde sleutels hebben als het Nederlands (behalve de
// meervoudsvormen), zodat TypeScript meteen klaagt als er ergens een tekst ontbreekt.
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type Locale = Shape<Omit<typeof nl, 'plurals'>> & { plurals: Record<string, string> };
