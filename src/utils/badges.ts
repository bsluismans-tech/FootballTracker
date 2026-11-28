// Badges & mijlpalen, per seizoen. Alles wordt berekend uit de bestaande wedstrijddata (geen
// extra opslag): een gecorrigeerde wedstrijd past de badges dus vanzelf aan.
//
// Uitgangspunten (bewuste keuzes voor een U10-ploeg):
// - Elk kind moet badges kunnen halen: inzet, verdedigen, keeperswerk en veelzijdigheid tellen
//   even zwaar als scoren.
// - Enkel positieve badges, geen ranglijsten tussen kinderen.
// - Gastspelers krijgen geen badges.

import type { Game, Player } from '../types';
import { computeQuarterSegments, POSITION_TO_GROUP, type PositionGroup } from './insights';

export type PlayerBadgeId =
  | 'scorer'
  | 'hattrick'
  | 'assists'
  | 'tackles'
  | 'saves'
  | 'cleanSheets'
  | 'matches'
  | 'versatile';

export type TeamBadgeId = 'teamGoals' | 'teamPlay' | 'winStreak' | 'comeback' | 'teamCleanSheet';

export type BadgeId = PlayerBadgeId | TeamBadgeId;

// Drempels per niveau. Wie de eerste drempel haalt, heeft de badge; elke volgende drempel is
// een hoger niveau.
export const PLAYER_BADGES: { id: PlayerBadgeId; thresholds: number[] }[] = [
  { id: 'scorer', thresholds: [1, 5, 10, 25] },
  { id: 'assists', thresholds: [1, 5, 10, 20] },
  { id: 'tackles', thresholds: [3, 8, 15, 25] },
  { id: 'cleanSheets', thresholds: [1, 10, 25, 50] },
  { id: 'saves', thresholds: [1, 10, 30, 75] },
  { id: 'matches', thresholds: [5, 10, 15, 20] },
  { id: 'versatile', thresholds: [2, 3, 4] }, // aantal linies (keeper, verdediging, midden, aanval)
  { id: 'hattrick', thresholds: [1, 2, 3] }, // aantal hattricks
];

export const TEAM_BADGES: { id: TeamBadgeId; thresholds: number[] }[] = [
  { id: 'teamGoals', thresholds: [10, 25, 50, 100] },
  // Doelpunten uit een collectieve aanval: stimuleert samenspel
  { id: 'teamPlay', thresholds: [10, 25, 50, 100] },
  { id: 'winStreak', thresholds: [3, 5, 10] },
  { id: 'comeback', thresholds: [1, 3, 5] },
  { id: 'teamCleanSheet', thresholds: [1, 3, 5] },
];

const THRESHOLDS: Record<BadgeId, number[]> = Object.fromEntries(
  [...PLAYER_BADGES, ...TEAM_BADGES].map(b => [b.id, b.thresholds])
) as Record<BadgeId, number[]>;

// Hoeveel minuten iemand in een linie moet gestaan hebben (over het hele seizoen) om die linie
// mee te tellen voor "Veelzijdig": ongeveer een half kwart, zodat een invalbeurt van 2' niet telt.
const VERSATILE_MIN_MINUTES = 8;

export interface BadgeProgress {
  id: BadgeId;
  value: number; // huidige stand (bv. 7 doelpunten)
  level: number; // 0 = nog niet behaald, 1..n = behaald niveau
  thresholds: number[];
  reached: number | null; // drempel van het behaalde niveau
  next: number | null; // volgende drempel, null als het hoogste niveau behaald is
}

export interface Milestone {
  id: BadgeId;
  level: number;
  threshold: number;
  playerId: number | null; // null = ploegbadge
  gameId: number;
  date: string;
}

export interface SeasonBadges {
  players: Record<number, BadgeProgress[]>;
  team: BadgeProgress[];
  milestones: Milestone[]; // chronologisch, oudste eerst
}

/** Aantal niveaus van een badge (= aantal sterren). */
export const levelCount = (id: BadgeId): number => THRESHOLDS[id].length;

