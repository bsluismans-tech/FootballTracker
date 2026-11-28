import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Target, Handshake, Axe, ShieldCheck, Hand, CalendarCheck, Flame, Trophy, Zap, TrendingUp, Lock, Users, Repeat,
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
  streak: Repeat,
  hattrick: Flame,
  teamGoals: Trophy,
  teamPlay: Users,
  winStreak: Zap,
  comeback: TrendingUp,
  teamCleanSheet: Lock,
};

// Zeshoek-vorm voor de medaille (speels, maar strak).
const HEXAGON = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

/**
 * Eén medaille: limoengroen als behaald, grijs als nog te halen. Onder de medaille staat het
 * behaalde level ("Level 2"). Bewust geen los getal op de medaille: een "5" bij Assists werd
 * gelezen als "5 badges" in plaats van "5 assists".
 */
export const BadgeMedal: React.FC<{ id: BadgeId; level: number; size?: 'sm' | 'md' }> = ({ id, level, size = 'md' }) => {
  const { t } = useTranslation();
  const Icon = BADGE_ICONS[id];
  const earned = level > 0;
  const dim = size === 'sm' ? 'w-9 h-10' : 'w-12 h-[3.4rem]';
  return (
    // Vaste breedte, zodat de tekst ernaast altijd op dezelfde plek begint ("Level 1" vs "Level 2")
    <div className={`shrink-0 flex flex-col items-center gap-1 ${size === 'sm' ? 'w-12' : 'w-14'}`}>
      <div
        className={`flex items-center justify-center ${dim} ${earned ? 'bg-volt text-navy' : 'bg-gray-100 text-gray-300'}`}
        style={{ clipPath: HEXAGON }}
      >
        <Icon size={size === 'sm' ? 16 : 22} strokeWidth={2.25} />
      </div>
      {earned && (
        <span className="text-[11px] font-semibold leading-4 text-navy bg-navy/5 px-1.5 rounded-md whitespace-nowrap">
          {t('badges.level', { level })}
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
            <BadgeMedal id={b.id} level={b.level} />
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
          <BadgeMedal id={m.id} level={m.level} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy truncate">{m.playerId == null ? t('badges.team') : playerName(m.playerId)}</p>
            <p className="text-xs text-gray-500 truncate">{t(`plurals.badge_${m.id}`, { count: m.threshold })}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

