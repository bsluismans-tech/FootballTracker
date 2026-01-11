import React from 'react';
import { MapPin } from 'lucide-react';
import type { Game } from '../types';

interface Props {
  game: Game;
  isLive: boolean;
}

export const LiveScoreboard: React.FC<Props> = ({ game, isLive }) => {
  // Veilige berekening van de scores
  const ourGoals = game.quarters.reduce((sum, q) => sum + (Array.isArray(q.goals) ? q.goals.length : 0), 0);
  const opponentGoals = game.quarters.reduce((sum, q) => sum + (q.opponentGoals || 0), 0);

  // Bepaal de volgorde op basis van uit/thuis voor de namen en scores
  const leftName = game.isAway ? (game.opponent || 'Tegenstander') : 'Kaulille';
  const leftScore = game.isAway ? opponentGoals : ourGoals;
  
  const rightName = game.isAway ? 'Kaulille' : (game.opponent || 'Tegenstander');
  const rightScore = game.isAway ? ourGoals : opponentGoals;

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-500 ${
      isLive 
        ? 'bg-[#04174C] text-white border-blue-400 shadow-xl' 
        : 'bg-white text-[#04174C] border-gray-100 shadow-sm'
    }`}>
      
      <div className="flex justify-between items-center mb-4">
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
          isLive ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500'
        }`}>
          {isLive ? '● Live' : 'Laatste wedstrijd'}
        </span>
        
        {/* Resultaat Badge (Alleen bij afgeronde wedstrijd) */}
      {!isLive && (
        <div className="mt-4 flex justify-center">
          <div className={`text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest ${
            ourGoals > opponentGoals ? 'bg-green-100 text-green-700' : 
            ourGoals < opponentGoals ? 'bg-red-100 text-red-700' : 
            'bg-gray-100 text-gray-600'
          }`}>
            {ourGoals > opponentGoals ? 'GEWONNEN 🎉' : 
             ourGoals < opponentGoals ? 'VERLOREN ⚽️' : 
             'GELIJKSPEL 🤝'}
          </div>
        </div>
      )}
      </div>

      <div className="flex items-center justify-around">
        {/* Linker Team */}
        <div className="text-center flex-1">
          <p className="text-[10px] font-black uppercase opacity-60 mb-1 truncate max-w-[100px] mx-auto">
            {leftName}
          </p>
          <p className="text-5xl font-black tabular-nums">{leftScore}</p>
        </div>
        
        <div className="text-2xl font-black opacity-20 px-4">-</div>

        {/* Rechter Team */}
        <div className="text-center flex-1">
          <p className="text-[10px] font-black uppercase opacity-60 mb-1 truncate max-w-[100px] mx-auto">
            {rightName}
          </p>
          <p className="text-5xl font-black tabular-nums">{rightScore}</p>
        </div>
      </div>
    </div>
  );
};