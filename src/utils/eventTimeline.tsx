import React from 'react';
import { Goal, Axe, Shield, Target, Bandage, RefreshCw, Triangle } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { Quarter, Player } from '../types';

// Read-only chronologische tijdslijn van alle events in één kwart — gebruikt in Wedstrijden
// (achteraf bekijken, zonder te moeten editeren). Voor de live invoerscreen (MatchPlay.tsx) is
// er een eigen, uitgebreidere variant met extra info (type/index/label) om events te verwijderen.
export interface TimelineItem {
  key: string;
  minute: number;
  icon: React.ReactNode;
  text: React.ReactNode;
}

// `t` komt van useTranslation() in de aanroepende component, zodat de tijdslijn mee wisselt
// van taal (deze tijdslijn is publiek zichtbaar en wordt dus vertaald).
export const buildEventTimeline = (quarter: Quarter, players: Player[], t: TFunction): TimelineItem[] => {
  const getName = (id?: number | null) =>
    id != null ? players.find(p => p.id === id)?.name || t('timeline.unknown') : t('timeline.unknown');

  const items: TimelineItem[] = [
    ...quarter.goalEvents.map((e, i): TimelineItem => ({
      key: `goal-${i}`,
      minute: e.minute ?? 0,
      icon: <Goal size={14} className="text-yellow-600 shrink-0" />,
      text: e.scorerId == null ? (
        <>{t('timeline.goal')} — <b>{t('timeline.ownGoalOpponent')}</b></>
      ) : (
        <>
          {t('timeline.goal')} <b>{getName(e.scorerId)}</b>
          {e.assistId != null && <span className="text-gray-400 font-normal"> ({t('timeline.assist')}: {getName(e.assistId)})</span>}
          {e.goalType && <span className="text-gray-400 font-normal"> — {t(`goalTypes.${e.goalType}`)}</span>}
        </>
      ),
    })),
    ...(quarter.tackleEvents || []).map((e, i): TimelineItem => ({
      key: `tackle-${i}`,
      minute: e.minute ?? 0,
      icon: <Axe size={14} className="text-blue-600 shrink-0" />,
      text: <>{t('timeline.tackle')} <b>{getName(e.playerId)}</b></>,
    })),
    ...(quarter.saveEvents || []).map((e, i): TimelineItem => ({
      key: `save-${i}`,
      minute: e.minute ?? 0,
      icon: <Shield size={14} className="text-emerald-600 shrink-0" />,
      text: <>{t('timeline.save')} <b>{getName(e.playerId)}</b></>,
    })),
    ...(quarter.opponentGoalEvents || []).map((e, i): TimelineItem => ({
      key: `opp-${i}`,
      minute: e.minute ?? 0,
      icon: <Target size={14} className="text-red-600 shrink-0" />,
      text: <>{t('timeline.opponentGoal')}{e.goalType && <span className="text-gray-400 font-normal"> — {t(`goalTypes.${e.goalType}`)}</span>}</>,
    })),
    ...(quarter.injuryEvents || []).map((e, i): TimelineItem => ({
      key: `injury-${i}`,
      minute: e.minute ?? 0,
      icon: <Bandage size={14} className="text-orange-600 shrink-0" />,
      text: <>{t('timeline.injury')} <b>{getName(e.playerId)}</b></>,
    })),
    ...(quarter.substitutions || []).map((s, i): TimelineItem => ({
      key: `sub-${i}`,
      minute: s.minute ?? 0,
      icon: <RefreshCw size={14} className="text-gray-500 shrink-0" />,
      text: (
        <>
          {t('timeline.substitution')}:{' '}
          <Triangle size={9} className="inline rotate-180 fill-red-500 text-red-500 -translate-y-0.4" /> <b>{getName(s.outId)}</b> -{' '}
          <Triangle size={9} className="inline fill-green-500 text-green-500 -translate-y-0.4" /> <b>{getName(s.inId)}</b>
        </>
      ),
    })),
  ];

  return items.sort((a, b) => a.minute - b.minute);
};
