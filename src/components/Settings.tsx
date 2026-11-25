import React, { useState } from 'react';
import { Plus, Trash2, User, X, Gamepad2, Star, Target, Handshake, Axe, Shield, Hand } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Player, Game } from '../types';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';

interface Props {
  players: Player[];
  games: Game[];
  isAdminMode: boolean;
}

// --- SUBCOMPONENT: PLAYER STATS MODAL ---
const PlayerStatsModal: React.FC<{ player: Player; games: Game[]; onClose: () => void }> = ({ player, games, onClose }) => {
  const { t } = useTranslation();
  const finishedGames = games.filter(g => g.status === 'finished');

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

  return (
    <div
      // Klik op de achtergrond sluit de modal
      onClick={onClose}
      className="fixed inset-0 bg-navy/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 cursor-pointer"
    >
      <div
        // StopPropagation voorkomt dat klikken OP de kaart de modal sluit
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white cursor-default"
      >
        <div className="bg-gradient-to-br from-navy to-navy-light p-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 end-4 text-white/50 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
          <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-white/20">
            <Star size={40} className="text-volt fill-volt" />
          </div>
          <h3 className="font-display text-3xl font-bold text-white leading-none">{player.name}</h3>
          <p className="mt-1.5 text-white/60 text-xs font-medium">{t('team.playerSubtitle')}</p>
        </div>

        <div className="p-6 grid grid-cols-2 gap-3 bg-gray-50">
          <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 flex flex-col items-center">
            <Gamepad2 size={16} className="text-navy/40 mb-1" />
            <div className="font-display text-4xl font-bold text-navy tabular-nums leading-none">{stats.matches}</div>
            <div className="mt-1 text-xs font-medium text-gray-500">{t('team.matches')}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 flex flex-col items-center">
            <Target size={16} className="text-navy/40 mb-1" />
            <div className="font-display text-4xl font-bold text-navy tabular-nums leading-none">{stats.goals}</div>
            <div className="mt-1 text-xs font-medium text-gray-500">{t('team.goals')}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 flex flex-col items-center">
            <Handshake size={16} className="text-navy/40 mb-1" />
            <div className="font-display text-4xl font-bold text-navy tabular-nums leading-none">{stats.assists}</div>
            <div className="mt-1 text-xs font-medium text-gray-500">{t('team.assists')}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5 flex flex-col items-center">
            <Axe size={16} className="text-navy/40 mb-1" />
            <div className="font-display text-4xl font-bold text-navy tabular-nums leading-none">{stats.tackles}</div>
            <div className="mt-1 text-xs font-medium text-gray-500">{t('team.tackles')}</div>
          </div>
          {stats.saves > 0 && (
            <div className="col-span-2 bg-white p-3 rounded-2xl shadow-sm ring-1 ring-navy/5 flex items-center justify-center gap-4">
              <Shield size={16} className="text-navy/40" />
              <div className="text-sm font-semibold text-navy">{t('plurals.saves', { count: stats.saves })}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN SETTINGS COMPONENT ---
export const Settings: React.FC<Props> = ({ players, games, isAdminMode }) => {
  const { t } = useTranslation();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
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

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 space-y-6 select-none">
      <header className="flex items-center gap-2.5 px-1 pt-2">
        <span aria-hidden className="w-1.5 h-8 rounded-sm bg-volt" />
        <h2 className="font-display text-4xl font-bold text-navy uppercase leading-none tracking-tight">{t('team.title')}</h2>
      </header>

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
            onClick={() => setSelectedPlayer(player)}
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
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Modals */}
      {selectedPlayer && <PlayerStatsModal player={selectedPlayer} games={games} onClose={() => setSelectedPlayer(null)} />}

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
