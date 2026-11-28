import React, { useMemo, useState } from 'react';
import { Plus, Trash2, User, ChevronLeft, ChevronRight, Gamepad2, Star, Target, Handshake, Axe, Shield, Hand } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Player, Game, FieldPosition } from '../types';
import { computeQuarterSegments } from '../utils/insights';
import { computeSeasonBadges } from '../utils/badges';
import { getSeasonId } from '../utils/season';
import { BadgeGrid } from './Badges';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { CountUp } from './CountUp';
import { useSubPage } from '../utils/useSubPage';

interface Props {
  players: Player[];
  games: Game[];
  isAdminMode: boolean;
}

// De tweede positie tonen we pas vanaf een half kwart: een invalbeurt van 2' is geen "positie".
const SECOND_POSITION_MIN_MINUTES = 8;

// --- SUBPAGINA: SPELERSFICHE (volledig scherm, met terugknop) ---
const PlayerStatsPage: React.FC<{ player: Player; games: Game[]; onBack: () => void }> = ({ player, games, onBack }) => {
  const { t } = useTranslation();
  // Alles in de spelersfiche (cijfers én badges) geldt voor het lopende seizoen.
  const season = getSeasonId();
  const finishedGames = games.filter(g => g.status === 'finished' && g.seasonId === season);

  const stats = finishedGames.reduce((acc, game) => {
    game.quarters.forEach(q => {
      acc.goals += q.goalEvents.filter(e => e.scorerId === player.id).length;
      acc.assists += q.goalEvents.filter(e => e.assistId === player.id).length;
      acc.tackles += (q.tackleEvents || []).filter(e => e.playerId === player.id).length;
      acc.saves += (q.saveEvents || []).filter(e => e.playerId === player.id).length;
    });
    if (game.playersPresent.includes(player.id)) acc.matches += 1;
    return acc;
  }, { goals: 0, assists: 0, tackles: 0, saves: 0, matches: 0 });

  // De (hoogstens) 2 posities waarop de speler dit seizoen de meeste minuten speelde
  const topPositions = useMemo(() => {
    const minutes = new Map<FieldPosition, number>();
    finishedGames.forEach(game => game.quarters.forEach(q => {
      computeQuarterSegments(q).forEach(seg => {
        (Object.entries(seg.lineup) as [FieldPosition, number][]).forEach(([pos, id]) => {
          if (id === player.id) minutes.set(pos, (minutes.get(pos) || 0) + seg.end - seg.start + 1);
        });
      });
    }));
    const sorted = [...minutes.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.filter(([, m], i) => m > 0 && (i === 0 || (i === 1 && m >= SECOND_POSITION_MIN_MINUTES))).map(([pos]) => pos);
    // finishedGames is afgeleid van games + seizoen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, player.id, season]);

  // Badges van het lopende seizoen (gasten krijgen geen badges)
  const badges = useMemo(
    () => (player.isGuest
      ? null
      // De Redder-badge (reddingen) enkel tonen voor keepers
      : computeSeasonBadges(games, [player], season).players[player.id].filter(b => b.id !== 'saves' || player.isKeeper)),
    [games, player, season]
  );

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 space-y-4">
      {/* Terug naar de ploeg */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 -ms-1.5 pt-2 pe-2 py-1 text-navy font-semibold text-sm rounded-lg active:bg-navy/5 transition-colors"
      >
        <ChevronLeft size={20} className="rtl:rotate-180" /> {t('team.title')}
      </button>

      {/* Kop: navy kaart met de naam en de posities, in de stijl van een FIFA-kaart */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-light p-6 text-center shadow-lg">
        <div aria-hidden className="pointer-events-none absolute -top-16 -end-16 w-48 h-48 rounded-full bg-volt/10 blur-2xl" />
        {/* Clublogo subtiel in de achtergrond: als witte silhouet, groot en licht gekanteld */}
        <img
          src="/clublogo.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute -bottom-10 -end-8 w-48 h-48 opacity-[0.07] rotate-[-12deg] brightness-0 invert"
        />

        <div className="relative w-16 h-16 bg-white/10 rounded-full mx-auto mb-3 flex items-center justify-center ring-2 ring-white/20">
          <Star size={32} className="text-volt fill-volt" />
        </div>
        <h1 className="relative font-display text-4xl font-semibold text-white leading-none">{player.name}</h1>
        {topPositions.length > 0 && (
          <p className="relative mt-3 text-sm font-semibold text-white">
            {topPositions.map(pos => t(`positions.${pos}`)).join(' / ')}
          </p>
        )}
        <p className="relative mt-1 text-white/60 text-xs font-medium">{t('team.playerSubtitle')} · {t('dashboard.season', { season })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 flex flex-col items-center">
            <Gamepad2 size={16} className="text-navy/40 mb-1" />
            <div className="font-display text-4xl font-bold text-navy tabular-nums leading-none"><CountUp value={stats.matches} /></div>
            <div className="mt-1 text-xs font-medium text-gray-500">{t('team.matches')}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 flex flex-col items-center">
            <Target size={16} className="text-navy/40 mb-1" />
            <div className="font-display text-4xl font-bold text-navy tabular-nums leading-none"><CountUp value={stats.goals} /></div>
            <div className="mt-1 text-xs font-medium text-gray-500">{t('team.goals')}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 flex flex-col items-center">
            <Handshake size={16} className="text-navy/40 mb-1" />
            <div className="font-display text-4xl font-bold text-navy tabular-nums leading-none"><CountUp value={stats.assists} /></div>
            <div className="mt-1 text-xs font-medium text-gray-500">{t('team.assists')}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 flex flex-col items-center">
            <Axe size={16} className="text-navy/40 mb-1" />
            <div className="font-display text-4xl font-bold text-navy tabular-nums leading-none"><CountUp value={stats.tackles} /></div>
            <div className="mt-1 text-xs font-medium text-gray-500">{t('team.tackles')}</div>
          </div>
        {stats.saves > 0 && (
          <div className="col-span-2 bg-white p-3 rounded-2xl shadow-sm ring-1 ring-navy/5 flex items-center justify-center gap-4">
            <Shield size={16} className="text-navy/40" />
            <div className="text-sm font-semibold text-navy">{t('plurals.saves', { count: stats.saves })}</div>
          </div>
        )}
      </div>

      {badges && (
        <section>
          <h2 className="text-base font-semibold text-navy mb-3 px-1">{t('badges.title')}</h2>
          <BadgeGrid progress={badges} />
        </section>
      )}
    </div>
  );
};

// --- MAIN SETTINGS COMPONENT ---
export const Settings: React.FC<Props> = ({ players, games, isAdminMode }) => {
  const { t } = useTranslation();
  const season = getSeasonId();
  const teamBadges = useMemo(() => computeSeasonBadges(games, players, season).team, [games, players, season]);

  // Spelersfiche als subpagina: terug (knop of telefoon) brengt je naar de lijst op dezelfde plek.
  const { selected: selectedPlayerId, open: openPlayer, close: closePlayer } = useSubPage<number>();
  const [confirm, setConfirm] = useState<{ id: number, name: string } | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [newPlayerIsKeeper, setNewPlayerIsKeeper] = useState(false);
  const [newPlayerIsGuest, setNewPlayerIsGuest] = useState(false);

  const addPlayer = async () => {
    if (!playerName.trim()) return;
    const newId = Date.now();
    try {
      const newPlayer: Player = { id: newId, name: playerName.trim() };
      if (newPlayerIsKeeper) newPlayer.isKeeper = true;
      if (newPlayerIsGuest) newPlayer.isGuest = true;
      await setDoc(doc(db, "players", newId.toString()), newPlayer);
      setPlayerName('');
      setNewPlayerIsKeeper(false);
      setNewPlayerIsGuest(false);
    } catch (e) { console.error(e); }
  };

  const toggleKeeper = async (playerId: number, current: boolean | undefined) => {
    try {
      await updateDoc(doc(db, "players", playerId.toString()), { isKeeper: !current });
    } catch (e) { console.error(e); }
  };

  const toggleGuest = async (playerId: number, current: boolean | undefined) => {
    try {
      await updateDoc(doc(db, "players", playerId.toString()), { isGuest: !current });
    } catch (e) { console.error(e); }
  };

  const removePlayer = async (playerId: number) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "players", playerId.toString()));
      const q = query(collection(db, "parents"), where("playerId", "==", playerId));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  const selectedPlayer = selectedPlayerId != null ? players.find(p => p.id === selectedPlayerId) : undefined;
  if (selectedPlayer) {
    return <PlayerStatsPage player={selectedPlayer} games={games} onBack={closePlayer} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 space-y-6 select-none">
      <header className="flex items-center gap-2.5 px-1 pt-2">
        <span aria-hidden className="w-1.5 h-8 rounded-sm bg-volt" />
        <h2 className="font-display text-4xl font-semibold text-navy leading-none">{t('team.title')}</h2>
      </header>

      {/* Ploegbadges van het lopende seizoen */}
      <section className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h3 className="text-base font-semibold text-navy">{t('badges.teamTitle')}</h3>
        </div>
        <BadgeGrid progress={teamBadges} />
      </section>

      {/* Input Speler (alleen zichtbaar in Admin mode) */}
      {isAdminMode && (
        <section dir="ltr" lang="nl" className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5">
          <h3 className="text-base font-semibold text-navy mb-3">Nieuwe speler</h3>
          <div className="flex gap-2">
            <input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
              placeholder="Naam van de speler..."
              className="flex-1 p-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-navy/10 transition-all"
            />
            <button
              onClick={() => setNewPlayerIsKeeper(!newPlayerIsKeeper)}
              title="Keeper"
              className={`px-3 rounded-xl transition-all flex items-center justify-center ${newPlayerIsKeeper ? 'bg-navy text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
            >
              <Hand size={18} />
            </button>
            <button
              onClick={() => setNewPlayerIsGuest(!newPlayerIsGuest)}
              title="Gastspeler (telt niet mee in Inzichten)"
              className={`px-3 rounded-xl text-xs font-semibold transition-all ${newPlayerIsGuest ? 'bg-gray-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
            >
              Gast
            </button>
            <button onClick={addPlayer} className="bg-navy text-white px-4 rounded-xl shadow-sm active:scale-95 transition-all">
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
        </section>
      )}

      {/* Lijst van spelers */}
      <section className="space-y-3">
        {/* Vaste spelers eerst, gastspelers achteraan */}
        {[...players].sort((a, b) => Number(!!a.isGuest) - Number(!!b.isGuest) || a.name.localeCompare(b.name)).map(player => (
          <div
            key={player.id}
            onClick={() => openPlayer(player.id)}
            className="bg-white rounded-2xl shadow-sm ring-1 ring-navy/5 overflow-hidden cursor-pointer group hover:ring-navy/15 transition-shadow"
          >
            <div className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-navy/5 rounded-full flex items-center justify-center text-navy group-hover:bg-volt transition-colors">
                  <User size={20} />
                </div>
                <span className="font-semibold text-navy">{player.name}</span>
                {player.isGuest && !isAdminMode && (
                  <span className="text-xs font-semibold text-blue-500">{t('team.guest')}</span>
                )}
                {player.isKeeper && !isAdminMode && (
                  <Hand size={14} className="text-navy/40" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {isAdminMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleKeeper(player.id, player.isKeeper); }}
                    title="Keeper"
                    className={`p-2 rounded-lg transition-colors ${player.isKeeper ? 'bg-navy text-white' : 'text-gray-400 hover:text-navy'}`}
                  >
                    <Hand size={18} />
                  </button>
                )}
                {isAdminMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleGuest(player.id, player.isGuest); }}
                    title="Gastspeler (telt niet mee in Inzichten)"
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${player.isGuest ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}
                  >
                    Gast
                  </button>
                )}
                {isAdminMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirm({ id: player.id, name: player.name }); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                {/* Pijltje: tikken opent de spelersfiche */}
                <ChevronRight size={20} className="text-gray-400 rtl:rotate-180" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Modals */}

      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={() => setConfirm(null)}>
          <div dir="ltr" lang="nl" className="bg-white p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center" onMouseDown={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-semibold text-navy mb-2">{confirm.name} verwijderen?</h3>
            <p className="text-xs text-gray-500 mb-6">Deze actie kan niet ongedaan worden gemaakt.</p>
            <div className="flex gap-3">
              <button className="flex-1 py-3 font-semibold text-gray-500" onClick={() => setConfirm(null)}>Nee</button>
              <button className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold shadow-sm" onClick={() => {
                removePlayer(confirm.id);
                setConfirm(null);
              }}>Ja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
