import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, Trash2, ChevronRight, ChevronLeft, Edit3, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Game, Player } from '../types';
import { getDateLocale } from '../i18n';
import { buildEventTimeline } from '../utils/eventTimeline';
import { formatMinute } from '../utils/matchTime';
import { computeSeasonBadges, type Milestone } from '../utils/badges';
import { MilestoneList } from './Badges';
import { LiveScoreboard } from './LiveScoreboard';
import { useSubPage } from '../utils/useSubPage';

interface Props {
  games: Game[];
  players: Player[];
  onDeleteGame: (id: number) => void;
  onEditGame: (game: Game) => void;
  startNewGame: () => void;
  canStart: boolean;
  isAdminMode: boolean;
  // Als er vanuit het Dashboard op een wedstrijd getikt is, opent hier meteen de detailpagina ervan.
  initialExpandedGameId?: number | null;
  onExpandConsumed?: () => void;
}

export const GameHistory: React.FC<Props> = ({ games, players, onDeleteGame, onEditGame, startNewGame, canStart, isAdminMode, initialExpandedGameId, onExpandConsumed }) => {
  const { t } = useTranslation();
  // Geselecteerde wedstrijd = detailpagina open; null = overzicht. Terug (knop of telefoon)
  // brengt je naar het overzicht op dezelfde scrollpositie.
  const { selected: selectedGameId, open: openGame, close: closeGame } = useSubPage<number>(initialExpandedGameId ?? null);

  // Eenmalig "verbruiken" van de doorgegeven wedstrijd-id, zodat een latere, gewone navigatie
  // naar deze pagina (via de onderste balk) niet per ongeluk dezelfde wedstrijd blijft openen.
  useEffect(() => {
    if (initialExpandedGameId != null) onExpandConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [confirmDelete, setConfirmDelete] = useState<{ id: number; opponent: string; date: string } | null>(null);

  // --- FILTERING ---
  // Alleen voltooide wedstrijden tonen in de geschiedenis
  const finishedGames = games.filter(g => g.status === 'finished');

  // Badges per seizoen, om per wedstrijd te tonen welke nieuwe badges er behaald werden.
  const milestonesByGame = useMemo(() => {
    const map = new Map<number, Milestone[]>();
    const seasons = Array.from(new Set(finishedGames.map(g => g.seasonId).filter(Boolean)));
    seasons.forEach(season => {
      computeSeasonBadges(games, players, season).milestones.forEach(m => {
        if (!map.has(m.gameId)) map.set(m.gameId, []);
        map.get(m.gameId)!.push(m);
      });
    });
    return map;
    // finishedGames is afgeleid van games
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, players]);
  const playerName = (id: number) => players.find(p => p.id === id)?.name || t('timeline.unknown');

  const openConfirm = (e: React.MouseEvent, g: Game) => {
    e.stopPropagation();
    setConfirmDelete({
      id: g.id as number,
      opponent: g.opponent || 'Onbekende tegenstander',
      date: new Date(g.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    });
  };

  const deletePopup = confirmDelete && (
    <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center px-4" onMouseDown={() => setConfirmDelete(null)}>
      <div dir="ltr" lang="nl" className="bg-white p-6 rounded-xl shadow-2xl max-w-xs w-full select-none" onMouseDown={e => e.stopPropagation()}>
        <div className="mb-6 text-lg font-bold text-navy">
          Wedstrijd tegen <span>{confirmDelete.opponent}</span> verwijderen?
        </div>
        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 rounded-lg font-semibold text-gray-500 hover:bg-gray-100 transition" onClick={() => setConfirmDelete(null)}>Nee</button>
          <button
            className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition"
            onClick={() => { onDeleteGame(confirmDelete.id); setConfirmDelete(null); closeGame(); }}
          >
            Ja
          </button>
        </div>
      </div>
    </div>
  );

  // --- DETAILPAGINA VAN ÉÉN WEDSTRIJD ---
  const selectedGame = selectedGameId != null ? finishedGames.find(g => g.id === selectedGameId) : undefined;
  if (selectedGame) {
    const g = selectedGame;
    const milestones = milestonesByGame.get(g.id) ?? [];
    return (
      <div className="max-w-2xl mx-auto p-4 pb-32 space-y-4">
        {/* Terug naar het overzicht */}
        <button
          onClick={closeGame}
          className="flex items-center gap-1 -ms-1.5 pt-2 pe-2 py-1 text-navy font-semibold text-sm rounded-lg active:bg-navy/5 transition-colors"
        >
          <ChevronLeft size={20} className="rtl:rotate-180" /> {t('history.title')}
        </button>

        <LiveScoreboard
          game={g}
          isLive={false}
          label={new Date(g.date).toLocaleDateString(getDateLocale(), { weekday: 'short', day: 'numeric', month: 'long' })}
        />

        {/* Wedstrijdverloop per kwart */}
        <section>
          <h2 className="text-base font-semibold text-navy mb-2 px-1">{t('history.course')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.quarters.map((q, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-navy/5">
                  <span className="text-sm font-semibold text-navy">{t('common.quarter', { number: q.number })}</span>
                  <span dir="ltr" className="font-display text-lg font-bold text-navy bg-navy/5 px-2 py-0.5 rounded-md tabular-nums leading-none">
                    {g.isAway ? `${q.opponentGoalEvents.length}-${q.goalEvents.length}` : `${q.goalEvents.length}-${q.opponentGoalEvents.length}`}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(() => {
                    const timeline = buildEventTimeline(q, players, t);
                    return timeline.length === 0 ? (
                      <p className="text-xs text-gray-500">{t('history.noEvents')}</p>
                    ) : (
                      timeline.map(item => (
                        <div key={item.key} className="flex items-center gap-2 text-sm">
                          <span className="w-10 text-end font-semibold text-gray-500 tabular-nums shrink-0">
                            {formatMinute(item.minute)}
                          </span>
                          {item.icon}
                          <span className="text-gray-700 flex-1">{item.text}</span>
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Nieuwe badges in deze wedstrijd */}
        {milestones.length > 0 && (
          <section className="bg-white ring-1 ring-navy/5 shadow-sm px-4 pt-3 pb-1 rounded-2xl">
            <h2 className="text-base font-semibold text-navy">{t('badges.matchTitle')}</h2>
            <MilestoneList milestones={milestones} playerName={playerName} />
          </section>
        )}

        {/* Notities */}
        {g.notes && (
          <div className="bg-white ring-1 ring-navy/5 shadow-sm p-4 rounded-2xl text-sm italic text-gray-700 leading-relaxed">
            "{g.notes}"
          </div>
        )}

        {/* Actie Knoppen (alleen zichtbaar in Admin mode) */}
        {isAdminMode && (
          <div dir="ltr" lang="nl" className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onEditGame(g)}
              className="h-11 flex items-center justify-center gap-1.5 bg-white ring-1 ring-navy/10 text-navy rounded-xl font-semibold text-sm active:scale-[0.98] transition-all"
            >
              <Edit3 size={15} /> Bewerk wedstrijd
            </button>
            <button
              onClick={(e) => openConfirm(e, g)}
              className="h-11 flex items-center justify-center gap-1.5 bg-red-50 ring-1 ring-red-200 text-red-600 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all"
            >
              <Trash2 size={15} /> Verwijder wedstrijd
            </button>
          </div>
        )}

        {deletePopup}
      </div>
    );
  }

  // --- OVERZICHT ---
  return (
    <div className="max-w-2xl mx-auto p-4 pb-40"> {/* pb-40 voor ruimte boven de sticky button */}
      {/* Header Sectie */}
      <div className="flex justify-between items-center mb-6 px-1 pt-2">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="w-1.5 h-8 rounded-sm bg-volt" />
          <h1 className="font-display text-4xl font-semibold text-navy leading-none">{t('history.title')}</h1>
        </div>
      </div>
      
      <div className="space-y-3">
        {finishedGames.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-navy/10">
            <p className="text-gray-500 font-medium">{t('history.empty')}</p>
          </div>
        ) : (
          [...finishedGames]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((g) => {
              const ourGoals = g.quarters.reduce((s, q) => s + q.goalEvents.length, 0);
              const opponentGoals = g.quarters.reduce((s, q) => s + q.opponentGoalEvents.length, 0);
              const isWin = ourGoals > opponentGoals;
              const isDraw = ourGoals === opponentGoals;
              const isLoss = ourGoals < opponentGoals;

              return (
                <button
                  key={g.id}
                  onClick={() => openGame(g.id as number)}
                  className="w-full text-start bg-white rounded-2xl shadow-sm ring-1 ring-navy/5 hover:ring-navy/15 active:scale-[0.99] transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                        ${isWin ? 'bg-volt text-navy' : isLoss ? 'bg-red-500 text-white' : 'bg-gray-400 text-white'}`}
                      >
                        {isWin && <Check size={14} strokeWidth={4} />}
                        {isDraw && <div className="w-3.5 h-0.5 bg-current rounded-full" />}
                        {isLoss && <X size={14} strokeWidth={4} />}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500">
                          {new Date(g.date).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' })}
                        </div>
                        {/* Thuisploeg altijd links, ook in het Arabisch (zelfde als het scorebord). */}
                        <div className="font-semibold text-navy text-sm sm:text-base leading-tight">
                          <span dir="ltr">{g.isAway ? `${g.opponent || t('common.opponent')} - Kaulille` : `Kaulille - ${g.opponent || t('common.opponent')}`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div dir="ltr" className="font-display text-3xl font-bold text-navy tabular-nums leading-none">
                        {g.isAway ? `${opponentGoals}-${ourGoals}` : `${ourGoals}-${opponentGoals}`}
                      </div>
                      <ChevronRight size={20} className="text-gray-400 rtl:rotate-180" />
                    </div>
                  </div>

                </button>
              );
            })
        )}
      </div>

      {/* STICKY CONTAINER VOOR NIEUWE WEDSTRIJD KNOP (alleen zichtbaar in Admin mode) */}
      {isAdminMode && (
        <div dir="ltr" lang="nl" className="fixed bottom-[6.25rem] left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={startNewGame}
              disabled={!canStart}
              className="pointer-events-auto w-full h-12 bg-volt text-navy rounded-xl text-base font-semibold shadow-lg shadow-navy/15 ring-1 ring-navy/10 hover:brightness-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2.5} />
              Nieuwe wedstrijd
            </button>
          </div>
        </div>
      )}

      {deletePopup}
    </div>
  );
};