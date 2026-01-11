import React, { useState } from 'react';
import { Plus, Trash2, User, Users, UserCheck, X, Gamepad2, Star, Target, Handshake, Axe, Shield } from 'lucide-react';
import type { Player, Parent, Game } from '../types';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';

interface Props {
  players: Player[];
  parents: Parent[];
  games: Game[];
}

// --- SUBCOMPONENT: PLAYER STATS MODAL ---
const PlayerStatsModal: React.FC<{ player: Player; games: Game[]; onClose: () => void }> = ({ player, games, onClose }) => {
  const finishedGames = games.filter(g => g.status === 'finished');
  
  const stats = finishedGames.reduce((acc, game) => {
    game.quarters.forEach(q => {
      acc.goals += (q.goals || []).filter(id => id === player.id).length;
      acc.assists += ((q as any).assists || []).filter((id: number) => id === player.id).length;
      acc.tackles += ((q as any).tackles || []).filter((id: number) => id === player.id).length;
      if (q.goalkeeper === player.id) acc.saves += (q.saves || 0);
    });
    if (game.playersPresent.includes(player.id)) acc.matches += 1;
    return acc;
  }, { goals: 0, assists: 0, tackles: 0, saves: 0, matches: 0 });

  return (
    <div 
      // Klik op de achtergrond sluit de modal
      onClick={onClose} 
      className="fixed inset-0 bg-[#04174C]/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 cursor-pointer"
    >
      <div 
        // StopPropagation voorkomt dat klikken OP de kaart de modal sluit
        onClick={(e) => e.stopPropagation()} 
        className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative border-4 border-white cursor-default"
      >
        <div className="bg-gradient-to-br from-[#04174C] to-[#052A6B] p-8 text-center relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
          <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-white/20">
            <Star size={40} className="text-yellow-400 fill-yellow-400" />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tight">{player.name}</h3>
          <p className="text-blue-300 text-[10px] font-bold uppercase tracking-[0.2em]">Ploeglid U9 Kaulille</p>
        </div>

        <div className="p-6 grid grid-cols-2 gap-3 bg-gray-50">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Gamepad2 size={16} className="text-blue-500 mb-1" />
            <div className="text-xl font-black text-[#04174C]">{stats.matches}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase">Matchen</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Target size={16} className="text-green-500 mb-1" />
            <div className="text-xl font-black text-[#04174C]">{stats.goals}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase">Goals</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Handshake size={16} className="text-yellow-500 mb-1" />
            <div className="text-xl font-black text-[#04174C]">{stats.assists}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase">Assists</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Axe size={16} className="text-red-500 mb-1" />
            <div className="text-xl font-black text-[#04174C]">{stats.tackles}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase">Tackles</div>
          </div>
          {stats.saves > 0 && (
            <div className="col-span-2 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-4">
              <Shield size={16} className="text-purple-500" />
              <div className="text-sm font-black text-[#04174C]">{stats.saves} Reddingen</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN SETTINGS COMPONENT ---
export const Settings: React.FC<Props> = ({ players, parents, games }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'player' | 'parent', id: number, name: string } | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [parentInputs, setParentInputs] = useState<Record<number, string>>({});

  const addPlayer = async () => {
    if (!playerName.trim()) return;
    const newId = Date.now();
    try {
      await setDoc(doc(db, "players", newId.toString()), { id: newId, name: playerName.trim() });
      setPlayerName('');
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

  const addParent = async (playerId: number) => {
    const name = (parentInputs[playerId] || '').trim();
    if (!name) return;
    const newId = Date.now();
    try {
      await setDoc(doc(db, "parents", newId.toString()), { id: newId, name, playerId });
      setParentInputs({ ...parentInputs, [playerId]: '' });
    } catch (e) { console.error(e); }
  };

  const removeParent = async (parentId: number) => {
    try { await deleteDoc(doc(db, "parents", parentId.toString())); } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 space-y-6 select-none">
      <header className="flex items-center gap-2 px-1">
        <Users className="text-[#04174C]" size={24} />
        <h2 className="text-2xl font-black text-[#04174C] tracking-tight">Ploeg</h2>
      </header>

      {/* Input Speler */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Nieuwe speler</h3>
        <div className="flex gap-2">
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Naam van de speler..."
            className="flex-1 p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#04174C]/10 transition-all"
          />
          <button onClick={addPlayer} className="bg-[#04174C] text-white px-4 rounded-xl shadow-lg active:scale-95 transition-all">
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      </section>

      {/* Lijst van spelers */}
      <section className="space-y-4">
        {players.sort((a,b) => a.name.localeCompare(b.name)).map(player => {
          const playerParents = parents.filter(p => p.playerId === player.id);
          return (
            <div key={player.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex justify-between items-center bg-gray-50/50">
                <div 
                  onClick={() => setSelectedPlayer(player)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-white border-2 border-blue-100 rounded-full flex items-center justify-center text-[#04174C] shadow-sm group-hover:border-blue-400 transition-colors">
                    <User size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[#04174C]">{player.name}</span>
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Bekijk stats</span>
                  </div>
                </div>
                <button
                  onClick={() => setConfirm({ type: 'player', id: player.id, name: player.name })}
                  className="text-gray-300 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  {playerParents.map(parent => (
                    <div key={parent.id} className="flex items-center justify-between bg-white border border-gray-100 px-3 py-2 rounded-xl text-xs font-bold text-gray-600">
                      <div className="flex items-center gap-2">
                        <UserCheck size={14} className="text-green-500" />
                        {parent.name}
                      </div>
                      <button onClick={() => setConfirm({ type: 'parent', id: parent.id, name: parent.name })} className="text-gray-300 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={parentInputs[player.id] || ''}
                    onChange={e => setParentInputs({ ...parentInputs, [player.id]: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && addParent(player.id)}
                    placeholder="Ouder toevoegen..."
                    className="flex-1 p-2 bg-gray-50 border-none rounded-lg text-xs font-bold outline-none"
                  />
                  <button onClick={() => addParent(player.id)} className="text-[#04174C] p-2">
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Modals */}
      {selectedPlayer && <PlayerStatsModal player={selectedPlayer} games={games} onClose={() => setSelectedPlayer(null)} />}
      
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={() => setConfirm(null)}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center" onMouseDown={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-black text-[#04174C] mb-2">{confirm.name} verwijderen?</h3>
            <p className="text-xs text-gray-500 mb-6">Deze actie kan niet ongedaan worden gemaakt.</p>
            <div className="flex gap-3">
              <button className="flex-1 py-3 font-bold text-gray-400" onClick={() => setConfirm(null)}>Nee</button>
              <button className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-100" onClick={() => {
                if (confirm.type === 'player') removePlayer(confirm.id);
                if (confirm.type === 'parent') removeParent(confirm.id);
                setConfirm(null);
              }}>Ja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};