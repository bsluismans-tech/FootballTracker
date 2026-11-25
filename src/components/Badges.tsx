import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Target, Handshake, Axe, ShieldCheck, Hand, CalendarCheck, Shuffle, Flame, Trophy, Zap, TrendingUp, Lock, Users,
  type LucideIcon,
} from 'lucide-react';
import type { BadgeId, BadgeProgress, Milestone } from '../utils/badges';

export const BADGE_ICONS: Record<BadgeId, LucideIcon> = {
  scorer: Target,
  assists: Handshake,
  tackles: Axe,
  cleanSheets: ShieldCheck,
  saves: Hand,
  matches: CalendarCheck,
  versatile: Shuffle,
  hattrick: Flame,
  teamGoals: Trophy,
  teamPlay: Users,
  winStreak: Zap,
  comeback: TrendingUp,
  teamCleanSheet: Lock,
};

// Zeshoek-vorm voor de medaille (speels, maar strak).
const HEXAGON = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

/** Eén medaille: limoengroen als behaald, grijs als nog te halen. `label` = behaalde drempel. */
export const BadgeMedal: React.FC<{ id: BadgeId; earned: boolean; label?: number | null; size?: 'sm' | 'md' }> = ({ id, earned, label, size = 'md' }) => {
  const Icon = BADGE_ICONS[id];
  const dim = size === 'sm' ? 'w-9 h-10' : 'w-12 h-[3.4rem]';
  return (
    <div className={`relative shrink-0 ${dim}`}>
      <div
        className={`absolute inset-0 flex items-center justify-center ${earned ? 'bg-volt text-navy' : 'bg-gray-100 text-gray-300'}`}
        style={{ clipPath: HEXAGON }}
      >
        <Icon size={size === 'sm' ? 16 : 22} strokeWidth={2.25} />
      </div>
      {earned && label != null && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 min-w-5 px-1 rounded-md bg-navy text-white font-display text-xs font-bold leading-4 text-center tabular-nums">
          {label}
        </span>
      )}
    </div>
  );
};

/** Raster met alle badges en de voortgang naar het volgende niveau. */
export const BadgeGrid: React.FC<{ progress: BadgeProgress[] }> = ({ progress }) => {
  const { t } = useTranslation();
  // Behaalde badges eerst (hoogste niveau eerst), daarna de nog te halen badges.
  const sorted = [...progress].sort((a, b) => (b.level > 0 ? 1 : 0) - (a.level > 0 ? 1 : 0));
  return (
    // Onder elkaar (één badge per rij): de app wordt vooral op een telefoon gebruikt, zo past alle tekst.
    <div className="flex flex-col gap-2">
      {sorted.map(b => {
        const earned = b.level > 0;
        const pct = b.next == null ? 100 : Math.round((b.value / b.next) * 100);
        return (
          <div key={b.id} className="bg-white rounded-xl ring-1 ring-navy/5 shadow-sm p-3 flex items-center gap-3">
            <BadgeMedal id={b.id} earned={earned} label={b.reached} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={`text-sm font-semibold leading-tight ${earned ? 'text-navy' : 'text-gray-500'}`}>{t(`badges.descriptions.${b.id}`)}</p>
                <p className="text-xs font-medium text-gray-500 tabular-nums shrink-0">
                  {b.next == null ? t('badges.maxLevel') : `${b.value} / ${b.next}`}
                </p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${b.next == null ? 'bg-volt' : 'bg-navy'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Lijst met mijlpalen (bv. "Recente mijlpalen" op het startscherm). */
export const MilestoneList: React.FC<{ milestones: Milestone[]; playerName: (id: number) => string }> = ({ milestones, playerName }) => {
  const { t } = useTranslation();
  return (
    <div className="divide-y divide-gray-100">
      {milestones.map(m => (
        <div key={`${m.gameId}-${m.id}-${m.level}-${m.playerId ?? 'team'}`} className="flex items-center gap-3 py-2.5">
          <BadgeMedal id={m.id} earned label={m.threshold} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy truncate">{m.playerId == null ? t('badges.team') : playerName(m.playerId)}</p>
            <p className="text-xs text-gray-500 truncate">{t(`badges.descriptions.${m.id}`)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

