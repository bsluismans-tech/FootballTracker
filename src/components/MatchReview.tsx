import React from 'react';
import { ClipboardEdit } from 'lucide-react';
import type { Game } from '../types';

interface Props {
  currentGame: Game;
  totalGoals: number;
  totalOpponentGoals: number;
  onUpdateGame: (game: Game) => void;
}

export const MatchReview: React.FC<Props> = ({ currentGame, totalGoals, totalOpponentGoals, onUpdateGame }) => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#04174C]/20 text-center space-y-2">
      <h3 className="text-3xl font-black text-[#04174C]">{totalGoals} - {totalOpponentGoals}</h3>
      <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">U9 Kaulille vs {currentGame.opponent || 'Tegenstander'}</p>
      <div className={`text-sm font-black px-4 py-1 rounded-full inline-block ${totalGoals >= totalOpponentGoals ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{totalGoals > totalOpponentGoals ? 'GEWONNEN 🎉' : totalGoals < totalOpponentGoals ? 'VERLOREN ⚽️' : 'GELIJKSPEL 🤝'}</div>
    </div>

    <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200">
      <h3 className="font-bold mb-3 flex items-center gap-2 text-yellow-800"><ClipboardEdit size={18} /> Opmerkingen</h3>
      <textarea className="w-full p-3 border border-yellow-100 rounded-lg bg-yellow-50/30 text-gray-700 outline-none transition-all" rows={6} placeholder="Matchverslag..." value={(currentGame as any).notes || ''} onChange={(e) => onUpdateGame({ ...currentGame, notes: e.target.value } as any)} />
    </div>
  </div>
);