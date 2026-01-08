import React from 'react';
import { Shield, Target, Save, X, UserCheck, ClipboardEdit, Home, MapPin, Handshake, Axe } from 'lucide-react';
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
  
  const updateQuarter = (index: number, updates: any) => {
    const newQuarters = [...currentGame.quarters];
    newQuarters[index] = { ...newQuarters[index], ...updates };
    onUpdateGame({ ...currentGame, quarters: newQuarters });
  };

  const togglePlayerPresent = (playerId: number) => {
    onUpdateGame({
      ...currentGame,
      playersPresent: currentGame.playersPresent.includes(playerId)
        ? currentGame.playersPresent.filter(id => id !== playerId)
        : [...currentGame.playersPresent, playerId]
    });
  };

  const toggleParentPresent = (parentId: number) => {
    onUpdateGame({
      ...currentGame,
      parentsPresent: currentGame.parentsPresent.includes(parentId)
        ? currentGame.parentsPresent.filter(id => id !== parentId)
        : [...currentGame.parentsPresent, parentId]
    });
  };

  const getStatCount = (playerId: number, statArray: number[] | undefined) => {
    if (!statArray) return 0;
    return statArray.filter(id => id === playerId).length;
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

  const onRightClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    action();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#04174C]">Live Match</h2>
        <button onClick={onCancel} className="text-red-500 flex items-center gap-1 font-semibold">
          <X size={18} /> Annuleren
        </button>
      </div>

      {/* Wedstrijd Details */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-[#04174C]/20 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateGame({ ...currentGame, isAway: false })}
            className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${!currentGame.isAway ? 'bg-[#04174C] text-white shadow-md' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}
          >
            <Home size={24} strokeWidth={!currentGame.isAway ? 3 : 2} /> Thuis
          </button>
          <button
            onClick={() => onUpdateGame({ ...currentGame, isAway: true })}
            className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${currentGame.isAway ? 'bg-[#04174C] text-white shadow-md' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}
          >
            <MapPin size={24} strokeWidth={currentGame.isAway ? 3 : 2} /> Uit
          </button>
        </div>
        <input
          type="text"
          placeholder="Naam tegenstander..."
          className="w-full p-3 rounded-lg border border-[#04174C]/20 focus:ring-2 focus:ring-[#04174C] outline-none font-bold text-[#04174C]"
          value={currentGame.opponent || ''}
          onChange={(e) => onUpdateGame({ ...currentGame, opponent: e.target.value })}
        />
      </div>

      {/* Selecties (Spelers & Ouders) - Ongewijzigd */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-[#04174C]/20">
        <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><Shield size={18}/> Wie speelt er?</h3>
        <div className="flex flex-wrap gap-2">
          {players.map(p => (
            <button
              key={p.id}
              onClick={() => togglePlayerPresent(p.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentGame.playersPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-[#04174C]/20">
        <h3 className="font-bold mb-3 flex items-center gap-2 text-[#04174C]"><UserCheck size={18}/> Toeschouwers</h3>
        <div className="flex flex-wrap gap-2">
          {parents.map(p => (
            <button
              key={p.id}
              onClick={() => toggleParentPresent(p.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${currentGame.parentsPresent.includes(p.id) ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Kwarten */}
      <div className="space-y-6 mb-8">
        {currentGame.quarters.map((q, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-black text-gray-400 mb-4 uppercase tracking-widest text-sm">Kwart {q.number}</h3>
            
            {/* Doelman sectie */}
            <div className="mb-6 bg-blue-50/50 p-3 rounded-lg border border-[#04174C]/10">
              <p className="text-xs font-bold text-[#04174C] mb-3 uppercase tracking-wider">Doelman</p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {players.filter(p => currentGame.playersPresent.includes(p.id)).map(p => (
                    <button
                      key={p.id}
                      onClick={() => updateQuarter(idx, { goalkeeper: p.id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${q.goalkeeper === p.id ? 'bg-[#04174C] text-white' : 'bg-white text-[#04174C] border border-[#04174C]/20'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => updateQuarter(idx, { saves: q.saves + 1 })}
                  onContextMenu={(e) => onRightClick(e, () => updateQuarter(idx, { saves: Math.max(0, q.saves - 1) }))}
                  className="w-full py-3 bg-[#04174C] text-white rounded-lg font-bold flex items-center justify-center gap-3 shadow-sm hover:bg-[#052A6B]"
                >
                  <Save size={20} />
                  <span>Reddingen: {q.saves}</span>
                </button>
              </div>
            </div>

            {/* Acties per speler */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Spelersacties</p>
              {players.filter(p => currentGame.playersPresent.includes(p.id)).map(p => {
                const goalsCount = getStatCount(p.id, q.goals);
                const assistCount = getStatCount(p.id, (q as any).assists);
                const tackleCount = getStatCount(p.id, (q as any).tackles);

                return (
                  <div key={p.id} className="space-y-2">
                    <span className="font-bold text-[#04174C] text-xs ml-1">{p.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateQuarter(idx, { goals: [...q.goals, p.id] })}
                        onContextMenu={(e) => onRightClick(e, () => decrementStat(idx, 'goals', p.id))}
                        className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all ${goalsCount > 0 ? 'bg-green-600 text-white shadow-sm' : 'bg-green-50 text-green-700 border border-green-100'}`}
                      >
                        <Target size={18} />
                        <span className="text-[10px] font-bold">{goalsCount} Goals</span>
                      </button>
                      <button
                        onClick={() => updateQuarter(idx, { assists: [...((q as any).assists || []), p.id] })}
                        onContextMenu={(e) => onRightClick(e, () => decrementStat(idx, 'assists', p.id))}
                        className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all ${assistCount > 0 ? 'bg-yellow-500 text-white shadow-sm' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}
                      >
                        <Handshake size={18} />
                        <span className="text-[10px] font-bold">{assistCount} Assists</span>
                      </button>
                      <button
                        onClick={() => updateQuarter(idx, { tackles: [...((q as any).tackles || []), p.id] })}
                        onContextMenu={(e) => onRightClick(e, () => decrementStat(idx, 'tackles', p.id))}
                        className={`flex-1 py-3 rounded-lg flex flex-col items-center justify-center transition-all ${tackleCount > 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}
                      >
                        <Axe size={18} />
                        <span className="text-[10px] font-bold">{tackleCount} Tackles</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Tegengoals onderaan kwart - Nu met 1 knop (klik = +, long-click = -) */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Tegendoelpunten</p>
                <button
                  onClick={() => updateQuarter(idx, { opponentGoals: q.opponentGoals + 1 })}
                  onContextMenu={(e) => onRightClick(e, () => decrementStat(idx, 'opponentGoals'))}
                  className={`w-full py-2 rounded-lg font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                    q.opponentGoals > 0 
                    ? 'bg-red-600 text-white border-red-700 shadow-md' 
                    : 'bg-red-50 text-red-700 border-red-100'
                  }`}
                >
                  <Target size={22} />
                  <span className="text-xl leading-none">{q.opponentGoals}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Opmerkingen & Save */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-8 border border-yellow-200">
        <h3 className="font-bold mb-3 flex items-center gap-2 text-yellow-800">
          <ClipboardEdit size={18} /> Opmerkingen
        </h3>
        <textarea
          className="w-full p-3 border border-yellow-100 rounded-lg bg-yellow-50/30 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-yellow-300 outline-none transition-all"
          rows={4}
          placeholder="Bijv: Prachtige actie van X..."
          value={(currentGame as any).notes || ''}
          onChange={(e) => onUpdateGame({ ...currentGame, notes: e.target.value } as any)}
        />
      </div>
      
      <button
        onClick={onSave}
        className="w-full mt-4 bg-[#04174C] text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 tracking-widest hover:bg-[#052A6B] transition-all transform active:scale-95"
      >
        <Save size={24} /> EINDE WEDSTRIJD
      </button>
    </div>
  );
};