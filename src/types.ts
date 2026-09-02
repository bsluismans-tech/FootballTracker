export interface Player {
  id: number;
  name: string;
  // Of deze speler (ook) keeper speelt. Wordt gebruikt om keepers vooraan te tonen
  // bij de keeperselectie in de basisopstelling van een kwart.
  isKeeper?: boolean;
}

export interface Parent {
  id: number;
  name: string;
  playerId: number;
}

// De positie waarop een speler tijdens een specifiek kwart staat opgesteld.
// Spelers wisselen vaak van positie doorheen het seizoen, dus dit wordt per kwart
// vastgelegd (in Quarter.lineup) in plaats van als vast kenmerk van de speler.
export type FieldPosition =
  | 'keeper'
  | 'verdediger_links'
  | 'verdediger_centraal'
  | 'verdediger_rechts'
  | 'middenvelder'
  | 'aanvaller_links'
  | 'spits'
  | 'aanvaller_rechts';

// Eén doelpunt, met een expliciete koppeling tussen scorer en assist (indien van toepassing).
// playersOnField legt vast wie er van ons team op het veld stond op het moment van het doelpunt,
// zodat achteraf betrouwbaar te analyseren is welke spelerscombinaties samen goed scoren.
export interface GoalEvent {
  scorerId: number;
  assistId: number | null;
  playersOnField: number[];
}

export interface Substitution {
  outId: number;
  inId: number;
}

export interface Quarter {
  number: number;
  goalEvents: GoalEvent[];
  tackles: number[];
  saves: number;
  opponentGoals: number;
  substitutes: number[];        // spelers die momenteel op de bank zitten dit kwart
  substitutions: Substitution[]; // wissel-log: wie eruit, wie erin
  // Basisopstelling voor dit kwart: per positie welke speler er staat.
  // Wordt aan het begin van elk kwart ingevuld/bevestigd door de gebruiker.
  lineup: Partial<Record<FieldPosition, number>>;
}

export type GameResult = 'win' | 'draw' | 'loss';

export interface Game {
  id: number;
  date: string;
  // Seizoen waarin de wedstrijd valt, bv. "2025-2026". Wordt automatisch bepaald bij aanmaken.
  seasonId: string;
  quarters: Quarter[];
  opponent?: string;
  isAway?: boolean;
  playersPresent: number[];
  parentsPresent: number[];
  notes?: string;
  currentQuarter?: number; // Kwart (1-4) dat momenteel bezig is tijdens een live wedstrijd
  status?: 'setup' | 'active' | 'finished' | 'cancelled';
  // Eindresultaat, vastgelegd bij het opslaan zodat dit niet telkens herberekend hoeft te worden.
  finalScoreFor?: number;
  finalScoreAgainst?: number;
  result?: GameResult;
  lastUpdate?: string;
  endTime?: string;
}
