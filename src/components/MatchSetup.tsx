import React from 'react';
import { Home, MapPin, Calendar, Users } from 'lucide-react';
import type { Player, Game } from '../types';

interface Props {
  currentGame: Game;
  players: Player[];
  onUpdateGame: (game: Game) => void;
  formatDateForInput: (date: string) => string;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MatchSetup: React.FC<Props> = ({ currentGame, players, onUpdateGame, formatDateForInput, handleDateChange }) => {
  
  // Vaste spelers eerst, gastspelers achteraan.
  const sortedPlayers = [...players].sort((a, b) => Number(!!a.isGuest) - Number(!!b.isGuest) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => onUpdateGame({ ...currentGame, isAway: false })} className={`flex-1 py-4 rounded-lg font-semibold text-sm transition-all flex flex-col items-center gap-2 ${!currentGame.isAway ? 'bg-navy text-white shadow-md' : 'bg-gray-100 text-navy'}`}><Home size={24} /> Thuis</button>
          <button onClick={() => onUpdateGame({ ...currentGame, isAway: true })} className={`flex-1 py-4 rounded-lg font-semibold text-sm transition-all flex flex-col items-center gap-2 ${currentGame.isAway ? 'bg-navy text-white shadow-md' : 'bg-gray-100 text-navy'}`}><MapPin size={24} /> Uit</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={18} />
            <input type="date" className="w-full pl-10 pr-3 py-3 rounded-lg border border-navy/15 font-semibold text-navy appearance-none" value={formatDateForInput(currentGame.date)} onChange={handleDateChange} />
          </div>
          <input type="text" placeholder="Naam tegenstander..." className="w-full p-3 rounded-lg border border-navy/15 font-semibold text-navy" value={currentGame.opponent || ''} onChange={(e) => onUpdateGame({ ...currentGame, opponent: e.target.value })} />
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-navy"><Users size={18} className="text-navy/50"/> Wie speelt er?</h3>
        <div className="grid grid-cols-3 gap-2">
          {sortedPlayers.map(p => (
            <button
              key={p.id}
              onClick={() => onUpdateGame({...currentGame, playersPresent: currentGame.playersPresent.includes(p.id) ? currentGame.playersPresent.filter(id => id !== p.id) : [...currentGame.playersPresent, p.id]})}
              className={`h-20 px-2 rounded-xl text-sm font-semibold text-center flex flex-col items-center justify-center leading-tight transition active:scale-[0.97] ${currentGame.playersPresent.includes(p.id) ? 'bg-navy text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
            >
              {p.name}
              {p.isGuest && <span className={`mt-1 text-xs font-semibold ${currentGame.playersPresent.includes(p.id) ? 'text-blue-200' : 'text-blue-600'}`}>Gast</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};