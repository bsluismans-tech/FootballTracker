import type { Game, Player, GoalType, FieldPosition, Quarter, Substitution } from '../types';
import { GOAL_TYPE_LABELS } from './goalTypes';
import { QUARTER_DURATION_MINUTES } from './matchTime';

// Groepeert de 8 veldposities tot 4 bredere groepen voor de "speelminuten per positie"-
// statistiek — makkelijker te vergelijken dan 8 aparte, vaak lege lijstjes.
export type PositionGroup = 'keeper' | 'verdediging' | 'midden' | 'aanval';

export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  keeper: 'Keeper',
  verdediging: 'Verdediging',
  midden: 'Midden',
  aanval: 'Aanval',
};

const POSITION_TO_GROUP: Record<FieldPosition, PositionGroup> = {
  keeper: 'keeper',
  verdediger_links: 'verdediging',
  verdediger_centraal: 'verdediging',
  verdediger_rechts: 'verdediging',
  middenvelder: 'midden',
  aanvaller_links: 'aanval',
  spits: 'aanval',
  aanvaller_rechts: 'aanval',
};

// Ontbreekt de minuut van een wissel (oude data van vóór de minuut-tracking), dan nemen we aan
// dat die op minuut 8 gebeurde: de uitgaande speler heeft dan 8' gespeeld, de ingaande speler
// de resterende 7' van het kwart — een bewuste, expliciete benadering i.p.v. exacte data eisen.
const ASSUMED_SUBSTITUTION_MINUTE = 8;

// Een wedstrijd bestaat uit 4 kwarten van elk 15' — samen het "maximaal mogelijke" aantal
// speelminuten voor een speler die alle wedstrijden waarbij hij aanwezig was, had meegespeeld.
const QUARTERS_PER_MATCH = 4;

export interface PlayerInsight {
  id: number;
  name: string;
  goals: number;
  assists: number;
  tackles: number;
  saves: number;
  minutesTotal: number;
  maxPossibleMinutes: number; // matchesPresent * 4 kwarten * 15'
  minutesPercentage: number; // 0-100, minutesTotal t.o.v. maxPossibleMinutes
  minutesByGroup: Record<PositionGroup, number>;
  minutesByPosition: Partial<Record<FieldPosition, number>>;
  matchesPresent: number;
  presencePercentage: number; // 0-100, t.o.v. het aantal wedstrijden binnen de huidige filter
  cleanSheets: number;
  quartersInGoalOrDefense: number; // noemer voor het clean-sheet-percentage
  minutesInGoalOrDefense: number;
  goalsAgainstInGoalOrDefense: number; // tegendoelpunten terwijl de speler keeper/verdediger was
  minutesInAttack: number;
  teamGoalsInAttack: number; // doelpunten van de ploeg terwijl de speler in de aanval stond
  injuries: number;
}

export interface GoalTypeCount {
  type: GoalType | 'onbekend';
  label: string;
  count: number;
}

export interface TeamInsight {
  totalGames: number;
  goalsForByType: GoalTypeCount[];
  goalsAgainstByType: GoalTypeCount[];
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgAssists: number;
  avgTackles: number;
  avgSaves: number;
}

// Twee spelers die samen op het veld stonden, met het doelsaldo tijdens die minuten.
export interface DuoInsight {
  playerIds: [number, number];
  minutes: number;
  goalsFor: number;
  goalsAgainst: number;
}

// Impact-groep van een speler (zie computeImpact): enkel 'positive'/'negative' als dat signaal
// stabiel is, anders 'unclear'. estimate dient enkel om binnen een groep te sorteren.
export type ImpactGroup = 'positive' | 'unclear' | 'negative';
export interface PlayerImpact {
  playerId: number;
  group: ImpactGroup;
  estimate: number;
  // Voor de uitleg aan trainers: doelpunten vóór/tegen met de speler op het veld versus op de
  // bank, enkel in wedstrijden waarop hij aanwezig was (en enkel doelpunten mét minuut).
  onField: { minutes: number; goalsFor: number; goalsAgainst: number };
  onBench: { minutes: number; goalsFor: number; goalsAgainst: number };
}

