import React, { useRef, useState } from 'react';
import { Shield, Target, Save, X, UserCheck, ClipboardEdit, Home, MapPin, Handshake, Axe, Calendar, ChevronDown, Users, LayoutDashboard, SwatchBook } from 'lucide-react';
import type { Player, Parent, Game } from '../types';

interface Props {
  currentGame: Game;
  players: Player[];
  parents: Parent[];
  onUpdateGame: (game: Game) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const LiveMatch: React.FC<Props> = ({ currentGame, players, parents, onUpdateGame, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'match'>('info');
  const [activeQuarterIdx, setActiveQuarterIdx] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // --- HELPERS VOOR LONG PRESS ---
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

  // --- ALGEMENE HELPERS ---
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
      if (currentVal > 0) {
        updateQuarter(idx, { [field]: currentVal - 1 });
      }
    }
  };

  const togglePlayerPresent = (playerId: number) => {
    onUpdateGame({
      ...currentGame,
      playersPresent: currentGame.playersPresent.includes(playerId)
        ? currentGame.playersPresent.filter(id => id !== playerId)
        : [...currentGame.playersPresent, playerId]
    });
  };

  const getStatCount = (playerId: number, statArray: number[] | undefined) => {
    if (!statArray) return 0;
    return statArray.filter(id => id === playerId).length;
  };

