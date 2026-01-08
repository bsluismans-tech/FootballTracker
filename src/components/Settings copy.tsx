import React, { useState } from 'react';
import { Plus, Trash2, User, Users, UserCheck, X } from 'lucide-react';
import type { Player, Parent } from '../types';

interface Props {
  players: Player[];
  parents: Parent[];
  setPlayers: (p: Player[]) => void;
  setParents: (p: Parent[]) => void;
}

export const Settings: React.FC<Props> = ({ players, parents, setPlayers, setParents }) => {
  const [confirm, setConfirm] = useState<{
    type: 'player' | 'parent',
    id: number,
    name: string
  } | null>(null);

  const [playerName, setPlayerName] = useState('');
  const [parentInputs, setParentInputs] = useState<Record<number, string>>({});

  const addPlayer = () => {
    if (!playerName.trim()) return;
    setPlayers([...players, { id: Date.now(), name: playerName.trim() }]);
    setPlayerName('');
  };

  const removePlayer = (playerId: number) => {
    setPlayers(players.filter(p => p.id !== playerId));
    setParents(parents.filter(p => p.playerId !== playerId));
  };

  const addParent = (playerId: number) => {
    const name = (parentInputs[playerId] || '').trim();
    if (!name) return;
    setParents([...parents, { id: Date.now(), name, playerId }]);
    setParentInputs({ ...parentInputs, [playerId]: '' });
  };

  const removeParent = (parentId: number) => {
    setParents(parents.filter(p => p.id !== parentId));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <header className="flex items-center gap-2">
        <Users className="text-[#04174C]" size={24} />
        <h2 className="text-2xl font-bold text-[#04174C]">Ploeg</h2>
      </header>

      <section className="bg-gradient-to-br from-[#052A6B] to-[#AAAAAA] p-4 rounded-xl shadow-sm border border-[#04174C]/20">
        <h3 className="text-lg font-semibold text-white mb-3">Spelers toevoegen</h3>
        <div className="flex gap-2">
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Naam speler"
            className="flex-1 p-3 border rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-white/50 outline-none"
          />
          <button
            onClick={addPlayer}
            className="bg-white text-[#04174C] px-4 rounded-lg shadow hover:bg-gray-100 transition font-semibold"
          >
            <Plus size={18} />
          </button>
        </div>
      </section>







      <section className="space-y-3">
        {players.length === 0 && (
          <div className="text-gray-500 text-sm">Nog geen spelers. Voeg eerst een speler toe.</div>
        )}

        {players.map(player => {
          const playerParents = parents.filter(p => p.playerId === player.id);
          return (
            <div key={player.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  <User size={18} className="text-[#04174C]" />
                  {player.name}
                </div>
                <button
                  onClick={() => setConfirm({ type: 'player', id: player.id, name: player.name })}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-2">
                {playerParents.length === 0 && (
                  <div className="text-gray-500 text-sm">Nog geen ouders toegevoegd.</div>
                )}

                {playerParents.map(parent => (
                  <div key={parent.id} className="flex items-center gap-2 text-sm text-gray-600 rounded-lg px-3 py-2">
                    <UserCheck size={16} className="text-[#04174C]" />
                    <span>{parent.name}</span>
                    <button
                      onClick={() => setConfirm({ type: 'parent', id: parent.id, name: parent.name })}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <input
                    value={parentInputs[player.id] || ''}
                    onChange={e => setParentInputs({ ...parentInputs, [player.id]: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && addParent(player.id)}
                    placeholder={`Ouder voor ${player.name}`}
                    className="flex-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-[#04174C]/30 outline-none"
                  />
                  <button
                    onClick={() => addParent(player.id)}
                    className="border border-[#04174C] text-[#04174C] bg-transparent px-3 rounded-lg shadow hover:bg-[#04174C]/10 transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    {confirm && (
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onMouseDown={e => {
        if (e.target === e.currentTarget) setConfirm(null);
      }}>
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-xs w-full select-none" onMouseDown={e => e.stopPropagation()}>
          <div className="mb-6 text-lg font-bold text-[#04174C]">
            Verwijder {confirm.type === 'player' ? 'speler' : 'ouder'} {confirm.name}?
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg font-semibold text-gray-500 hover:bg-gray-100 transition"
              onClick={() => setConfirm(null)}
            >Nee</button>
            <button
              className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition"
              onClick={() => {
                if (confirm.type === 'player') removePlayer(confirm.id);
                if (confirm.type === 'parent') removeParent(confirm.id);
                setConfirm(null);
              }}
            >Ja</button>
          </div>
        </div>
      </div>
    )}
  </div>
); 
}