export interface InsightsData {
  team: TeamInsight;
  players: PlayerInsight[];
  duos: DuoInsight[];
  impact: PlayerImpact[];
}

// Alle seizoenen die in de data voorkomen, meest recente eerst.
export const getAvailableSeasons = (games: Game[]): string[] =>
  Array.from(new Set(games.map(g => g.seasonId).filter(Boolean))).sort((a, b) => b.localeCompare(a));

export interface QuarterSegment {
  start: number; // minuut (inclusief) waarop dit segment begint
  end: number; // minuut (inclusief) waarop dit segment eindigt
  lineup: Partial<Record<FieldPosition, number>>; // wie op elke positie stond tijdens dit segment
}

// Reconstrueert, voor één kwart, de opeenvolgende tijdssegmenten tussen wissels — elk segment
// met de exacte bezetting per positie tijdens dat interval. Dit is de basis voor zowel de
// speelminuten-per-positie-statistiek als de trio-analyses (beste verdediging/aanval).
// Ontbreekt de echte tijdsdata van het kwart (startedAt/endedAt, bestond nog niet in oude
// wedstrijden), dan wordt een volledig kwart van 15' aangenomen.
function computeQuarterSegments(quarter: Quarter): QuarterSegment[] {
  const positions = Object.keys(quarter.lineup || {}) as FieldPosition[];
  if (positions.length === 0) return [];

  // Blessuretijd (bv. een kwart dat 15+2' duurde) telt niet mee voor de speelminuten-statistiek:
  // we klemmen altijd af op de reguliere 15', ook als het kwart in werkelijkheid langer duurde.
  const rawEndMinute = quarter.startedAt && quarter.endedAt
    ? Math.max(1, Math.floor((new Date(quarter.endedAt).getTime() - new Date(quarter.startedAt).getTime()) / 60000) + 1)
    : QUARTER_DURATION_MINUTES;
  const endMinute = Math.min(rawEndMinute, QUARTER_DURATION_MINUTES);

  const sortedSubs = [...(quarter.substitutions || [])].sort(
    (a, b) => (a.minute ?? ASSUMED_SUBSTITUTION_MINUTE) - (b.minute ?? ASSUMED_SUBSTITUTION_MINUTE)
  );

  // BELANGRIJK: quarter.lineup wordt bij elke wissel in-place bijgewerkt, en bevat dus de
  // LAATSTE bezetting van het kwart — niet de beginopstelling. Om te weten wie er bij de start
  // van het kwart op elke positie stond, draaien we alle wissels terug in omgekeerde
  // chronologische volgorde (laatste wissel eerst) vanaf die eindstand.
  const startingLineup: Partial<Record<FieldPosition, number>> = { ...quarter.lineup };
  [...sortedSubs].reverse().forEach(sub => {
    const posEntry = (Object.entries(startingLineup) as [FieldPosition, number][]).find(([, pid]) => pid === sub.inId);
    if (posEntry) {
      startingLineup[posEntry[0]] = sub.outId;
    }
  });

  // Meerdere wissels op exact dezelfde minuut (bv. twee spelers tegelijk gewisseld) moeten
  // samen als één segmentgrens behandeld worden — anders schuift de tweede wissel in zo'n groep
  // per ongeluk een minuut op t.o.v. de eerste, puur door de volgorde van verwerking.
  const subsByMinute = new Map<number, Substitution[]>();
  sortedSubs.forEach(sub => {
    const minute = sub.minute ?? ASSUMED_SUBSTITUTION_MINUTE;
    if (!subsByMinute.has(minute)) subsByMinute.set(minute, []);
    subsByMinute.get(minute)!.push(sub);
  });

  const segments: QuarterSegment[] = [];
  const currentLineup: Partial<Record<FieldPosition, number>> = { ...startingLineup };
  let segmentStart = 1;

  for (const [rawMinute, subsAtMinute] of subsByMinute) {
    // Geklemd tussen het begin van dit segment en het einde van het kwart, zodat rare/oude
    // data (bv. een minuut van een vorig kwart) nooit tot negatieve of absurde duren leidt.
    const subMinute = Math.min(Math.max(rawMinute, segmentStart), endMinute);
    segments.push({ start: segmentStart, end: subMinute, lineup: { ...currentLineup } });

    // Alle wissels van deze minuut samen toepassen, telkens op de positie van de uitgaande speler.
    subsAtMinute.forEach(sub => {
      const posEntry = (Object.entries(currentLineup) as [FieldPosition, number][]).find(([, pid]) => pid === sub.outId);
      if (posEntry) {
        currentLineup[posEntry[0]] = sub.inId;
      }
    });
    segmentStart = subMinute + 1;
  }

  if (segmentStart <= endMinute) {
    segments.push({ start: segmentStart, end: endMinute, lineup: { ...currentLineup } });
  }

  return segments;
}