  const presentPlayers = players.filter(p => currentGame.playersPresent.includes(p.id));

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 select-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[#04174C]">Live Match</h2>
        <button onClick={onCancel} className="text-red-500 flex items-center gap-1 font-semibold text-sm">
          <X size={16} /> Annuleren
        </button>
      </div>

      {/* Tab Navigatie */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6 shadow-inner">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'info' ? 'bg-white text-[#04174C] shadow-sm' : 'text-gray-500'}`}
        >
          <LayoutDashboard size={18} /> Selectie
        </button>
        <button
          onClick={() => setActiveTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'match' ? 'bg-white text-[#04174C] shadow-sm' : 'text-gray-500'}`}
        >
          <Target size={18} /> Match
        </button>
      </div>

      {/* INHOUD TAB: INFO & SELECTIE */}
      {activeTab === 'info' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Wedstrijd Details */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateGame({ ...currentGame, isAway: false })}
                className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 ${!currentGame.isAway ? 'bg-[#04174C] text-white' : 'bg-gray-50 text-gray-400'}`}
              >
                <Home size={18} /> Thuis
              </button>
              <button
                onClick={() => onUpdateGame({ ...currentGame, isAway: true })}
                className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 ${currentGame.isAway ? 'bg-[#04174C] text-white' : 'bg-gray-50 text-gray-400'}`}
              >
                <MapPin size={18} /> Uit
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="date"
                className="w-full p-3 rounded-lg border border-gray-200 font-bold text-[#04174C]"
                value={formatDateForInput(currentGame.date)}
                onChange={handleDateChange}
              />
              <input
                type="text"
                placeholder="Tegenstander..."
                className="w-full p-3 rounded-lg border border-gray-200 font-bold text-[#04174C]"
                value={currentGame.opponent || ''}
                onChange={(e) => onUpdateGame({ ...currentGame, opponent: e.target.value })}
              />
            </div>
          </div>

          {/* Speler Selectie */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><Users size={18}/> Wie speelt er?</h3>
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlayerPresent(p.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition ${currentGame.playersPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-400'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Toeschouwers */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><UserCheck size={18}/> Toeschouwers</h3>
            <div className="flex flex-wrap gap-2">
              {parents.map(p => (
                <button
                  key={p.id}
                  onClick={() => onUpdateGame({
                    ...currentGame,
                    parentsPresent: currentGame.parentsPresent.includes(p.id)
                      ? currentGame.parentsPresent.filter(id => id !== p.id)
                      : [...currentGame.parentsPresent, p.id]
                  })}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition ${currentGame.parentsPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-400'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INHOUD TAB: MATCH & STATS */}
      {activeTab === 'match' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Kwart Selectie */}
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

          {/* Actieve Kwart Content */}
          {currentGame.quarters.map((q, idx) => idx === activeQuarterIdx && (
            <div key={idx} className="space-y-4">
              {/* Doelman & Reddingen */}
              <div className="bg-blue-50/50 p-3 rounded-xl border border-[#04174C]/10 flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={q.goalkeeper || ''}
                    onChange={(e) => updateQuarter(idx, { goalkeeper: Number(e.target.value) })}
                    className="w-full pl-3 pr-8 py-3 bg-white border border-[#04174C]/20 rounded-lg font-bold text-[#04174C] appearance-none outline-none text-sm"
                  >
                    <option value="">Keeper...</option>
                    {presentPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[#04174C] pointer-events-none" size={16} />
                </div>
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => handleButtonClick(() => updateQuarter(idx, { saves: q.saves + 1 }))}
                  onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'saves'); }}
                  onTouchStart={() => handlePressStart(() => decrementStat(idx, 'saves'))}
                  onTouchEnd={handlePressEnd}
                  className="flex-[0.8] py-3 bg-[#04174C] text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 text-sm"
                >
                  <Shield size={16} />
                  <span>{q.saves} Reds</span>
                </button>
              </div>

              {/* Spelersacties */}
              <div className="space-y-3">
                {presentPlayers.map(p => {
                  const goalsCount = getStatCount(p.id, q.goals);
                  const assistCount = getStatCount(p.id, (q as any).assists);
                  const tackleCount = getStatCount(p.id, (q as any).tackles);

                  return (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-2">
                      <span className="font-bold text-[#04174C] text-xs uppercase tracking-wider">{p.name}</span>
                      <div className="flex gap-2">
                        <button
                          style={{ touchAction: 'manipulation' }}
                          onClick={() => handleButtonClick(() => updateQuarter(idx, { goals: [...q.goals, p.id] }))}
                          onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'goals', p.id); }}
                          onTouchStart={() => handlePressStart(() => decrementStat(idx, 'goals', p.id))}
                          onTouchEnd={handlePressEnd}
                          className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${goalsCount > 0 ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'}`}
                        >
                          <Target size={18} />
                          <span className="text-[10px] font-bold">{goalsCount} Goals</span>
                        </button>
                        <button
                          style={{ touchAction: 'manipulation' }}
                          onClick={() => handleButtonClick(() => updateQuarter(idx, { assists: [...((q as any).assists || []), p.id] }))}
                          onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'assists', p.id); }}
                          onTouchStart={() => handlePressStart(() => decrementStat(idx, 'assists', p.id))}
                          onTouchEnd={handlePressEnd}
                          className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${assistCount > 0 ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700'}`}
                        >
                          <Handshake size={18} />
                          <span className="text-[10px] font-bold">{assistCount} Assists</span>
                        </button>
                        <button
                          style={{ touchAction: 'manipulation' }}
                          onClick={() => handleButtonClick(() => updateQuarter(idx, { tackles: [...((q as any).tackles || []), p.id] }))}
                          onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'tackles', p.id); }}
                          onTouchStart={() => handlePressStart(() => decrementStat(idx, 'tackles', p.id))}
                          onTouchEnd={handlePressEnd}
                          className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${tackleCount > 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}
                        >
                          <Axe size={18} />
                          <span className="text-[10px] font-bold">{tackleCount} Tackles</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tegengoals */}
              <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                <p className="text-[10px] font-bold text-red-700 mb-2 uppercase tracking-widest text-center">Tegendoelpunten</p>
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => handleButtonClick(() => updateQuarter(idx, { opponentGoals: q.opponentGoals + 1 }))}
                  onContextMenu={(e) => { e.preventDefault(); decrementStat(idx, 'opponentGoals'); }}
                  onTouchStart={() => handlePressStart(() => decrementStat(idx, 'opponentGoals'))}
                  onTouchEnd={handlePressEnd}
                  className={`w-full py-3 rounded-lg font-bold flex flex-col items-center justify-center transition-all active:scale-95 ${
                    q.opponentGoals > 0 ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-600 border border-red-200'
                  }`}
                >
                  <span className="text-2xl font-black">{q.opponentGoals}</span>
                </button>
              </div>
            </div>
          ))}

          {/* Opmerkingen */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-yellow-800 text-sm">
              <ClipboardEdit size={16} /> Opmerkingen
            </h3>
            <textarea
              className="w-full p-3 border border-yellow-100 rounded-lg bg-yellow-50/30 text-gray-700 outline-none text-sm"
              rows={3}
              placeholder="Match verloop..."
              value={(currentGame as any).notes || ''}
              onChange={(e) => onUpdateGame({ ...currentGame, notes: e.target.value } as any)}
            />
          </div>
        </div>
      )}

      {/* Vaste Save Knop onderaan */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onSave}
            className="w-full bg-[#04174C] text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            <Save size={20} /> Einde Wedstrijd
          </button>
        </div>
      </div>
    </div>
  );
};