export const levelFor = (id: BadgeId, value: number): number =>
  THRESHOLDS[id].filter(t => value >= t).length;

const toProgress = (id: BadgeId, value: number): BadgeProgress => {
  const thresholds = THRESHOLDS[id];
  const level = levelFor(id, value);
  return {
    id,
    value,
    level,
    thresholds,
    reached: level > 0 ? thresholds[level - 1] : null,
    next: level < thresholds.length ? thresholds[level] : null,
  };
};

const ourGoals = (g: Game) => g.quarters.reduce((s, q) => s + (q.goalEvents?.length || 0), 0);
const theirGoals = (g: Game) => g.quarters.reduce((s, q) => s + (q.opponentGoalEvents?.length || 0), 0);

// Kwam Kaulille in deze wedstrijd ooit achter en won het toch? Doelpunten binnen een kwart
// worden op minuut gesorteerd; zonder minuut (oude data) achteraan in het kwart.
const isComeback = (g: Game): boolean => {
  if (ourGoals(g) <= theirGoals(g)) return false;
  const events = g.quarters.flatMap((q, qi) => [
    ...(q.goalEvents || []).map(e => ({ order: qi * 1000 + (e.minute ?? 999), delta: 1 })),
    // Bij gelijke minuut het tegendoelpunt eerst: zo telt "achter en meteen terug" ook.
    ...(q.opponentGoalEvents || []).map(e => ({ order: qi * 1000 + (e.minute ?? 999) - 0.5, delta: -1 })),
  ]).sort((a, b) => a.order - b.order);
  let diff = 0;
  for (const e of events) {
    diff += e.delta;
    if (diff < 0) return true;
  }
  return false;
};

/**
 * Berekent de badges van één seizoen. `games` mag alle wedstrijden bevatten; enkel afgewerkte
 * wedstrijden van dat seizoen tellen mee, in chronologische volgorde (zo weten we in welke
 * wedstrijd een mijlpaal behaald werd).
 */
