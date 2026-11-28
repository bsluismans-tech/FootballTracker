import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Game } from '../types';
import { formatMinuteLong, getQuarterMinute } from '../utils/matchTime';

// Een viering die over de kaart heen getoond wordt (doelpunt of overwinning). `key` verandert bij
// elke nieuwe viering, zodat de CSS-animatie opnieuw start.
export interface ScoreboardCelebration {
  key: number;
  title: string;
  subtitle?: string;
}

interface Props {
  game: Game;
  isLive: boolean;
  celebration?: ScoreboardCelebration | null;
  // Telt op bij elk nieuw doelpunt van Kaulille / de tegenstander: laat het cijfer opveren of rood
  // trillen. 0 = geen animatie (bv. bij het openen van de app).
  ourGoalPulse?: number;
  opponentGoalPulse?: number;
  // Eigen tekst voor het labeltje linksboven bij een afgelopen wedstrijd (bv. de datum),
  // i.p.v. "Laatste wedstrijd".
  label?: string;
}

export const LiveScoreboard: React.FC<Props> = ({ game, isLive, celebration, ourGoalPulse = 0, opponentGoalPulse = 0, label }) => {
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

  const leftPulse = game.isAway ? opponentGoalPulse : ourGoalPulse;
  const rightPulse = game.isAway ? ourGoalPulse : opponentGoalPulse;
  const leftAnim = game.isAway ? 'animate-score-conceded' : 'animate-score-pop';
  const rightAnim = game.isAway ? 'animate-score-pop' : 'animate-score-conceded';

  const resultTone = ourGoals > opponentGoals ? 'win' : ourGoals < opponentGoals ? 'loss' : 'draw';

  // Altijd een donkere "held-kaart" (navy), zowel live als bij de laatste wedstrijd: het
  // visuele startpunt van het startscherm. Scores in het display-lettertype.
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-navy text-white transition-all duration-500 ${
      isLive ? 'shadow-xl ring-2 ring-volt/60' : 'shadow-lg'
    }`}>
      {/* Subtiel decoratief accent: een vage limoengroene gloed rechtsboven */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -end-16 w-48 h-48 rounded-full bg-volt/10 blur-2xl" />

      {/* Een volledig voetbalveld als textuur (zijlijnen, middenlijn, middencirkel, strafschop- en
          doelgebieden). Getekend in procenten i.p.v. met een viewBox, zodat het veld altijd volledig
          binnen de kaart past, ongeacht de breedte. De middencirkel heeft een vaste straal zodat hij
          rond blijft. Geen middenstip: die vormde met het streepje tussen de scores een dubbelpunt. */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 w-full h-full text-white opacity-[0.12]">
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="3%" y="6%" width="94%" height="88%" rx="2" />
          <line x1="50%" y1="6%" x2="50%" y2="94%" />
          <circle cx="50%" cy="50%" r="36" />
          <rect x="3%" y="27%" width="13%" height="46%" />
          <rect x="84%" y="27%" width="13%" height="46%" />
          <rect x="3%" y="39%" width="5%" height="22%" />
          <rect x="92%" y="39%" width="5%" height="22%" />
        </g>
      </svg>

      <div className="relative flex justify-between items-center mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${
          isLive ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70'
        }`}>
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          {isLive ? t('scoreboard.live') : (label ?? t('scoreboard.lastMatch'))}
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
          <p className="font-display text-7xl font-bold leading-none tabular-nums">
            <span key={leftPulse} className={leftPulse ? leftAnim : ''}>{leftScore}</span>
          </p>
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
          <p className="font-display text-7xl font-bold leading-none tabular-nums">
            <span key={rightPulse} className={rightPulse ? rightAnim : ''}>{rightScore}</span>
          </p>
        </div>
      </div>

      {/* Viering: limoengroene flits over de kaart met een grote titel (bv. "Doelpunt!") */}
      {celebration && (
        <div
          key={celebration.key}
          role="status"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-volt text-navy text-center px-4 animate-celebrate-flash pointer-events-none"
        >
          <span className="font-display text-6xl font-bold leading-none animate-celebrate-title">
            {celebration.title}
          </span>
          {celebration.subtitle && (
            <span className="mt-2 text-base font-semibold animate-celebrate-title whitespace-pre-line leading-snug">{celebration.subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};