// Wie stond er op een bepaalde minuut van het kwart in één van de gegeven positiegroepen? Valt
// de minuut buiten het kwart (bv. blessuretijd), dan nemen we het dichtstbijzijnde segment.
// Zonder minuut (oude data) geven we iedereen die het kwart ooit in die groepen stond terug —
// preciezer kan niet.
function playersInGroupsAt(
  segments: QuarterSegment[],
  minute: number | undefined,
  groups: PositionGroup[]
): Set<number> {
  const inGroups = (seg: QuarterSegment) =>
    (Object.entries(seg.lineup) as [FieldPosition, number][])
      .filter(([pos, id]) => id != null && groups.includes(POSITION_TO_GROUP[pos]))
      .map(([, id]) => id);
  if (segments.length === 0) return new Set();
  if (minute == null) return new Set(segments.flatMap(inGroups));
  return new Set(inGroups(segmentAt(segments, minute)));
}

// Het segment waarin een minuut valt; buiten het kwart (bv. blessuretijd) het dichtstbijzijnde.
function segmentAt(segments: QuarterSegment[], minute: number): QuarterSegment {
  const clamped = Math.min(Math.max(minute, segments[0].start), segments[segments.length - 1].end);
  return segments.find(seg => clamped >= seg.start && clamped <= seg.end) ?? segments[segments.length - 1];
}

// Eén "stint": een stuk van een kwart zonder wissels — wie er op het veld stond, hoe lang, en
// welke doelpunten (mét geregistreerde minuut) er in die tijd vielen.
interface Stint {
  playerIds: number[];
  gameIndex: number;
  minutes: number;
  goalsFor: number;
  goalsAgainst: number;
}

// Sterkte van de shrinkage: hoe hoger, hoe voorzichtiger de schatting (dichter bij 0) — vooral
// belangrijk voor spelers met weinig minuten. In minuten uitgedrukt: ~een volledige wedstrijd.
const IMPACT_RIDGE_LAMBDA = 500;

// Lost (A)x = b op via Gauss-eliminatie met pivotering. A is klein (spelers + wedstrijden).
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || m[c][c] === 0) continue;
      const factor = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= factor * m[c][k];
    }
  }
  return m.map((row, i) => (row[i] !== 0 ? row[n] / row[i] : 0));
}

// Geschatte bijdrage per speler aan het doelsaldo (per 60 min), voor alle spelers tegelijk
// (ridge-regressie, "adjusted plus-minus"): zo wordt het effect van medespelers en van de
// sterkte van de tegenstander (één vrije term per wedstrijd) eruit gefilterd, i.p.v. alles
// wat gebeurde terwijl een speler op het veld stond op zijn rekening te schrijven.
function estimatePlayerContributions(stints: Stint[], playerIds: number[], gameCount: number): number[] {
  const index = new Map(playerIds.map((id, i) => [id, i]));
  const size = playerIds.length + gameCount;
  const A = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const b = new Array<number>(size).fill(0);
  stints.forEach(stint => {
    // Gewogen kleinste kwadraten met doelsaldo/60 als uitkomst en minuten als gewicht.
    const cols = [
      ...stint.playerIds.map(id => index.get(id)).filter((i): i is number => i != null),
      playerIds.length + stint.gameIndex,
    ];
    const target = (stint.goalsFor - stint.goalsAgainst) * 60;
    cols.forEach(i => {
      b[i] += target;
      cols.forEach(j => { A[i][j] += stint.minutes; });
    });
  });
  for (let i = 0; i < size; i++) A[i][i] += i < playerIds.length ? IMPACT_RIDGE_LAMBDA : 1e-6;
  return solveLinearSystem(A, b).slice(0, playerIds.length);
}

