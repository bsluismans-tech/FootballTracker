import React from 'react';
import { Home, MapPin, Calendar, Users, UserCheck } from 'lucide-react';
import type { Player, Parent, Game } from '../types';

interface Props {
  currentGame: Game;
  players: Player[];
  parents: Parent[];
  onUpdateGame: (game: Game) => void;
  formatDateForInput: (date: string) => string;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MatchSetup: React.FC<Props> = ({ currentGame, players, parents, onUpdateGame, formatDateForInput, handleDateChange }) => {
  
  // Sorteer spelers en ouders alfabetisch op naam
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
  const sortedParents = [...parents].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => onUpdateGame({ ...currentGame, isAway: false })} className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase transition-all flex flex-col items-center gap-2 ${!currentGame.isAway ? 'bg-[#04174C] text-white shadow-md' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}><Home size={24} /> Thuis</button>
          <button onClick={() => onUpdateGame({ ...currentGame, isAway: true })} className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase transition-all flex flex-col items-center gap-2 ${currentGame.isAway ? 'bg-[#04174C] text-white shadow-md' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}><MapPin size={24} /> Uit</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#04174C]/40" size={18} />
            <input type="date" className="w-full pl-10 pr-3 py-3 rounded-lg border border-[#04174C]/20 font-bold text-[#04174C] appearance-none" value={formatDateForInput(currentGame.date)} onChange={handleDateChange} />
          </div>
          <input type="text" placeholder="Naam tegenstander..." className="w-full p-3 rounded-lg border border-[#04174C]/20 font-bold text-[#04174C]" value={currentGame.opponent || ''} onChange={(e) => onUpdateGame({ ...currentGame, opponent: e.target.value })} />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
        <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><Users size={18}/> Wie speelt er?</h3>
        <div className="flex flex-wrap gap-2">
          {sortedPlayers.map(p => (
            <button key={p.id} onClick={() => onUpdateGame({...currentGame, playersPresent: currentGame.playersPresent.includes(p.id) ? currentGame.playersPresent.filter(id => id !== p.id) : [...currentGame.playersPresent, p.id]})} className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentGame.playersPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-600'}`}>{p.name}</button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
        <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><UserCheck size={18}/> Toeschouwers</h3>
        <div className="flex flex-wrap gap-2">
          {sortedParents.map(p => (
            <button key={p.id} onClick={() => onUpdateGame({...currentGame, parentsPresent: currentGame.parentsPresent.includes(p.id) ? currentGame.parentsPresent.filter(id => id !== p.id) : [...currentGame.parentsPresent, p.id]})} className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentGame.parentsPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-600'}`}>{p.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
};