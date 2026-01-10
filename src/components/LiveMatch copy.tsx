import React, { useRef, useState, useEffect } from 'react';
import { Shield, Target, Save, X, UserCheck, ClipboardEdit, Home, MapPin, Handshake, Axe, Calendar, ChevronDown, Users, ChevronRight, ChevronLeft, UserMinus } from 'lucide-react';
import type { Player, Parent, Game } from '../types';

interface Props {
  currentGame: Game;
  players: Player[];
  parents: Parent[];
  onUpdateGame: (game: Game) => void;
  onSave: () => void;
  onCancel: () => void;
}

type Step = 'setup' | 'play' | 'review';

export const LiveMatch: React.FC<Props> = ({ currentGame, players, parents, onUpdateGame, onSave, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  const [activeQuarterIdx, setActiveQuarterIdx] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep, activeQuarterIdx]);

  const totalGoals = currentGame.quarters.reduce((sum, q) => sum + q.goals.length, 0);
  const totalOpponentGoals = currentGame.quarters.reduce((sum, q) => sum + q.opponentGoals, 0);

  const handleNext = () => {
    if (currentStep === 'setup') {
      setCurrentStep('play');
      setActiveQuarterIdx(0);
    } else if (currentStep === 'play') {
      if (activeQuarterIdx < 3) {
        setActiveQuarterIdx(activeQuarterIdx + 1);
      } else {
        setCurrentStep('review');
      }
    } else {
      onSave();
    }
  };

  const handleBack = () => {
    if (currentStep === 'review') {
      setCurrentStep('play');
      setActiveQuarterIdx(3);
    } else if (currentStep === 'play') {
      if (activeQuarterIdx > 0) {
        setActiveQuarterIdx(activeQuarterIdx - 1);
      } else {
        setCurrentStep('setup');
      }
    }
  };

  const handlePressStart = (action: () => void) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      action();
      isLongPress.current = true;
      timerRef.current = null;
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
  };

  const handlePressEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleButtonClick = (action: () => void) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    action();
  };

  const formatDateForInput = (dateString: string) => new Date(dateString).toISOString().split('T')[0];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    const currentTime = new Date(currentGame.date);
    newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
    onUpdateGame({ ...currentGame, date: newDate.toISOString() });
  };

  const updateQuarter = (index: number, updates: any) => {
    const newQuarters = [...currentGame.quarters];
    newQuarters[index] = { ...newQuarters[index], ...updates };
    onUpdateGame({ ...currentGame, quarters: newQuarters });
  };

  const decrementStat = (idx: number, field: string, playerId?: number) => {
    const newQuarters = [...currentGame.quarters];
    const quarter = newQuarters[idx] as any;
    if (playerId !== undefined) {
      const array = [...(quarter[field] || [])];
      const lastIndex = array.lastIndexOf(playerId);
      if (lastIndex !== -1) {
        array.splice(lastIndex, 1);
        updateQuarter(idx, { [field]: array });
      }
    } else {
      const currentVal = quarter[field] || 0;
      if (currentVal > 0) updateQuarter(idx, { [field]: currentVal - 1 });
    }
  };

  const getStatCount = (playerId: number, statArray: number[] | undefined) => {
    if (!statArray) return 0;
    return statArray.filter(id => id === playerId).length;
  };

  const presentPlayers = players.filter(p => currentGame.playersPresent.includes(p.id));

  // --- WISSELSPELER LOGICA ---
  const toggleSubstitute = (idx: number, playerId: number) => {
    const quarter = currentGame.quarters[idx];
    const currentSubs = (quarter as any).substitutes || [];
    const newSubs = currentSubs.includes(playerId)
      ? currentSubs.filter((id: number) => id !== playerId)
      : [...currentSubs, playerId];
    updateQuarter(idx, { substitutes: newSubs });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-40 select-none">
      
      {/* PROGRESS TRACKER */}
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((idx) => {
            const isCurrent = currentStep === 'play' && activeQuarterIdx === idx;
            const isPast = (currentStep === 'play' && activeQuarterIdx > idx) || currentStep === 'review';
            return (
              <div
                key={idx}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-black transition-all duration-300
                  ${isCurrent ? 'bg-white border-2 border-[#04174C] text-[#04174C] scale-110 shadow-sm' 
                  : isPast ? 'bg-[#04174C] text-white border-2 border-[#04174C]' 
                  : 'bg-gray-100 text-gray-300 border-2 border-transparent'}`}
              >
                Q{idx + 1}
              </div>
            );
          })}
        </div>
        <button onClick={() => setShowCancelConfirm(true)} className="text-red-500 flex items-center gap-1 font-semibold text-sm">
          <X size={18} /> Annuleren
        </button>
      </div>

      {/* --- STAP 1: SETUP --- */}
      {currentStep === 'setup' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20 space-y-4">
            <div className="flex gap-2">
              <button onClick={() => onUpdateGame({ ...currentGame, isAway: false })} className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${!currentGame.isAway ? 'bg-[#04174C] text-white shadow-md' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}><Home size={24} /> Thuis</button>
              <button onClick={() => onUpdateGame({ ...currentGame, isAway: true })} className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${currentGame.isAway ? 'bg-[#04174C] text-white shadow-md' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}><MapPin size={24} /> Uit</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#04174C]/40" size={18} />
                <input type="date" className="w-full pl-10 pr-3 py-3 rounded-lg border border-[#04174C]/20 font-bold text-[#04174C] appearance-none" value={formatDateForInput(currentGame.date)} onChange={handleDateChange} />
              </div>
              <input type="text" placeholder="Naam tegenstander..." className="w-full p-3 rounded-lg border border-[#04174C]/20 font-bold text-[#04174C]" value={currentGame.opponent || ''} onChange={(e) => onUpdateGame({ ...currentGame, opponent: e.target.value })} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><Users size={18}/> Wie speelt er?</h3>
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <button key={p.id} onClick={() => onUpdateGame({...currentGame, playersPresent: currentGame.playersPresent.includes(p.id) ? currentGame.playersPresent.filter(id => id !== p.id) : [...currentGame.playersPresent, p.id]})} className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentGame.playersPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-600'}`}>{p.name}</button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><UserCheck size={18}/> Toeschouwers</h3>
            <div className="flex flex-wrap gap-2">
              {parents.map(p => (
                <button key={p.id} onClick={() => onUpdateGame({...currentGame, parentsPresent: currentGame.parentsPresent.includes(p.id) ? currentGame.parentsPresent.filter(id => id !== p.id) : [...currentGame.parentsPresent, p.id]})} className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentGame.parentsPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-600'}`}>{p.name}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- STAP 2: MATCH --- */}
      {currentStep === 'play' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {currentGame.quarters.map((q, idx) => idx === activeQuarterIdx && (
            <div key={idx} className="space-y-3">
              
              {/* WISSELSPELERS SECTIE */}
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <UserMinus size={14} /> Wisselspelers
                  </h3>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {presentPlayers
                    .filter(p => {
                      const isSub = ((q as any).substitutes || []).includes(p.id);
                      const totalOnField = presentPlayers.length - ((q as any).substitutes || []).length;
                      // Toon de speler als hij een wissel is OF als er meer dan 5 veldspelers zijn
                      return isSub || totalOnField > 5;
                    })
                    .map(p => (
                    <button
                      key={p.id}
                      onClick={() => toggleSubstitute(idx, p.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        ((q as any).substitutes || []).includes(p.id)
                          ? 'bg-[#04174C] text-white shadow-sm scale-95 opacity-100'
                          : 'bg-gray-50 text-gray-400 border border-gray-100'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doelman Sectie */}
              <div className="bg-blue-50/50 p-3 rounded-lg border border-[#04174C]/10 flex items-center gap-2">
                <div className="relative flex-1">
                  <select 
                    value={q.goalkeeper || ''} 
                    onChange={(e) => updateQuarter(idx, { goalkeeper: Number(e.target.value) })} 
                    className="w-full pl-3 pr-8 py-3 bg-white border border-[#04174C]/20 rounded-lg font-bold text-[#04174C] appearance-none outline-none text-sm"
                  >
                    <option value="">Keeper...</option>
                    {presentPlayers
                      .filter(p => !((q as any).substitutes || []).includes(p.id))
                      .map(p => (<option key={p.id} value={p.id}>{p.name}</option>))
                    }
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[#04174C] pointer-events-none" size={16} />
                </div>
                <button style={{ touchAction: 'manipulation' }} onClick={() => handleButtonClick(() => updateQuarter(idx, { saves: q.saves + 1 }))} onTouchStart={() => handlePressStart(() => decrementStat(idx, 'saves'))} onTouchEnd={handlePressEnd} className="flex-[0.8] py-3 bg-[#04174C] text-white rounded-lg font-bold flex items-center justify-center gap-2 active:scale-95 text-sm"><Shield size={16} />{q.saves} Reddingen</button>
              </div>

              {/* Spelerslijst acties */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {presentPlayers
                  .filter(p => !((q as any).substitutes || []).includes(p.id))
                  .map(p => {
                    const gc = getStatCount(p.id, q.goals);
                    const ac = getStatCount(p.id, (q as any).assists);
                    const tc = getStatCount(p.id, (q as any).tackles);
                    return (
                      <div key={p.id} className="p-2 pl-3 flex items-center gap-3">
                        <span className="font-bold text-[#04174C] text-xs flex-1 truncate">{p.name}</span>
                        <div className="flex gap-1.5 flex-[3.5]">
                          <button style={{ touchAction: 'manipulation' }} onClick={() => handleButtonClick(() => updateQuarter(idx, { goals: [...q.goals, p.id] }))} onTouchStart={() => handlePressStart(() => decrementStat(idx, 'goals', p.id))} onTouchEnd={handlePressEnd} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 ${gc > 0 ? 'bg-green-600 text-white shadow-sm' : 'bg-green-50 text-green-700 border border-green-100'}`}><Target size={14}/><span className="text-[9px] font-black uppercase">Goal {gc}</span></button>
                          <button style={{ touchAction: 'manipulation' }} onClick={() => handleButtonClick(() => updateQuarter(idx, { assists: [...((q as any).assists || []), p.id] }))} onTouchStart={() => handlePressStart(() => decrementStat(idx, 'assists', p.id))} onTouchEnd={handlePressEnd} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 ${ac > 0 ? 'bg-yellow-500 text-white shadow-sm' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}><Handshake size={14}/><span className="text-[9px] font-black uppercase">Assis {ac}</span></button>
                          <button style={{ touchAction: 'manipulation' }} onClick={() => handleButtonClick(() => updateQuarter(idx, { tackles: [...((q as any).tackles || []), p.id] }))} onTouchStart={() => handlePressStart(() => decrementStat(idx, 'tackles', p.id))} onTouchEnd={handlePressEnd} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 ${tc > 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}><Axe size={14}/><span className="text-[9px] font-black uppercase">Tack {tc}</span></button>
                        </div>
                      </div>
                    );
                  })
                }
              </div>

              {/* Tegendoelpunten */}
              <div className="mt-4 bg-red-50/50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                <div className="flex-1">
                   <p className="text-xs font-bold text-red-700 uppercase tracking-wider ml-1">Tegendoelpunten</p>
                </div>
                <button style={{ touchAction: 'manipulation' }} onClick={() => handleButtonClick(() => updateQuarter(idx, { opponentGoals: q.opponentGoals + 1 }))} onTouchStart={() => handlePressStart(() => decrementStat(idx, 'opponentGoals'))} onTouchEnd={handlePressEnd} className={`flex-[0.8] py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm ${q.opponentGoals > 0 ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-600 border border-red-200'}`}><Target size={18} />{q.opponentGoals} Goals</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- STAP 3: REVIEW --- */}
      {currentStep === 'review' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#04174C]/20 text-center space-y-2">
            <h3 className="text-3xl font-black text-[#04174C]">{totalGoals} - {totalOpponentGoals}</h3>
            <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">U9 Kaulille vs {currentGame.opponent || 'Tegenstander'}</p>
            <div className={`text-sm font-black px-4 py-1 rounded-full inline-block ${totalGoals >= totalOpponentGoals ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{totalGoals > totalOpponentGoals ? 'GEWONNEN 🎉' : totalGoals < totalOpponentGoals ? 'VERLOREN ⚽️' : 'GELIJKSPEL 🤝'}</div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-yellow-800"><ClipboardEdit size={18} /> Opmerkingen</h3>
            <textarea className="w-full p-3 border border-yellow-100 rounded-lg bg-yellow-50/30 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-yellow-300 outline-none transition-all" rows={6} placeholder="Matchverslag..." value={(currentGame as any).notes || ''} onChange={(e) => onUpdateGame({ ...currentGame, notes: e.target.value } as any)} />
          </div>
        </div>
      )}

      {/* STICKY NAVIGATIE */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-2xl mx-auto space-y-2">
          <button onClick={handleNext} className={`w-full text-white py-4 rounded-xl font-bold shadow-xl active:scale-95 transition-all ${currentStep === 'review' ? 'bg-green-600' : 'bg-[#04174C]'}`}>
            {currentStep === 'setup' && 'START WEDSTRIJD'}
            {currentStep === 'play' && (activeQuarterIdx < 3 ? `START KWART ${activeQuarterIdx + 2}` : 'EINDE WEDSTRIJD')}
            {currentStep === 'review' && 'MATCH OPSLAAN'}
          </button>
          {currentStep !== 'setup' && (
            <button onClick={handleBack} className="w-full border-2 border-[#04174C] text-[#04174C] py-4 rounded-xl font-bold active:scale-95 active:opacity-50 text-sm transition-all uppercase tracking-widest">TERUG</button>
          )}
        </div>
      </div>

      {/* CONFIRMATION POP-UP */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center px-4" onMouseDown={() => setShowCancelConfirm(false)}>
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-xs w-full select-none" onMouseDown={e => e.stopPropagation()}>
            <div className="mb-6 text-lg font-bold text-[#04174C]">
              Wil je de wedstrijd annuleren? <span className="text-sm font-normal block mt-1 text-gray-500">Alle huidige data gaat verloren.</span>
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg font-semibold text-gray-500 hover:bg-gray-100 transition" onClick={() => setShowCancelConfirm(false)}>Nee</button>
              <button className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={() => { onCancel(); setShowCancelConfirm(false); }}>Ja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};