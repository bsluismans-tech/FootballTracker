export interface Player { 
  id: number; 
  name: string; 
}

export interface Parent { 
  id: number; 
  name: string; 
  playerId: number;
}

export interface Quarter {
  number: number;
  goals: number[];
  tackles: number[];
  assists: number[];
  saves: number;
  goalkeeper: number | null;
  opponentGoals: number;
}

export interface Game {
  id: number;
  date: string;
  quarters: Quarter[];
  opponent?: string;
  isAway?: boolean;
  playersPresent: number[];
  parentsPresent: number[];
  notes?: string; 
}