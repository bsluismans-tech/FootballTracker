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

export interface InsightsData {
  team: TeamInsight;
  players: PlayerInsight[];
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
  const minutesTotalByPlayer: Record<number, number> = {};
  const minutesByGroupByPlayer: Record<number, Record<PositionGroup, number>> = {};
  const minutesByPositionByPlayer: Record<number, Partial<Record<FieldPosition, number>>> = {};
  const matchesPresentByPlayer: Record<number, number> = {};

  const goalsForByType: Record<string, number> = {};
  const goalsAgainstByType: Record<string, number> = {};
  let totalGoalsFor = 0, totalGoalsAgainst = 0, totalAssists = 0, totalTackles = 0, totalSaves = 0;

  scopedGames.forEach(game => {
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
      // moment in het kwart als keeper of verdediger op het veld stond.
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
      injuries: injuriesByPlayer[p.id] || 0,
    };
  });

  return { team, players: playerInsights };
};
