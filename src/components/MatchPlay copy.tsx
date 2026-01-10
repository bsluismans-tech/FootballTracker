import React, { useState } from 'react';
import { UserMinus, Shield, ChevronDown, Target, Handshake, Axe, ArrowDownCircle, ArrowUpCircle, RefreshCw, Check, X as CloseIcon } from 'lucide-react';
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
  const [isWisselMode, setIsWisselMode] = useState(false);
  const [wisselOut, setWisselOut] = useState<number | "">("");
  const [wisselIn, setWisselIn] = useState<number | "">("");

  // Hulpmiddelen voor substitutes
  const substitutes = (quarter as any).substitutes || [];
  const substitutions = (quarter as any).substitutions || []; // Array van { outId, inId }

  const handleExecuteWissel = () => {
    if (wisselOut !== "" && wisselIn !== "") {
      const newSubs = substitutes.filter((id: number) => id !== wisselIn);
      newSubs.push(wisselOut);
      
      const newSubstitutions = [...substitutions, { outId: wisselOut, inId: wisselIn }];
      
      onUpdateQuarter({ 
        substitutes: newSubs,
        substitutions: newSubstitutions 
      } as any);

      // Reset
      setWisselOut("");
      setWisselIn("");
      setIsWisselMode(false);
    }
  };

  const sortedPresentPlayers = [...presentPlayers].sort((a, b) => a.name.localeCompare(b.name));
  const onFieldPlayers = sortedPresentPlayers.filter(p => !substitutes.includes(p.id));

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* WISSELSPELERS SECTIE */}
      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserMinus size={14} /> Wisselspelers
          </h3>
          <button 
            onClick={() => setIsWisselMode(!isWisselMode)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black transition-all ${isWisselMode ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}
          >
            {isWisselMode ? <CloseIcon size={12}/> : <RefreshCw size={12}/>}
            {isWisselMode ? 'ANNULEREN' : 'WISSEL'}
          </button>
        </div>

        {isWisselMode ? (
          <div className="space-y-3 py-2 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-red-500 uppercase ml-1">Veldspeler eruit</label>
                <select 
                  value={wisselOut} 
                  onChange={(e) => setWisselOut(Number(e.target.value))}
                  className="w-full p-2 bg-red-50 border border-red-100 rounded-lg text-xs font-bold text-red-700 outline-none"
                >
                  <option value="">Kies...</option>
                  {onFieldPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-green-500 uppercase ml-1">Wissel erin</label>
                <select 
                  value={wisselIn} 
                  onChange={(e) => setWisselIn(Number(e.target.value))}
                  className="w-full p-2 bg-green-50 border border-green-100 rounded-lg text-xs font-bold text-green-700 outline-none"
                >
                  <option value="">Kies...</option>
                  {sortedPresentPlayers.filter(p => substitutes.includes(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={handleExecuteWissel}
              disabled={wisselOut === "" || wisselIn === ""}
              className="w-full py-2 bg-[#04174C] text-white rounded-lg text-[10px] font-black uppercase disabled:opacity-30 flex items-center justify-center gap-2"
            >
              <Check size={14} /> Wissel Bevestigen
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sortedPresentPlayers.filter(p => substitutes.includes(p.id)).map(p => {
              const wasSwappedOut = substitutions.some((s: any) => s.outId === p.id);
              return (
                <div key={p.id} className="relative">
                  <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#04174C] text-white shadow-sm flex items-center gap-1.5">
                    {p.name}
                    {wasSwappedOut && <ArrowDownCircle size={12} className="text-red-400" />}
                  </span>
                </div>
              );
            })}
            {substitutes.length === 0 && <span className="text-[10px] italic text-gray-300">Geen wissels op de bank</span>}
          </div>
        )}
      </div>

      {/* DOELMAN SECTIE */}
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

      {/* SPELERSLIJST MET PIJLTJES */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {onFieldPlayers.map(p => {
          const gc = getStatCount(p.id, quarter.goals);
          const ac = getStatCount(p.id, (quarter as any).assists);
          const tc = getStatCount(p.id, (quarter as any).tackles);
          const wasSwappedIn = substitutions.some((s: any) => s.inId === p.id);

          return (
            <div key={p.id} className="p-2 pl-3 flex items-center gap-3">
              <div className="flex-1 flex items-center gap-1.5 truncate">
                <span className="font-bold text-[#04174C] text-xs">{p.name}</span>
                {wasSwappedIn && <ArrowUpCircle size={14} className="text-green-500 shrink-0" />}
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