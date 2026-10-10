import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Game } from '../types';
import { formatMinuteLong, getQuarterMinute } from '../utils/matchTime';

interface Props {
  game: Game;
  isLive: boolean;
}

export const LiveScoreboard: React.FC<Props> = ({ game, isLive }) => {
  const { t } = useTranslation();

  // Live minuutklok: enkel nodig tijdens een lopende wedstrijd, zodat de minuut op het
  // Dashboard mee blijft tikken bij iedereen die meekijkt (niet enkel bij de invoerder).
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Veilige berekening van de scores
  const ourGoals = game.quarters.reduce((sum, q) => sum + (Array.isArray(q.goalEvents) ? q.goalEvents.length : 0), 0);
  const opponentGoals = game.quarters.reduce((sum, q) => sum + (q.opponentGoalEvents?.length || 0), 0);

  const activeQuarter = game.currentQuarter ? game.quarters[game.currentQuarter - 1] : undefined;
  const currentMinute = activeQuarter?.startedAt ? getQuarterMinute(activeQuarter) : null;

  // Bepaal de volgorde op basis van uit/thuis voor de namen en scores
  const leftName = game.isAway ? (game.opponent || t('common.opponent')) : 'Kaulille';
  const leftScore = game.isAway ? opponentGoals : ourGoals;
  
  const rightName = game.isAway ? 'Kaulille' : (game.opponent || t('common.opponent'));
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
          {isLive ? t('scoreboard.live') : t('scoreboard.lastMatch')}
        </span>

        {/* Resultaat Badge (Alleen bij afgeronde wedstrijd) */}
        {!isLive && (
          <div className={`text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest ${
            ourGoals > opponentGoals ? 'bg-green-100 text-green-700' :
            ourGoals < opponentGoals ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {ourGoals > opponentGoals ? t('scoreboard.won') :
             ourGoals < opponentGoals ? t('scoreboard.lost') :
             t('scoreboard.draw')}
          </div>
        )}
      </div>

      {/* Altijd thuisploeg links en uitploeg rechts, ook in het Arabisch (zoals op tv). */}
      <div dir="ltr" className="flex items-center justify-around">
        {/* Linker Team */}
        <div className="text-center flex-1">
          <p className="text-[10px] font-black uppercase opacity-60 mb-1 truncate max-w-[100px] mx-auto">
            {leftName}
          </p>
          <p className="text-5xl font-black tabular-nums">{leftScore}</p>
        </div>
        
        {/* Huidig kwart + minuut centraal tussen de scores (alleen tijdens een live wedstrijd) */}
        {isLive && game.currentQuarter ? (
          <div className="flex flex-col items-center px-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
              {t('common.quarter', { number: game.currentQuarter })}
            </span>
            {currentMinute != null && (
              <span className="mt-1 text-lg font-black tabular-nums whitespace-nowrap bg-white/10 px-3 py-0.5 rounded-full">
                {formatMinuteLong(currentMinute, t('scoreboard.minuteUnit'))}
              </span>
            )}
          </div>
        ) : (
          <div className="text-2xl font-black opacity-20 px-4">-</div>
        )}

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