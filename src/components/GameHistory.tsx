import React, { useState } from 'react';
import { Users, UserCheck, Check, X, Trash2, ChevronDown, ChevronUp, Shield, Goal, Plus, Gamepad2, Edit3 } from 'lucide-react';
import type { Game, Player } from '../types';

interface Props {
  games: Game[];
  players: Player[];
  onDeleteGame: (id: number) => void;
  onEditGame: (game: Game) => void; // Nieuwe prop om bewerken te starten
  startNewGame: () => void;
  canStart: boolean;
}

export const GameHistory: React.FC<Props> = ({ games, players, onDeleteGame, onEditGame, startNewGame, canStart }) => {
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; opponent: string; date: string } | null>(null);

  const getPlayerName = (id: number | null) => {
    if (!id) return 'Geen';
    return players.find(p => p.id === id)?.name || 'Onbekend';
  };

  const toggleExpand = (id: number) => {
    setExpandedGameId(expandedGameId === id ? null : id);
  };

  const openConfirm = (e: React.MouseEvent, g: Game) => {
    e.stopPropagation();
    setConfirmDelete({
      id: g.id,
      opponent: g.opponent || 'Onbekende tegenstander',
      date: new Date(g.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* Header Sectie */}
      <div className="flex justify-between items-center mb-8 px-1">
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-[#04174C]" size={24} />
          <h1 className="text-2xl font-bold text-[#04174C]">Wedstrijden</h1>
        </div>
        <button
          onClick={startNewGame}
          disabled={!canStart}
          className="bg-[#04174C] text-white py-2.5 px-4 rounded-xl shadow-lg hover:bg-[#052A6B] disabled:bg-gray-200 flex items-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Plus size={18} strokeWidth={3} />
          <span className="font-bold text-xs uppercase tracking-wider">Nieuwe wedstrijd</span>
        </button>
      </div>
      
      <div className="space-y-4">
        {games.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-gray-200">
            <p className="text-gray-400 italic font-medium">Nog geen wedstrijden opgeslagen.</p>
          </div>
        ) : (
          [...games]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((g) => {
              const ourGoals = g.quarters.reduce((s, q) => s + q.goals.length, 0);
              const opponentGoals = g.quarters.reduce((s, q) => s + q.opponentGoals, 0);
              const isWin = ourGoals > opponentGoals;
              const isDraw = ourGoals === opponentGoals;
              const isLoss = ourGoals < opponentGoals;
              const isExpanded = expandedGameId === g.id;

              return (
                <div 
                  key={g.id} 
                  className={`bg-white rounded-2xl shadow-sm border transition-all cursor-pointer overflow-hidden ${
                    isExpanded ? 'border-[#04174C]/20 shadow-md' : 'border-gray-100'
                  }`}
                  onClick={() => toggleExpand(g.id)}
                >
                  {/* Card Header */}
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm shrink-0
                        ${isWin ? 'bg-green-500' : isLoss ? 'bg-red-500' : 'bg-gray-400'}`}
                      >
                        {isWin && <Check size={14} strokeWidth={4} />}
                        {isDraw && <div className="w-3.5 h-0.5 bg-white rounded-full" />}
                        {isLoss && <X size={14} strokeWidth={4} />}
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[#04174C]/40 uppercase tracking-wider">
                          {new Date(g.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="font-bold text-[#04174C] text-sm sm:text-base leading-tight">
                          {g.isAway ? `${g.opponent || 'Tegenstander'} - Kaulille` : `Kaulille - ${g.opponent || 'Tegenstander'}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-black text-[#04174C] tabular-nums">
                        {g.isAway ? `${opponentGoals}-${ourGoals}` : `${ourGoals}-${opponentGoals}`}
                      </div>
                      <div className="text-gray-300">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Uitgeklapte Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 bg-gray-50/30 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="mb-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Wedstrijdverloop</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {g.quarters.map((q, i) => (
                            <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-50">
                                <span className="text-[10px] font-black text-[#04174C] uppercase">Kwart {q.number}</span>
                                <span className="text-xs font-black text-[#04174C] bg-[#04174C]/5 px-2 py-0.5 rounded">
                                  {g.isAway ? `${q.opponentGoals}-${q.goals.length}` : `${q.goals.length}-${q.opponentGoals}`}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-[11px]">
                                  <Shield size={12} className="text-blue-500" />
                                  <span className="font-medium text-gray-700">Keeper: {getPlayerName(q.goalkeeper)}</span>
                                </div>
                                <div className="flex items-start gap-2 text-[11px] text-gray-600">
                                  <Goal size={12} className="text-green-500 mt-0.5" />
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-700">Goals: </span>
                                    <span className="font-bold text-gray-700">{q.goals.length > 0 ? q.goals.map(id => getPlayerName(id)).join(', ') : 'Geen'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white p-2 rounded-lg border border-gray-100">
                          <Users size={14} className="text-blue-500" /> {g.playersPresent?.length || 0} spelers
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white p-2 rounded-lg border border-gray-100">
                          <UserCheck size={14} className="text-purple-500" /> {g.parentsPresent?.length || 0} ouders
                        </div>
                      </div>

                      {/* Notities */}
                      {g.notes && (
                        <div className="bg-yellow-50/70 border border-yellow-100 p-3 rounded-xl mb-4 text-sm italic text-gray-700">
                          "{g.notes}"
                        </div>
                      )}

                      {/* Actie Knoppen */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditGame(g); }}
                          className="flex items-center gap-1.5 text-[#04174C] hover:text-blue-700 font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          <Edit3 size={14} /> Bewerk wedstrijd
                        </button>
                        <button 
                          onClick={(e) => openConfirm(e, g)}
                          className="flex items-center gap-1.5 text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          <Trash2 size={14} /> Verwijder wedstrijd
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>

      {/* CUSTOM CONFIRMATION POP-UP */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4" onMouseDown={() => setConfirmDelete(null)}>
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-xs w-full select-none" onMouseDown={e => e.stopPropagation()}>
            <div className="mb-6 text-lg font-bold text-[#04174C]">
              Wedstrijd tegen <span>{confirmDelete.opponent}</span> verwijderen?
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg font-semibold text-gray-500 hover:bg-gray-100 transition" onClick={() => setConfirmDelete(null)}>Nee</button>
              <button className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={() => { onDeleteGame(confirmDelete.id); setConfirmDelete(null); }}>Ja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};