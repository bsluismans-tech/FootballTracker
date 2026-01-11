import React, { useState } from 'react';
import { UserMinus, Shield, ChevronDown, Target, Handshake, Axe, RefreshCw, ArrowUpCircle, ArrowDownCircle, Check, X as CloseIcon } from 'lucide-react';
import type { Player, Quarter } from '../types';

interface Props {
  quarter: Quarter;
  activeQuarterIdx: number;
  presentPlayers: Player[];
  onUpdateQuarter: (updates: Partial<Quarter>) => void;
  handleButtonClick: (action: () => void) => void;
  handlePressStart: (action: () => void) => void;
  handlePressEnd: () => void;
  getStatCount: (playerId: number, statArray: number[] | undefined) => number;
  decrementStat: (idx: number, field: string, playerId?: number) => void;
}

export const MatchPlay: React.FC<Props> = ({ 
  quarter, activeQuarterIdx, presentPlayers, onUpdateQuarter, 
  handleButtonClick, handlePressStart, handlePressEnd, getStatCount, decrementStat 
}) => {
  const [wisselTarget, setWisselTarget] = useState<number | null>(null);

  const substitutes = (quarter as any).substitutes || [];
  const substitutions = (quarter as any).substitutions || []; 

  const toggleSubstitute = (playerId: number) => {
    const newSubs = substitutes.includes(playerId)
      ? substitutes.filter((id: number) => id !== playerId)
      : [...substitutes, playerId];
    onUpdateQuarter({ substitutes: newSubs } as any);
  };

  const sortedPresentPlayers = [...presentPlayers].sort((a, b) => a.name.localeCompare(b.name));
  
  const allFieldView = sortedPresentPlayers.filter(p => {
    const isSub = substitutes.includes(p.id);
    const wasSwappedOut = substitutions.some((s: any) => s.outId === p.id);
    return !isSub || wasSwappedOut;
  });

  const activeOnField = sortedPresentPlayers.filter(p => !substitutes.includes(p.id));

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* WISSELSPELERS SECTIE */}
      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserMinus size={14} /> Wisselspelers
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sortedPresentPlayers.filter(p => substitutes.includes(p.id) || activeOnField.length > 5).map(p => (
            <button key={p.id} onClick={() => toggleSubstitute(p.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${substitutes.includes(p.id) ? 'bg-[#04174C] text-white shadow-sm' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* MODAL / OVERLAY VOOR WISSEL SELECTIE */}
      {wisselTarget !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={() => setWisselTarget(null)}>
          <div 
            className="bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 space-y-5 border border-gray-100"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h4 className="font-black text-[#04174C] text-sm uppercase tracking-wider">Speler wisselen</h4>
              </div>
              <button onClick={() => setWisselTarget(null)} className="p-2 bg-gray-50 rounded-full text-gray-400">
                <CloseIcon size={20}/>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Wie komt erin?</p>
              <div className="grid grid-cols-2 gap-2">
                {sortedPresentPlayers
                  .filter(p => substitutes.includes(p.id))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const newSubs = substitutes.filter((id: number) => id !== p.id);
                        newSubs.push(wisselTarget);
                        const newSubstitutions = [...substitutions, { outId: wisselTarget, inId: p.id }];
                        
                        onUpdateQuarter({ 
                          substitutes: newSubs,
                          substitutions: newSubstitutions 
                        } as any);

                        setWisselTarget(null);
                      }}
                      className="py-3 px-2 bg-green-50 border border-green-100 rounded-xl text-xs font-black text-green-700 hover:bg-green-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowUpCircle size={14} />
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>

            <button 
              onClick={() => setWisselTarget(null)}
              className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* DOELMAN & ACTIES */}
      <div className="bg-blue-50/50 p-3 rounded-lg border border-[#04174C]/10 flex items-center gap-2">
        <div className="relative flex-1">
          <select value={quarter.goalkeeper || ''} onChange={(e) => onUpdateQuarter({ goalkeeper: Number(e.target.value) })} className="w-full pl-3 pr-8 py-3 bg-white border border-[#04174C]/20 rounded-lg font-bold text-[#04174C] appearance-none outline-none text-sm">
            <option value="">Keeper...</option>
            {activeOnField.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[#04174C] pointer-events-none" size={16} />
        </div>
        <button onClick={() => handleButtonClick(() => onUpdateQuarter({ saves: quarter.saves + 1 }))} onTouchStart={() => handlePressStart(() => decrementStat(activeQuarterIdx, 'saves'))} onTouchEnd={handlePressEnd} className="flex-[0.8] py-3 bg-[#04174C] text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm"><Shield size={16} />{quarter.saves} Reddingen</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {allFieldView.map(p => {
          const gc = getStatCount(p.id, quarter.goals);
          const ac = getStatCount(p.id, (quarter as any).assists);
          const tc = getStatCount(p.id, (quarter as any).tackles);
          const wasSwappedOut = substitutions.some((s: any) => s.outId === p.id);
          const wasSwappedIn = substitutions.some((s: any) => s.inId === p.id);

          return (
            <div key={p.id} className={`p-2 pl-3 flex items-center gap-3 ${wasSwappedOut ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[#04174C] text-xs truncate">{p.name}</span>
                  {wasSwappedOut && <ArrowDownCircle size={12} className="text-red-500 shrink-0" />}
                  {wasSwappedIn && <ArrowUpCircle size={12} className="text-green-500 shrink-0" />}
                </div>
                {!wasSwappedOut && (
                  <button onClick={() => setWisselTarget(p.id)} className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">
                    <RefreshCw size={8}/> Wissel
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 flex-[3.5]">
                <button onClick={() => handleButtonClick(() => onUpdateQuarter({ goals: [...quarter.goals, p.id] }))} onTouchStart={() => handlePressStart(() => decrementStat(activeQuarterIdx, 'goals', p.id))} onTouchEnd={handlePressEnd} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 ${gc > 0 ? 'bg-green-600 text-white shadow-sm' : 'bg-green-50 text-green-700 border border-green-100'}`}><Target size={14}/><span className="text-[9px] font-black uppercase">{gc} Goals</span></button>
                <button onClick={() => handleButtonClick(() => onUpdateQuarter({ assists: [...((quarter as any).assists || []), p.id] }))} onTouchStart={() => handlePressStart(() => decrementStat(activeQuarterIdx, 'assists', p.id))} onTouchEnd={handlePressEnd} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 ${ac > 0 ? 'bg-yellow-500 text-white shadow-sm' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}><Handshake size={14}/><span className="text-[9px] font-black uppercase">{ac} Assists</span></button>
                <button onClick={() => handleButtonClick(() => onUpdateQuarter({ tackles: [...((quarter as any).tackles || []), p.id] }))} onTouchStart={() => handlePressStart(() => decrementStat(activeQuarterIdx, 'tackles', p.id))} onTouchEnd={handlePressEnd} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 ${tc > 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}><Axe size={14}/><span className="text-[9px] font-black uppercase">{tc} Tackles</span></button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-red-50/50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
        <p className="flex-1 text-xs font-bold text-red-700 uppercase tracking-wider ml-1">Tegendoelpunten</p>
        <button onClick={() => handleButtonClick(() => onUpdateQuarter({ opponentGoals: quarter.opponentGoals + 1 }))} onTouchStart={() => handlePressStart(() => decrementStat(activeQuarterIdx, 'opponentGoals'))} onTouchEnd={handlePressEnd} className={`flex-[0.8] py-3 rounded-lg font-bold flex items-center justify-center gap-2 text-sm ${quarter.opponentGoals > 0 ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-600 border border-red-200'}`}><Target size={18} />{quarter.opponentGoals} Goals</button>
      </div>
    </div>
  );
};