// Deelt spelers in drie groepen in. We laten telkens één wedstrijd weg en rekenen opnieuw: een
// speler is pas 'positive'/'negative' als zijn schatting in minstens IMPACT_MIN_AGREEMENT van
// die runs hetzelfde teken heeft als de volledige schatting. Zo hangt een oordeel niet af van
// één toevallige wedstrijd, maar mag een sterkhouder die vooral in grote wedstrijden het
// verschil maakt (en dus één keer "omdraait") wel groen worden. Te weinig wedstrijden:
// iedereen 'unclear'.
// Ook met weinig speelminuten blijft een schatting vaak stabiel van teken (de shrinkage trekt ze
// naar 0, niet erover), terwijl ze op een paar toevallige stukken rust. Daarom pas een oordeel
// vanaf IMPACT_MIN_MINUTES (~3 volledige wedstrijden).
export const IMPACT_MIN_GAMES = 3;
export const IMPACT_MIN_MINUTES = 180;
const IMPACT_MIN_AGREEMENT = 0.8;
function computeImpact(
  stints: Stint[],
  playerIds: number[],
  gameCount: number,
  presentByGame: Set<number>[]
): PlayerImpact[] {
  const full = estimatePlayerContributions(stints, playerIds, gameCount);
  const leaveOneOut = Array.from({ length: gameCount }, (_, g) =>
    estimatePlayerContributions(stints.filter(s => s.gameIndex !== g), playerIds, gameCount)
  );
  return playerIds.map((playerId, i) => {
    const onField = { minutes: 0, goalsFor: 0, goalsAgainst: 0 };
    const onBench = { minutes: 0, goalsFor: 0, goalsAgainst: 0 };
    stints.forEach(stint => {
      if (!presentByGame[stint.gameIndex].has(playerId)) return;
      const target = stint.playerIds.includes(playerId) ? onField : onBench;
      target.minutes += stint.minutes;
      target.goalsFor += stint.goalsFor;
      target.goalsAgainst += stint.goalsAgainst;
    });
    const sign = Math.sign(full[i]);
    const agreement = leaveOneOut.filter(e => Math.sign(e[i]) === sign).length / Math.max(1, gameCount);
    const group: ImpactGroup =
      gameCount < IMPACT_MIN_GAMES || onField.minutes < IMPACT_MIN_MINUTES || sign === 0 || agreement < IMPACT_MIN_AGREEMENT
        ? 'unclear'
        : sign > 0 ? 'positive'
        : 'negative';
    return { playerId, group, estimate: full[i], onField, onBench };
  });
}

// Reconstrueert, voor één kwart, hoeveel minuten elke speler op welke positie(groep) heeft
// gestaan — gebaseerd op de segmenten hierboven.
function reconstructQuarterMinutes(quarter: Quarter): {
  minutesByPlayer: Record<number, number>;
  minutesByPlayerAndGroup: Record<number, Partial<Record<PositionGroup, number>>>;
  minutesByPlayerAndPosition: Record<number, Partial<Record<FieldPosition, number>>>;
  playersInGoalOrDefense: Set<number>;
} {
  const minutesByPlayer: Record<number, number> = {};
  const minutesByPlayerAndGroup: Record<number, Partial<Record<PositionGroup, number>>> = {};
  const minutesByPlayerAndPosition: Record<number, Partial<Record<FieldPosition, number>>> = {};
  const playersInGoalOrDefense = new Set<number>();

  const addMinutes = (playerId: number, position: FieldPosition, amount: number) => {
    if (amount <= 0) return;
    minutesByPlayer[playerId] = (minutesByPlayer[playerId] || 0) + amount;
    const group = POSITION_TO_GROUP[position];
    if (!minutesByPlayerAndGroup[playerId]) minutesByPlayerAndGroup[playerId] = {};
    minutesByPlayerAndGroup[playerId][group] = (minutesByPlayerAndGroup[playerId][group] || 0) + amount;
    if (!minutesByPlayerAndPosition[playerId]) minutesByPlayerAndPosition[playerId] = {};
    minutesByPlayerAndPosition[playerId][position] = (minutesByPlayerAndPosition[playerId][position] || 0) + amount;
    if (group === 'keeper' || group === 'verdediging') playersInGoalOrDefense.add(playerId);
  };

  computeQuarterSegments(quarter).forEach(seg => {
    const duration = seg.end - seg.start + 1;
    (Object.entries(seg.lineup) as [FieldPosition, number][]).forEach(([pos, playerId]) => {
      if (playerId != null) addMinutes(playerId, pos, duration);
    });
  });

  return { minutesByPlayer, minutesByPlayerAndGroup, minutesByPlayerAndPosition, playersInGoalOrDefense };
}

