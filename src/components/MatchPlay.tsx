import React from 'react';
import { UserMinus, Shield, ChevronDown, Target, Handshake, Axe } from 'lucide-react';
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
  
  const toggleSubstitute = (playerId: number) => {
    const currentSubs = (quarter as any).substitutes || [];
    const newSubs = currentSubs.includes(playerId)
      ? currentSubs.filter((id: number) => id !== playerId)
      : [...currentSubs, playerId];
    onUpdateQuarter({ substitutes: newSubs } as any);
  };

  // Alfabetisch gesorteerde lijst van aanwezige spelers
  const sortedPresentPlayers = [...presentPlayers].sort((a, b) => a.name.localeCompare(b.name));

  const onFieldPlayers = sortedPresentPlayers.filter(p => !((quarter as any).substitutes || []).includes(p.id));
  const isLineupComplete = onFieldPlayers.length === 5;

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
          {sortedPresentPlayers.filter(p => ((quarter as any).substitutes || []).includes(p.id) || onFieldPlayers.length > 5).map(p => (
            <button key={p.id} onClick={() => toggleSubstitute(p.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${((quarter as any).substitutes || []).includes(p.id) ? 'bg-[#04174C] text-white shadow-sm' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
              {p.name}
            </button>
          ))}
        
        </div>
      </div>

      {/* DOELMAN & ACTIES */}
      <div className="bg-blue-50/50 p-3 rounded-lg border border-[#04174C]/10 flex items-center gap-2">
        <div className="relative flex-1">
          <select value={quarter.goalkeeper || ''} onChange={(e) => onUpdateQuarter({ goalkeeper: Number(e.target.value) })} className="w-full pl-3 pr-8 py-3 bg-white border border-[#04174C]/20 rounded-lg font-bold text-[#04174C] appearance-none outline-none text-sm">
            <option value="">Keeper...</option>
            {onFieldPlayers.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[#04174C] pointer-events-none" size={16} />
        </div>
        <button style={{ touchAction: 'manipulation' }} onClick={() => handleButtonClick(() => onUpdateQuarter({ saves: quarter.saves + 1 }))} onTouchStart={() => handlePressStart(() => decrementStat(activeQuarterIdx, 'saves'))} onTouchEnd={handlePressEnd} className="flex-[0.8] py-3 bg-[#04174C] text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm"><Shield size={16} />{quarter.saves} Reddingen</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {onFieldPlayers.map(p => {
          const gc = getStatCount(p.id, quarter.goals);
          const ac = getStatCount(p.id, (quarter as any).assists);
          const tc = getStatCount(p.id, (quarter as any).tackles);
          return (
            <div key={p.id} className="p-2 pl-3 flex items-center gap-3">
              <span className="font-bold text-[#04174C] text-xs flex-1 truncate">{p.name}</span>
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