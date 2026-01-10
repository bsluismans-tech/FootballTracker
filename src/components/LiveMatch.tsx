import React, { useRef, useState } from 'react';
import { Shield, Target, Save, X, UserCheck, ClipboardEdit, Home, MapPin, Handshake, Axe, Calendar, ChevronDown, Users, ChevronRight, ChevronLeft } from 'lucide-react';
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
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // --- STATISTIEK BEREKENINGEN ---
  const totalGoals = currentGame.quarters.reduce((sum, q) => sum + q.goals.length, 0);
  const totalOpponentGoals = currentGame.quarters.reduce((sum, q) => sum + q.opponentGoals, 0);

  // --- HELPERS ---
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

  const formatDateForInput = (dateString: string) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

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

  return (
    <div className="max-w-2xl mx-auto p-4 pb-40 select-none">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#04174C]">
          {currentStep === 'setup' && 'Selectie'}
          {currentStep === 'play' && 'Live Match'}
          {currentStep === 'review' && 'Overzicht'}
        </h2>
        <button onClick={onCancel} className="text-red-500 flex items-center gap-1 font-semibold">
          <X size={18} /> Annuleren
        </button>
      </div>

      {/* --- STAP 1: SETUP --- */}
      {currentStep === 'setup' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateGame({ ...currentGame, isAway: false })}
                className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${!currentGame.isAway ? 'bg-[#04174C] text-white shadow-md' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}
              >
                <Home size={24} /> Thuis
              </button>
              <button
                onClick={() => onUpdateGame({ ...currentGame, isAway: true })}
                className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${currentGame.isAway ? 'bg-[#04174C] text-white shadow-md' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}
              >
                <MapPin size={24} /> Uit
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#04174C]/40" size={18} />
                <input
                  type="date"
                  className="w-full pl-10 pr-3 py-3 rounded-lg border border-[#04174C]/20 focus:ring-2 focus:ring-[#04174C] outline-none font-bold text-[#04174C] appearance-none"
                  value={formatDateForInput(currentGame.date)}
                  onChange={handleDateChange}
                />
              </div>
              <input
                type="text"
                placeholder="Naam tegenstander..."
                className="w-full p-3 rounded-lg border border-[#04174C]/20 focus:ring-2 focus:ring-[#04174C] outline-none font-bold text-[#04174C]"
                value={currentGame.opponent || ''}
                onChange={(e) => onUpdateGame({ ...currentGame, opponent: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><Users size={18}/> Wie speelt er?</h3>
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => onUpdateGame({...currentGame, playersPresent: currentGame.playersPresent.includes(p.id) ? currentGame.playersPresent.filter(id => id !== p.id) : [...currentGame.playersPresent, p.id]})}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentGame.playersPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><UserCheck size={18}/> Toeschouwers</h3>
            <div className="flex flex-wrap gap-2">
              {parents.map(p => (
                <button
                  key={p.id}
                  onClick={() => onUpdateGame({...currentGame, parentsPresent: currentGame.parentsPresent.includes(p.id) ? currentGame.parentsPresent.filter(id => id !== p.id) : [...currentGame.parentsPresent, p.id]})}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentGame.parentsPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- STAP 2: MATCH --- */}
      {currentStep === 'play' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {currentGame.quarters.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setActiveQuarterIdx(idx)}
                className={`flex-none px-6 py-2 rounded-lg font-black transition-all ${activeQuarterIdx === idx ? 'bg-[#04174C] text-white' : 'bg-white text-gray-300 border border-gray-100'}`}
              >
                Q{q.number}
              </button>
            ))}
          </div>

          {currentGame.quarters.map((q, idx) => idx === activeQuarterIdx && (
            <div key={idx} className="space-y-4">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-[#04174C]/10 flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={q.goalkeeper || ''}
                    onChange={(e) => updateQuarter(idx, { goalkeeper: Number(e.target.value) })}
                    className="w-full pl-3 pr-8 py-3 bg-white border border-[#04174C]/20 rounded-lg font-bold text-[#04174C] appearance-none outline-none text-sm"
                  >
                    <option value="">Keeper...</option>
                    {presentPlayers.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[#04174C] pointer-events-none" size={16} />
                </div>
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => handleButtonClick(() => updateQuarter(idx, { saves: q.saves + 1 }))}
                  onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'saves'); }}
                  onTouchStart={() => handlePressStart(() => decrementStat(idx, 'saves'))}
                  onTouchEnd={handlePressEnd}
                  className="flex-[0.8] py-3 bg-[#04174C] text-white rounded-lg font-bold flex items-center justify-center gap-2 active:scale-95 text-sm"
                >
                  <Shield size={16} />
                  <span>{q.saves} Reds</span>
                </button>
              </div>

              <div className="space-y-2">
                {presentPlayers.map(p => {
                  const gc = getStatCount(p.id, q.goals);
                  const ac = getStatCount(p.id, (q as any).assists);
                  const tc = getStatCount(p.id, (q as any).tackles);
                  return (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-2">
                      <span className="font-bold text-[#04174C] text-xs ml-1">{p.name}</span>
                      <div className="flex gap-2">
                        <button
                          style={{ touchAction: 'manipulation' }}
                          onClick={() => handleButtonClick(() => updateQuarter(idx, { goals: [...q.goals, p.id] }))}
                          onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'goals', p.id); }}
                          onTouchStart={() => handlePressStart(() => decrementStat(idx, 'goals', p.id))}
                          onTouchEnd={handlePressEnd}
                          className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${gc > 0 ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-100'}`}
                        >
                          <Target size={18} />
                          <span className="text-[10px] font-bold">{gc} Goals</span>
                        </button>
                        <button
                          style={{ touchAction: 'manipulation' }}
                          onClick={() => handleButtonClick(() => updateQuarter(idx, { assists: [...((q as any).assists || []), p.id] }))}
                          onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'assists', p.id); }}
                          onTouchStart={() => handlePressStart(() => decrementStat(idx, 'assists', p.id))}
                          onTouchEnd={handlePressEnd}
                          className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${ac > 0 ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}
                        >
                          <Handshake size={18} />
                          <span className="text-[10px] font-bold">{ac} Assists</span>
                        </button>
                        <button
                          style={{ touchAction: 'manipulation' }}
                          onClick={() => handleButtonClick(() => updateQuarter(idx, { tackles: [...((q as any).tackles || []), p.id] }))}
                          onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'tackles', p.id); }}
                          onTouchStart={() => handlePressStart(() => decrementStat(idx, 'tackles', p.id))}
                          onTouchEnd={handlePressEnd}
                          className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${tc > 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}
                        >
                          <Axe size={18} />
                          <span className="text-[10px] font-bold">{tc} Tackles</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Tegendoelpunten</p>
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => handleButtonClick(() => updateQuarter(idx, { opponentGoals: q.opponentGoals + 1 }))}
                  onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'opponentGoals'); }}
                  onTouchStart={() => handlePressStart(() => decrementStat(idx, 'opponentGoals'))}
                  onTouchEnd={handlePressEnd}
                  className={`w-full py-3 rounded-lg font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${q.opponentGoals > 0 ? 'bg-red-600 text-white shadow-md' : 'bg-red-50 text-red-700 border border-red-100'}`}
                >
                  <Target size={22} />
                  <span className="text-xl leading-none">{q.opponentGoals}</span>
                </button>
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
            <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">
              U9 Kaulille vs {currentGame.opponent || 'Tegenstander'}
            </p>
            <div className={`text-sm font-black px-4 py-1 rounded-full inline-block ${totalGoals >= totalOpponentGoals ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {totalGoals > totalOpponentGoals ? 'GEWONNEN 🎉' : totalGoals < totalOpponentGoals ? 'VERLOREN ⚽️' : 'GELIJKSPEL 🤝'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><ClipboardEdit size={18}/> Opmerkingen</h3>
            <textarea
              className="w-full p-3 border border-gray-100 rounded-lg bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-[#04174C]/10"
              rows={6}
              placeholder="Matchverslag..."
              value={(currentGame as any).notes || ''}
              onChange={(e) => onUpdateGame({ ...currentGame, notes: e.target.value } as any)}
            />
          </div>
        </div>
      )}

      {/* --- STICKY NAVIGATIE --- */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-2xl mx-auto space-y-2">
          {currentStep === 'setup' && (
            <button onClick={() => setCurrentStep('play')} className="w-full bg-[#04174C] text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
              START WEDSTRIJD <ChevronRight size={20}/>
            </button>
          )}
          {currentStep === 'play' && (
            <button onClick={() => setCurrentStep('review')} className="w-full bg-[#04174C] text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
              NAAR OVERZICHT <ChevronRight size={20}/>
            </button>
          )}
          {currentStep === 'review' && (
            <button onClick={onSave} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
              <Save size={20} /> MATCH OPSLAAN
            </button>
          )}
          
          {currentStep !== 'setup' && (
            <button onClick={() => setCurrentStep(currentStep === 'review' ? 'play' : 'setup')} className="w-full text-gray-400 py-2 font-bold flex items-center justify-center gap-1 active:opacity-50 text-sm">
              <ChevronLeft size={16}/> TERUG
            </button>
          )}
        </div>
      </div>
    </div>
  );
};