import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Target, Plus, Trophy, Shield, Activity, Handshake, Axe, Users, Gamepad2, Smile, Eye, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LiveScoreboard, type ScoreboardCelebration } from './LiveScoreboard';
import { burstConfettiFrom, vibrate } from '../utils/celebrate';
import { computeSeasonBadges, liveGoalMilestone } from '../utils/badges';
import { MilestoneList } from './Badges';
import { LanguagePicker } from './LanguagePicker';
import type { Player, Game } from '../types';
import { getSeasonId } from '../utils/season';
import { useLiveViewerCount } from '../utils/liveViewers';

interface Props {
  players: Player[];
  games: Game[];
  startNewGame: () => void;
  canStart: boolean;
  isAdminMode: boolean;
  onLogoTap: () => void;
  onEditGame: (game: Game) => void;
  onViewGame: (game: Game) => void;
}

export const Dashboard: React.FC<Props> = ({ players, games, startNewGame, canStart, isAdminMode, onLogoTap, onEditGame, onViewGame }) => {
  const { t } = useTranslation();
  const [liveGame, setLiveGame] = useState<Game | null>(null);
  const [lastFinishedGame, setLastFinishedGame] = useState<Game | null>(null);
  const liveViewerCount = useLiveViewerCount(liveGame ? (liveGame.id as number) : null);

  // REAL-TIME FIREBASE LISTENERS
  useEffect(() => {
    // 1. Luister naar een actieve match voor de LIVE status
    const qLive = query(
      collection(db, "games"), 
      where("status", "==", "active"), 
      limit(1)
    );
    const unsubscribeLive = onSnapshot(qLive, (snapshot) => {
      if (!snapshot.empty) {
        setLiveGame({ ...snapshot.docs[0].data() } as Game);
      } else {
        setLiveGame(null);
      }
    });

    // 2. Haal de laatste voltooide match op voor de 'Laatste uitslag'
    const qLast = query(
      collection(db, "games"), 
      where("status", "==", "finished"), 
      orderBy("date", "desc"), 
      limit(1)
    );
    const unsubscribeLast = onSnapshot(qLast, (snapshot) => {
      if (!snapshot.empty) {
        setLastFinishedGame({ ...snapshot.docs[0].data() } as Game);
      } else {
        setLastFinishedGame(null);
      }
    });

    return () => {
      unsubscribeLive();
      unsubscribeLast();
    };
  }, []);

  const getPlayerName = (id: number) => players.find(p => p.id === id)?.name || 'Onbekend';

  // --- BADGES & MIJLPALEN (lopend seizoen) ---
  const season = getSeasonId();
  const seasonBadges = useMemo(() => computeSeasonBadges(games, players, season), [games, players, season]);
  // Mijlpalen uit de laatste 2 wedstrijden waarin er behaald werden, nieuwste eerst.
  const recentMilestones = useMemo(() => {
    const ms = seasonBadges.milestones;
    const recentGameIds = Array.from(new Set([...ms].reverse().map(m => m.gameId))).slice(0, 2);
    return [...ms].reverse().filter(m => recentGameIds.includes(m.gameId)).slice(0, 8);
  }, [seasonBadges]);

  // --- VIERINGEN ---
  // We vieren enkel wat er gebeurt terwijl het startscherm open staat: bij het openen van de app
  // nemen we de huidige stand als vertrekpunt, zodat oude doelpunten niet opnieuw gevierd worden.
  const scoreboardRef = useRef<HTMLElement>(null);
  const lastScoreRef = useRef<{ id: number; ours: number; theirs: number } | null>(null);
  // Id van de live wedstrijd die we hier zagen spelen: als die als gewonnen afgesloten wordt,
  // volgt eenmalig een overwinningsviering.
  const watchedLiveGameIdRef = useRef<number | null>(null);
  const [celebration, setCelebration] = useState<ScoreboardCelebration | null>(null);
  const [ourGoalPulse, setOurGoalPulse] = useState(0);
  const [opponentGoalPulse, setOpponentGoalPulse] = useState(0);

  useEffect(() => {
    if (!liveGame) {
      lastScoreRef.current = null;
      return;
    }
    const ours = liveGame.quarters.reduce((sum, q) => sum + (q.goalEvents?.length || 0), 0);
    const theirs = liveGame.quarters.reduce((sum, q) => sum + (q.opponentGoalEvents?.length || 0), 0);
    const prev = lastScoreRef.current;
    lastScoreRef.current = { id: liveGame.id, ours, theirs };
    watchedLiveGameIdRef.current = liveGame.id;
    if (!prev || prev.id !== liveGame.id) return;

    if (ours > prev.ours) {
      // Het nieuwste doelpunt staat achteraan in het lopende kwart (of anders in het laatste kwart met doelpunten).
      const current = liveGame.currentQuarter ? liveGame.quarters[liveGame.currentQuarter - 1] : undefined;
      const allGoals = liveGame.quarters.flatMap(q => q.goalEvents || []);
      const goal = current?.goalEvents?.length ? current.goalEvents[current.goalEvents.length - 1] : allGoals[allGoals.length - 1];
      const scorer = goal?.scorerId != null ? getPlayerName(goal.scorerId) : t('timeline.ownGoalOpponent');
      const assist = goal?.assistId != null ? t('celebration.assistBy', { name: getPlayerName(goal.assistId) }) : null;
      // Levert dit doelpunt een nieuwe badge op (bv. eerste doelpunt of hattrick)?
      let badgeLine: string | undefined;
      const scorerId = goal?.scorerId;
      if (scorerId != null && !players.find(p => p.id === scorerId)?.isGuest) {
        const before = seasonBadges.players[scorerId]?.find(b => b.id === 'scorer')?.value ?? 0;
        const inThisGame = allGoals.filter(e => e.scorerId === scorerId).length;
        const milestone = liveGoalMilestone(before, inThisGame);
        if (milestone) badgeLine = t('badges.newBadge', { badge: t(`badges.names.${milestone.id}`) });
      }
      setOurGoalPulse(p => p + 1);
      setCelebration({
        key: Date.now(),
        title: t('celebration.goal'),
        subtitle: [assist ? `${scorer} · ${assist}` : scorer, badgeLine].filter(Boolean).join('\n'),
      });
      burstConfettiFrom(scoreboardRef.current);
      vibrate([30, 50, 30]);
    }
    if (theirs > prev.theirs) {
      setOpponentGoalPulse(p => p + 1);
    }
    // getPlayerName/t veranderen niet tijdens een wedstrijd; enkel nieuwe snapshots tellen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveGame]);

  useEffect(() => {
    const watchedId = watchedLiveGameIdRef.current;
    if (!lastFinishedGame || watchedId == null || lastFinishedGame.id !== watchedId) return;
    watchedLiveGameIdRef.current = null;
    const ours = lastFinishedGame.quarters.reduce((sum, q) => sum + (q.goalEvents?.length || 0), 0);
    const theirs = lastFinishedGame.quarters.reduce((sum, q) => sum + (q.opponentGoalEvents?.length || 0), 0);
    if (ours > theirs) {
      setCelebration({ key: Date.now(), title: t('celebration.won'), subtitle: `${ours} - ${theirs}` });
      burstConfettiFrom(scoreboardRef.current, 220);
      vibrate([40, 60, 40, 60, 80]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastFinishedGame]);

  // Viering na ~3 seconden weer weghalen
  useEffect(() => {
    if (!celebration) return;
    const timeout = setTimeout(() => setCelebration(null), 3000);
    return () => clearTimeout(timeout);
  }, [celebration]);

  const finishedGames = games.filter(g => g.status === 'finished');

  const lastFiveGames = [...finishedGames]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .reverse();

  // BEREKENING VAN TEAM STATISTIEKEN
  const stats = finishedGames.reduce((acc, game) => {
    const ours = game.quarters.reduce((sum, q) => sum + q.goalEvents.length, 0);
    const theirs = game.quarters.reduce((sum, q) => sum + q.opponentGoalEvents.length, 0);

    acc.goalsFor += ours;
    acc.goalsAgainst += theirs;

    game.quarters.forEach(q => {
      acc.totalAssists += q.goalEvents.filter(e => e.assistId !== null).length;
      acc.totalTackles += (q.tackleEvents || []).length;
      acc.totalSaves += (q.saveEvents || []).length;
    });

    if (ours > theirs) acc.wins += 1;
    else if (ours < theirs) acc.losses += 1;
    else acc.draws += 1;

    return acc;
  }, {
    wins: 0, draws: 0, losses: 0,
    goalsFor: 0, goalsAgainst: 0,
    totalAssists: 0, totalTackles: 0, totalSaves: 0
  });

  const goalDiff = stats.goalsFor - stats.goalsAgainst;

  const getResult = (game: Game) => {
    if (game.result) return game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'D';
    const ours = game.quarters.reduce((sum, q) => sum + q.goalEvents.length, 0);
    const theirs = game.quarters.reduce((sum, q) => sum + q.opponentGoalEvents.length, 0);
    if (ours > theirs) return 'W';
    if (ours < theirs) return 'L';
    return 'D';
  };

  // Statistieken per speler verzamelen
  const goalsByPlayer: Record<number, number> = {};
  const assistsByPlayer: Record<number, number> = {};
  const tacklesByPlayer: Record<number, number> = {};
  const savesByKeeper: Record<number, number> = {};

  finishedGames.forEach(g => {
    g.quarters.forEach(q => {
      q.goalEvents.forEach(e => {
        // scorerId is null bij een eigen doelpunt van de tegenstander — telt mee voor de
        // teamscore (elders al zo berekend), maar niet voor een individuele topschutter.
        if (e.scorerId != null) {
          goalsByPlayer[e.scorerId] = (goalsByPlayer[e.scorerId] || 0) + 1;
        }
        if (e.assistId !== null) {
          assistsByPlayer[e.assistId] = (assistsByPlayer[e.assistId] || 0) + 1;
        }
      });
      (q.tackleEvents || []).forEach(e => tacklesByPlayer[e.playerId] = (tacklesByPlayer[e.playerId] || 0) + 1);
      (q.saveEvents || []).forEach(e => savesByKeeper[e.playerId] = (savesByKeeper[e.playerId] || 0) + 1);
    });
  });

  const sortedScorers = Object.entries(goalsByPlayer).map(([id, goals]) => ({ id: parseInt(id), goals })).sort((a, b) => b.goals - a.goals).slice(0, 3);
  const sortedAssists = Object.entries(assistsByPlayer).map(([id, count]) => ({ id: parseInt(id), count })).sort((a, b) => b.count - a.count).slice(0, 3);
  const sortedTackles = Object.entries(tacklesByPlayer).map(([id, count]) => ({ id: parseInt(id), count })).sort((a, b) => b.count - a.count).slice(0, 3);
  const topKeepers = Object.entries(savesByKeeper).map(([id, saves]) => ({ id: parseInt(id), saves })).sort((a, b) => b.saves - a.saves).slice(0, 3);

  // Eén vaste stijl voor alle lichte kaarten op het startscherm.
  const card = 'bg-white rounded-2xl shadow-sm ring-1 ring-navy/5';
  const cardLabel = 'flex items-center gap-1.5 text-sm font-medium text-gray-500';

  return (
    <div className={`max-w-2xl mx-auto p-4 select-none space-y-5 ${isAdminMode ? 'pb-48' : 'pb-32'}`}>
      {/* Header */}
      <div className="px-1 pt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="w-1.5 h-8 rounded-sm bg-volt" />
          <h1 className="font-display text-4xl font-semibold text-navy leading-none">U10 Kaulille</h1>
        </div>
        <LanguagePicker />
      </div>

      {/* Live Scoreboard / Laatste Resultaat */}
      <section ref={scoreboardRef} className="animate-in fade-in slide-in-from-top-4 duration-500">
        {liveGame ? (
          <div
            onClick={() => { if (isAdminMode) onEditGame(liveGame); }}
            className={isAdminMode ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}
          >
            <LiveScoreboard game={liveGame} isLive={true} celebration={celebration} ourGoalPulse={ourGoalPulse} opponentGoalPulse={opponentGoalPulse} />
            {liveViewerCount != null && liveViewerCount > 0 && (
              <p className="flex items-center justify-center gap-1 text-xs text-gray-500 font-medium mt-2">
                <Eye size={13} /> {t('plurals.viewers', { count: liveViewerCount })}
              </p>
            )}
            {isAdminMode && (
              <p dir="ltr" lang="nl" className="text-center text-xs text-navy/70 font-semibold mt-2">
                Tik om de wedstrijd verder te registreren
              </p>
            )}
          </div>
        ) : lastFinishedGame ? (
          <div
            onClick={() => onViewGame(lastFinishedGame)}
            className="cursor-pointer active:scale-[0.99] transition-transform"
          >
            <LiveScoreboard game={lastFinishedGame} isLive={false} celebration={celebration} />
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <Trophy className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500 text-sm font-medium">{t('dashboard.noData')}</p>
          </div>
        )}
      </section>

      <div className="grid gap-4">
        {/* Top Rij: Balans, Vorm en Saldo */}
        <div className="grid grid-cols-3 gap-4">
          <div className={`col-span-2 ${card} p-4 flex flex-col justify-between min-h-[120px]`}>
            <div className={`${cardLabel} mb-3`}>
              <Activity size={15} className="text-navy/40" /> {t('dashboard.resultsForm')}
            </div>

            <div className="flex items-baseline gap-4 mb-2">
              {[
                { value: stats.wins, label: t('dashboard.winShort') },
                { value: stats.draws, label: t('dashboard.drawShort') },
                { value: stats.losses, label: t('dashboard.lossShort') },
              ].map((item, i) => (
                <span key={i} className="flex items-baseline gap-0.5">
                  <span className="font-display text-3xl font-bold text-navy leading-none tabular-nums">{item.value}</span>
                  <span className="text-sm font-semibold text-gray-400">{item.label}</span>
                </span>
              ))}
            </div>

            {/* pt-1.5 erbij (naast pb-1): overflow-x-auto laat de Y-as ook clippen, dus zonder
                wat ruimte bovenaan werd de ring van het meest recente bolletje afgesneden. */}
            <div className="flex items-center justify-start overflow-x-auto pt-1.5 pb-1">
              {games.length === 0 ? (
                <span className="text-xs text-gray-500 font-medium">{t('dashboard.noFormData')}</span>
              ) : (
                lastFiveGames.map((game, i) => {
                  const isMostRecent = i === lastFiveGames.length - 1;
                  const result = getResult(game);
                  return (
                    <div
                      key={i}
                      className={`w-7 h-7 text-xs rounded-full flex items-center justify-center shrink-0 font-bold transition-all ${
                        result === 'W' ? 'bg-volt text-navy' : result === 'L' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                      } ${i !== 0 ? 'ms-1.5' : ''} ${
                        isMostRecent ? 'ring-2 ring-offset-2 ring-navy/30' : ''
                      }`}
                    >
                      {t(`dashboard.form${{ W: 'Win', L: 'Loss', D: 'Draw' }[result]}`)}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={`col-span-1 ${card} p-4 flex flex-col justify-between min-h-[120px]`}>
            <div className={`${cardLabel} mb-1`}>
              <Target size={15} className="text-navy/40" /> {t('dashboard.goalDiff')}
            </div>
            <div>
              <div className={`font-display text-4xl font-bold leading-none tabular-nums ${goalDiff > 0 ? 'text-volt-ink' : goalDiff < 0 ? 'text-red-600' : 'text-navy'}`}>
                {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
              </div>
              <div className="text-xs text-gray-500 font-medium mt-1 leading-tight">
                {stats.goalsFor} {t('dashboard.goalsFor')} · {stats.goalsAgainst} {t('dashboard.goalsAgainst')}
              </div>
            </div>
          </div>
        </div>

        {/* --- TEAM STATS SECTIE --- */}
        <div className={`${card} p-5`}>
          <div className={`${cardLabel} mb-5`}>
            <Users size={15} className="text-navy/40" /> {t('dashboard.teamStats')}
          </div>

          <div className="grid grid-cols-3 gap-y-6 gap-x-2">
            {[
              { label: t('dashboard.matches'), value: finishedGames.length, icon: <Gamepad2 size={14} /> },
              { label: t('dashboard.goals'), value: stats.goalsFor, icon: <Target size={14} /> },
              { label: t('dashboard.assists'), value: stats.totalAssists, icon: <Handshake size={14} /> },
              { label: t('dashboard.tackles'), value: stats.totalTackles, icon: <Axe size={14} /> },
              { label: t('dashboard.saves'), value: stats.totalSaves, icon: <Shield size={14} /> },
              { label: t('dashboard.fun'), value: '100%', icon: <Smile size={14} /> },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="font-display text-4xl font-bold text-navy leading-none tabular-nums">
                  {item.value}
                </span>
                <span className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                  <span className="text-navy/30">{item.icon}</span>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* --- RECENTE MIJLPALEN (zichtbaar voor iedereen) --- */}
        {recentMilestones.length > 0 && (
          <div className={`${card} p-5`}>
            <div className={`${cardLabel} mb-1`}>
              <Award size={15} className="text-navy/40" /> {t('badges.recentTitle')}
            </div>
            <MilestoneList milestones={recentMilestones} playerName={getPlayerName} />
          </div>
        )}

        {/* --- NIEUWE WEDSTRIJD KNOP (alleen zichtbaar in Admin mode) ---
            Vast onderaan het scherm, net boven de navigatiebalk, zonder achtergrond: de rest van
            de pagina scrollt erachter door. De wrapper laat klikken door (pointer-events-none),
            enkel de knop zelf vangt ze op. */}
        {isAdminMode && (
          <div className="fixed left-0 right-0 bottom-[5.5rem] z-40 px-4 pointer-events-none">
            <div className="max-w-2xl mx-auto">
              <button
                dir="ltr"
                lang="nl"
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

        {/* Individuele prestaties (Topschutter, De Muur, Hakbijl, Assistenkoning) - alleen zichtbaar in Admin mode */}
        {isAdminMode && (
          <div dir="ltr" lang="nl" className="contents">
            {[
              { title: 'Topschutter', icon: <Trophy size={15} />, items: sortedScorers.map(s => ({ id: s.id, value: s.goals })), unit: 'goals' },
              { title: 'De Muur', icon: <Shield size={15} />, items: topKeepers.map(k => ({ id: k.id, value: k.saves })), unit: 'saves' },
              { title: 'Hakbijl', icon: <Axe size={15} />, items: sortedTackles.map(k => ({ id: k.id, value: k.count })), unit: 'tackles' },
              { title: 'Assistenkoning', icon: <Handshake size={15} />, items: sortedAssists.map(k => ({ id: k.id, value: k.count })), unit: 'assists' },
            ].filter(list => list.items.length > 0).map(list => (
              <div key={list.title} className={`${card} p-5`}>
                <div className={`${cardLabel} mb-3`}>
                  <span className="text-navy/40">{list.icon}</span> {list.title}
                </div>
                <div className="divide-y divide-gray-100">
                  {list.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 py-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center font-display text-base font-bold ${index === 0 ? 'bg-volt text-navy' : 'bg-gray-100 text-gray-500'}`}>
                        {index + 1}
                      </span>
                      <span className="flex-1 font-medium text-gray-800">{getPlayerName(item.id)}</span>
                      <span className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold text-navy tabular-nums leading-none">{item.value}</span>
                        <span className="text-xs text-gray-500">{list.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <img
          src="/clublogo.png"
          alt="Club Logo"
          onClick={onLogoTap}
          className={`max-w-[70px] object-contain transition-all duration-500 cursor-pointer ${isAdminMode ? '' : 'opacity-40 grayscale hover:grayscale-0'}`}
        />
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold text-navy/50">U10 Kaulille FC</p>
          <p className="text-xs text-navy/40 font-medium mt-0.5">{t('dashboard.season', { season: getSeasonId() })}</p>
          {isAdminMode && (
            <p dir="ltr" lang="nl" className="mt-1.5 text-xs font-semibold text-volt-ink bg-volt-soft px-2 py-0.5 rounded-md">Admin mode actief</p>
          )}
        </div>
      </div>
    </div>
  );
};