export function computeSeasonBadges(games: Game[], players: Player[], seasonId: string): SeasonBadges {
  const eligible = new Set(players.filter(p => !p.isGuest).map(p => p.id));
  const seasonGames = games
    .filter(g => g.status === 'finished' && g.seasonId === seasonId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const playerValues = new Map<number, Record<PlayerBadgeId, number>>();
  const groupMinutes = new Map<number, Record<PositionGroup, number>>();
  const valuesOf = (id: number) => {
    if (!playerValues.has(id)) {
      playerValues.set(id, { scorer: 0, hattrick: 0, assists: 0, tackles: 0, saves: 0, cleanSheets: 0, matches: 0, versatile: 0 });
    }
    return playerValues.get(id)!;
  };
  eligible.forEach(id => valuesOf(id));

  const team: Record<TeamBadgeId, number> = { teamGoals: 0, teamPlay: 0, winStreak: 0, comeback: 0, teamCleanSheet: 0 };
  let currentStreak = 0;
  const milestones: Milestone[] = [];

  for (const game of seasonGames) {
    const beforePlayers = new Map([...playerValues].map(([id, v]) => [id, { ...v }]));
    const beforeTeam = { ...team };

    // --- Spelersstatistieken ---
    const goalsThisGame = new Map<number, number>();
    game.quarters.forEach(q => {
      (q.goalEvents || []).forEach(e => {
        if (e.scorerId != null && eligible.has(e.scorerId)) {
          valuesOf(e.scorerId).scorer += 1;
          goalsThisGame.set(e.scorerId, (goalsThisGame.get(e.scorerId) || 0) + 1);
        }
        if (e.assistId != null && eligible.has(e.assistId)) valuesOf(e.assistId).assists += 1;
      });
      (q.tackleEvents || []).forEach(e => { if (eligible.has(e.playerId)) valuesOf(e.playerId).tackles += 1; });
      (q.saveEvents || []).forEach(e => { if (eligible.has(e.playerId)) valuesOf(e.playerId).saves += 1; });

      // Speelminuten per linie + clean sheets (kwart zonder tegendoelpunt): keeper en verdedigers
      // die minstens de helft van het kwart in doel of in de verdediging stonden.
      const segments = computeQuarterSegments(q);
      if (segments.length === 0) return;
      const quarterLength = segments[segments.length - 1].end - segments[0].start + 1;
      const defensiveMinutes = new Map<number, number>();
      segments.forEach(seg => {
        const minutes = seg.end - seg.start + 1;
        Object.entries(seg.lineup).forEach(([pos, id]) => {
          if (id == null || !eligible.has(id)) return;
          const group = POSITION_TO_GROUP[pos as keyof typeof POSITION_TO_GROUP];
          if (!groupMinutes.has(id)) groupMinutes.set(id, { keeper: 0, verdediging: 0, midden: 0, aanval: 0 });
          groupMinutes.get(id)![group] += minutes;
          if (group === 'keeper' || group === 'verdediging') {
            defensiveMinutes.set(id, (defensiveMinutes.get(id) || 0) + minutes);
          }
        });
      });
      if ((q.opponentGoalEvents || []).length === 0) {
        defensiveMinutes.forEach((minutes, id) => {
          if (minutes * 2 >= quarterLength) valuesOf(id).cleanSheets += 1;
        });
      }
    });
    goalsThisGame.forEach((count, id) => { if (count >= 3) valuesOf(id).hattrick += 1; });
    game.playersPresent.forEach(id => { if (eligible.has(id)) valuesOf(id).matches += 1; });
    groupMinutes.forEach((mins, id) => {
      valuesOf(id).versatile = Object.values(mins).filter(m => m >= VERSATILE_MIN_MINUTES).length;
    });

    // --- Ploegstatistieken ---
    const ours = ourGoals(game);
    const theirs = theirGoals(game);
    team.teamGoals += ours;
    team.teamPlay += game.quarters.reduce((sum, q) => sum + (q.goalEvents || []).filter(e => e.goalType === 'collectieve_aanval').length, 0);
    currentStreak = ours > theirs ? currentStreak + 1 : 0;
    team.winStreak = Math.max(team.winStreak, currentStreak);
    if (isComeback(game)) team.comeback += 1;
    if (theirs === 0) team.teamCleanSheet += 1;

    // --- Nieuwe niveaus in deze wedstrijd = mijlpalen ---
    const record = (id: BadgeId, before: number, after: number, playerId: number | null) => {
      const from = levelFor(id, before);
      const to = levelFor(id, after);
      for (let level = from + 1; level <= to; level++) {
        milestones.push({ id, level, threshold: THRESHOLDS[id][level - 1], playerId, gameId: game.id, date: game.date });
      }
    };
    playerValues.forEach((after, playerId) => {
      const before = beforePlayers.get(playerId);
      (Object.keys(after) as PlayerBadgeId[]).forEach(id => record(id, before?.[id] ?? 0, after[id], playerId));
    });
    (Object.keys(team) as TeamBadgeId[]).forEach(id => record(id, beforeTeam[id], team[id], null));
  }

  const playersOut: Record<number, BadgeProgress[]> = {};
  playerValues.forEach((values, id) => {
    playersOut[id] = PLAYER_BADGES.map(b => toProgress(b.id, values[b.id]));
  });

  return {
    players: playersOut,
    team: TEAM_BADGES.map(b => toProgress(b.id, team[b.id])),
    milestones,
  };
}

/**
 * Mijlpaal die een nieuw doelpunt tijdens een live wedstrijd oplevert (voor de doelpuntviering):
 * een nieuw niveau van "Doelpuntenmaker" of een hattrick. `seasonGoalsBefore` = doelpunten van
 * die speler in afgewerkte wedstrijden van dit seizoen.
 */
export function liveGoalMilestone(seasonGoalsBefore: number, goalsThisGame: number): { id: PlayerBadgeId; threshold: number } | null {
  const total = seasonGoalsBefore + goalsThisGame;
  if (goalsThisGame === 3) return { id: 'hattrick', threshold: 1 };
  if (THRESHOLDS.scorer.includes(total)) return { id: 'scorer', threshold: total };
  return null;
}