// Berekent alle Inzichten-statistieken voor een gegeven set spelers, gefilterd op seizoen
// (of 'all' voor alle seizoenen samen). Enkel voltooide wedstrijden tellen mee, consistent met
// Wedstrijden-geschiedenis en Dashboard.
export const computeInsights = (games: Game[], players: Player[], seasonFilter: string): InsightsData => {
  const scopedGames = games.filter(
    g => g.status === 'finished' && (seasonFilter === 'all' || g.seasonId === seasonFilter)
  );

  const goalsByPlayer: Record<number, number> = {};
  const assistsByPlayer: Record<number, number> = {};
  const tacklesByPlayer: Record<number, number> = {};
  const savesByPlayer: Record<number, number> = {};
  const injuriesByPlayer: Record<number, number> = {};
  const cleanSheetsByPlayer: Record<number, number> = {};
  const quartersInGoalOrDefenseByPlayer: Record<number, number> = {};
  const goalsAgainstInGoalOrDefenseByPlayer: Record<number, number> = {};
  const teamGoalsInAttackByPlayer: Record<number, number> = {};
  const stints: Stint[] = [];
  const minutesTotalByPlayer: Record<number, number> = {};
  const minutesByGroupByPlayer: Record<number, Record<PositionGroup, number>> = {};
  const minutesByPositionByPlayer: Record<number, Partial<Record<FieldPosition, number>>> = {};
  const matchesPresentByPlayer: Record<number, number> = {};

  const goalsForByType: Record<string, number> = {};
  const goalsAgainstByType: Record<string, number> = {};
  let totalGoalsFor = 0, totalGoalsAgainst = 0, totalAssists = 0, totalTackles = 0, totalSaves = 0;

  scopedGames.forEach((game, gameIndex) => {
    game.playersPresent.forEach(pid => {
      matchesPresentByPlayer[pid] = (matchesPresentByPlayer[pid] || 0) + 1;
    });

    game.quarters.forEach(quarter => {
      quarter.goalEvents.forEach(e => {
        totalGoalsFor += 1;
        const typeKey = e.goalType || 'onbekend';
        goalsForByType[typeKey] = (goalsForByType[typeKey] || 0) + 1;
        // scorerId is null bij een eigen doelpunt van de tegenstander — telt mee voor de
        // teamscore, maar niet voor een individuele speler.
        if (e.scorerId != null) goalsByPlayer[e.scorerId] = (goalsByPlayer[e.scorerId] || 0) + 1;
        if (e.assistId != null) {
          totalAssists += 1;
          assistsByPlayer[e.assistId] = (assistsByPlayer[e.assistId] || 0) + 1;
        }
      });
      (quarter.opponentGoalEvents || []).forEach(e => {
        totalGoalsAgainst += 1;
        const typeKey = e.goalType || 'onbekend';
        goalsAgainstByType[typeKey] = (goalsAgainstByType[typeKey] || 0) + 1;
      });
      (quarter.tackleEvents || []).forEach(e => {
        totalTackles += 1;
        tacklesByPlayer[e.playerId] = (tacklesByPlayer[e.playerId] || 0) + 1;
      });
      (quarter.saveEvents || []).forEach(e => {
        totalSaves += 1;
        savesByPlayer[e.playerId] = (savesByPlayer[e.playerId] || 0) + 1;
      });
      (quarter.injuryEvents || []).forEach(e => {
        injuriesByPlayer[e.playerId] = (injuriesByPlayer[e.playerId] || 0) + 1;
      });

      const { minutesByPlayer, minutesByPlayerAndGroup, minutesByPlayerAndPosition, playersInGoalOrDefense } = reconstructQuarterMinutes(quarter);
      Object.entries(minutesByPlayer).forEach(([idStr, minutes]) => {
        const id = Number(idStr);
        minutesTotalByPlayer[id] = (minutesTotalByPlayer[id] || 0) + minutes;
      });
      Object.entries(minutesByPlayerAndGroup).forEach(([idStr, groups]) => {
        const id = Number(idStr);
        if (!minutesByGroupByPlayer[id]) {
          minutesByGroupByPlayer[id] = { keeper: 0, verdediging: 0, midden: 0, aanval: 0 };
        }
        (Object.entries(groups) as [PositionGroup, number][]).forEach(([group, minutes]) => {
          minutesByGroupByPlayer[id][group] += minutes;
        });
      });
      Object.entries(minutesByPlayerAndPosition).forEach(([idStr, positionsForPlayer]) => {
        const id = Number(idStr);
        if (!minutesByPositionByPlayer[id]) minutesByPositionByPlayer[id] = {};
        (Object.entries(positionsForPlayer) as [FieldPosition, number][]).forEach(([position, minutes]) => {
          minutesByPositionByPlayer[id][position] = (minutesByPositionByPlayer[id][position] || 0) + minutes;
        });
      });

      // Clean sheet: geen enkel tegendoelpunt dit kwart, en credit voor elke speler die op enig
      // moment in het kwart als keeper of verdediger op het veld stond. Het aantal kwarten in
      // doel/verdediging houden we ook bij, zodat we een percentage kunnen tonen.
      playersInGoalOrDefense.forEach(id => {
        quartersInGoalOrDefenseByPlayer[id] = (quartersInGoalOrDefenseByPlayer[id] || 0) + 1;
      });
      // Tegendoelpunten toewijzen aan wie op dat moment keeper/verdediger was, via het
      // segment (tussen wissels) waarin de goalminuut valt.
      const segments = computeQuarterSegments(quarter);
      (quarter.opponentGoalEvents || []).forEach(e => {
        playersInGroupsAt(segments, e.minute, ['keeper', 'verdediging']).forEach(id => {
          goalsAgainstInGoalOrDefenseByPlayer[id] = (goalsAgainstInGoalOrDefenseByPlayer[id] || 0) + 1;
        });
      });

      // Aanval, het spiegelbeeld van hierboven: doelpunten van de ploeg toewijzen aan wie op dat
      // moment in de aanval stond.
      quarter.goalEvents.forEach(e => {
        playersInGroupsAt(segments, e.minute, ['aanval']).forEach(id => {
          teamGoalsInAttackByPlayer[id] = (teamGoalsInAttackByPlayer[id] || 0) + 1;
        });
      });

      // Stints voor impact + duo's. Doelpunten zonder minuut (oude data) slaan we over: dan
      // weten we niet wie er op dat moment op het veld stond.
      const quarterStints: Stint[] = segments.map(seg => ({
        playerIds: Object.values(seg.lineup).filter((id): id is number => id != null),
        gameIndex,
        minutes: seg.end - seg.start + 1,
        goalsFor: 0,
        goalsAgainst: 0,
      }));
      const stintAt = (minute: number) => quarterStints[segments.indexOf(segmentAt(segments, minute))];
      if (segments.length > 0) {
        quarter.goalEvents.forEach(e => { if (e.minute != null) stintAt(e.minute).goalsFor += 1; });
        (quarter.opponentGoalEvents || []).forEach(e => { if (e.minute != null) stintAt(e.minute).goalsAgainst += 1; });
      }
      stints.push(...quarterStints);

      if ((quarter.opponentGoalEvents || []).length === 0) {
        playersInGoalOrDefense.forEach(id => {
          cleanSheetsByPlayer[id] = (cleanSheetsByPlayer[id] || 0) + 1;
        });
      }

    });
  });

  const totalGames = scopedGames.length;

  const toTypeList = (counts: Record<string, number>): GoalTypeCount[] =>
    Object.entries(counts)
      .map(([type, count]) => ({
        type: type as GoalType | 'onbekend',
        label: type === 'onbekend' ? 'Onbekend' : GOAL_TYPE_LABELS[type as GoalType],
        count,
      }))
      .sort((a, b) => b.count - a.count);

  const team: TeamInsight = {
    totalGames,
    goalsForByType: toTypeList(goalsForByType),
    goalsAgainstByType: toTypeList(goalsAgainstByType),
    avgGoalsFor: totalGames > 0 ? totalGoalsFor / totalGames : 0,
    avgGoalsAgainst: totalGames > 0 ? totalGoalsAgainst / totalGames : 0,
    avgAssists: totalGames > 0 ? totalAssists / totalGames : 0,
    avgTackles: totalGames > 0 ? totalTackles / totalGames : 0,
    avgSaves: totalGames > 0 ? totalSaves / totalGames : 0,
  };

  const playerInsights: PlayerInsight[] = players.map(p => {
    const matchesPresent = matchesPresentByPlayer[p.id] || 0;
    const minutesTotal = minutesTotalByPlayer[p.id] || 0;
    const maxPossibleMinutes = matchesPresent * QUARTERS_PER_MATCH * QUARTER_DURATION_MINUTES;
    return {
      id: p.id,
      name: p.name,
      goals: goalsByPlayer[p.id] || 0,
      assists: assistsByPlayer[p.id] || 0,
      tackles: tacklesByPlayer[p.id] || 0,
      saves: savesByPlayer[p.id] || 0,
      minutesTotal,
      maxPossibleMinutes,
      minutesPercentage: maxPossibleMinutes > 0 ? Math.round((minutesTotal / maxPossibleMinutes) * 100) : 0,
      minutesByGroup: minutesByGroupByPlayer[p.id] || { keeper: 0, verdediging: 0, midden: 0, aanval: 0 },
      minutesByPosition: minutesByPositionByPlayer[p.id] || {},
      matchesPresent,
      presencePercentage: totalGames > 0 ? Math.round((matchesPresent / totalGames) * 100) : 0,
      cleanSheets: cleanSheetsByPlayer[p.id] || 0,
      quartersInGoalOrDefense: quartersInGoalOrDefenseByPlayer[p.id] || 0,
      minutesInGoalOrDefense: (minutesByGroupByPlayer[p.id]?.keeper || 0) + (minutesByGroupByPlayer[p.id]?.verdediging || 0),
      goalsAgainstInGoalOrDefense: goalsAgainstInGoalOrDefenseByPlayer[p.id] || 0,
      minutesInAttack: minutesByGroupByPlayer[p.id]?.aanval || 0,
      teamGoalsInAttack: teamGoalsInAttackByPlayer[p.id] || 0,
      injuries: injuriesByPlayer[p.id] || 0,
    };
  });

  // Duo's: alle paren die samen in een stint stonden, met minuten en doelsaldo samen.
  const duos: Record<string, DuoInsight> = {};
  stints.forEach(stint => {
    const ids = [...stint.playerIds].sort((a, b) => a - b);
    ids.forEach((a, i) => ids.slice(i + 1).forEach(b => {
      const duo = (duos[`${a}-${b}`] ??= { playerIds: [a, b], minutes: 0, goalsFor: 0, goalsAgainst: 0 });
      duo.minutes += stint.minutes;
      duo.goalsFor += stint.goalsFor;
      duo.goalsAgainst += stint.goalsAgainst;
    }));
  });

  // Impact enkel voor spelers die effectief speelden.
  const playedIds = playerInsights.filter(p => p.minutesTotal > 0).map(p => p.id);
  const presentByGame = scopedGames.map(g => new Set(g.playersPresent));
  const impact = computeImpact(stints, playedIds, totalGames, presentByGame);

  return { team, players: playerInsights, duos: Object.values(duos), impact };
};
