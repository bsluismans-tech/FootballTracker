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

  const resultTone = ourGoals > opponentGoals ? 'win' : ourGoals < opponentGoals ? 'loss' : 'draw';

  // Altijd een donkere "held-kaart" (navy), zowel live als bij de laatste wedstrijd: het
  // visuele startpunt van het startscherm. Scores in het display-lettertype.
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-navy text-white transition-all duration-500 ${
      isLive ? 'shadow-xl ring-2 ring-volt/60' : 'shadow-lg'
    }`}>
      {/* Subtiel decoratief accent: een vage limoengroene gloed rechtsboven */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -end-16 w-48 h-48 rounded-full bg-volt/10 blur-2xl" />

      <div className="relative flex justify-between items-center mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${
          isLive ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70'
        }`}>
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          {isLive ? t('scoreboard.live') : t('scoreboard.lastMatch')}
        </span>

        {/* Resultaat-badge (alleen bij een afgeronde wedstrijd) */}
        {!isLive && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
            resultTone === 'win' ? 'bg-volt text-navy' :
            resultTone === 'loss' ? 'bg-red-500/20 text-red-200' :
            'bg-white/10 text-white/80'
          }`}>
            {resultTone === 'win' ? t('scoreboard.won') :
             resultTone === 'loss' ? t('scoreboard.lost') :
             t('scoreboard.draw')}
          </span>
        )}
      </div>

      {/* Altijd thuisploeg links en uitploeg rechts, ook in het Arabisch (zoals op tv). */}
      <div dir="ltr" className="relative flex items-center justify-around">
        {/* Linker Team */}
        <div className="text-center flex-1 min-w-0">
          <p className="text-sm font-medium text-white/60 mb-0.5 truncate max-w-[120px] mx-auto">
            {leftName}
          </p>
          <p className="font-display text-7xl font-bold leading-none tabular-nums">{leftScore}</p>
        </div>

        {/* Huidig kwart + minuut centraal tussen de scores (alleen tijdens een live wedstrijd) */}
        {isLive && game.currentQuarter ? (
          <div className="flex flex-col items-center px-2 shrink-0">
            <span className="text-xs font-medium text-white/60">
              {t('common.quarter', { number: game.currentQuarter })}
            </span>
            {currentMinute != null && (
              <span className="mt-1 font-display text-xl font-semibold tabular-nums whitespace-nowrap bg-volt text-navy px-3 py-0.5 rounded-md">
                {formatMinuteLong(currentMinute, t('scoreboard.minuteUnit'))}
              </span>
            )}
          </div>
        ) : (
          <div className="font-display text-4xl font-bold text-white/20 px-4">–</div>
        )}

        {/* Rechter Team */}
        <div className="text-center flex-1 min-w-0">
          <p className="text-sm font-medium text-white/60 mb-0.5 truncate max-w-[120px] mx-auto">
            {rightName}
          </p>
          <p className="font-display text-7xl font-bold leading-none tabular-nums">{rightScore}</p>
        </div>
      </div>
    </div>
  );
};
