import React, { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Player, Parent, Game } from '../types';

// Importeer de sub-componenten
import { MatchSetup } from './MatchSetup';
import { MatchPlay } from './MatchPlay';
import { MatchReview } from './MatchReview';

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

  // Scroll instant naar boven bij navigatie
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep, activeQuarterIdx]);

  // --- REAL-TIME FIREBASE SYNC ---
  // Telkens als currentGame wijzigt, sturen we de data naar de database.
  // Hierdoor verspringen de scores op de telefoons van alle andere gebruikers (LiveScoreboard).
  useEffect(() => {
    const syncToFirebase = async () => {
      // We syncen alleen als de match daadwerkelijk gestart is (niet in setup)
      if (currentStep !== 'setup' && currentGame.id) {
        const gameRef = doc(db, "games", currentGame.id.toString());
        try {
          await updateDoc(gameRef, {
            ...currentGame,
            // We houden de status op 'active' zolang we in 'play' of 'review' zitten
            status: 'active',
            lastUpdate: new Date().toISOString()
          });
        } catch (err) {
          console.error("Fout bij synchroniseren naar dashboard:", err);
        }
      }
    };

    syncToFirebase();
  }, [currentGame, currentStep]);

  // --- STATISTIEK BEREKENINGEN ---
  const totalGoals = currentGame.quarters.reduce((sum, q) => sum + q.goals.length, 0);
  const totalOpponentGoals = currentGame.quarters.reduce((sum, q) => sum + q.opponentGoals, 0);

  // --- NAVIGATIE LOGICA ---
  const handleNext = async () => {
    if (currentStep === 'setup') {
      // Match gaat van start: zet status in DB op active
      if (currentGame.id) {
        const gameRef = doc(db, "games", currentGame.id.toString());
        await updateDoc(gameRef, { status: 'active' });
      }
      setCurrentStep('play');
      setActiveQuarterIdx(0);
    } else if (currentStep === 'play') {
      if (activeQuarterIdx < 3) {
        setActiveQuarterIdx(activeQuarterIdx + 1);
      } else {
        setCurrentStep('review');
      }
    } else {
      // MATCH OPSLAAN: Zet status op finished zodat het LiveScoreboard naar 'Laatste uitslag' verspringt
      if (currentGame.id) {
        const gameRef = doc(db, "games", currentGame.id.toString());
        await updateDoc(gameRef, { 
          status: 'finished',
          endTime: new Date().toISOString()
        });
      }
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

  return (
    <div className="max-w-2xl mx-auto p-4 pb-40 select-none">
      
      {/* PROGRESS TRACKER BOVENAAN */}
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

      {/* RENDER DE JUISTE STAP GEBASEERD OP DE STATE */}
      {currentStep === 'setup' && (
        <MatchSetup 
          currentGame={currentGame} 
          players={players} 
          parents={parents} 
          onUpdateGame={onUpdateGame} 
          formatDateForInput={formatDateForInput} 
          handleDateChange={handleDateChange} 
        />
      )}

      {currentStep === 'play' && (
        <MatchPlay 
        currentGame={currentGame}
          quarter={currentGame.quarters[activeQuarterIdx]} 
          activeQuarterIdx={activeQuarterIdx}
          presentPlayers={presentPlayers} 
          onUpdateQuarter={(updates) => updateQuarter(activeQuarterIdx, updates)}
          handleButtonClick={handleButtonClick} 
          handlePressStart={handlePressStart} 
          handlePressEnd={handlePressEnd}
          getStatCount={getStatCount} 
          decrementStat={decrementStat}
        />
      )}

      {currentStep === 'review' && (
        <MatchReview 
          currentGame={currentGame} 
          totalGoals={totalGoals} 
          totalOpponentGoals={totalOpponentGoals} 
          onUpdateGame={onUpdateGame} 
        />
      )}


{/* STICKY NAVIGATIE ONDERAAN */}
<div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-50">
  <div className="max-w-2xl mx-auto flex gap-3">
    
    {/* TERUG KNOP (Alleen tonen als we niet in setup zitten) */}
    {currentStep !== 'setup' && (
      <button 
        onClick={handleBack} 
        className="flex-none w-20 bg-white border-2 border-[#04174C] text-[#04174C] py-4 rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center shadow-sm"
        title="Terug"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
    )}

    {/* START / VOLGENDE / OPSLAAN KNOP */}
    <button 
      onClick={handleNext} 
      className={`flex-1 text-white py-4 rounded-xl font-bold shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm
        ${currentStep === 'review' ? 'bg-green-600 shadow-green-200' : 'bg-[#04174C] shadow-blue-200'}`}
    >
      {currentStep === 'setup' && 'START WEDSTRIJD'}
      {currentStep === 'play' && (activeQuarterIdx < 3 ? `Start kwart ${activeQuarterIdx + 2}` : 'Einde wedstrijd')}
      {currentStep === 'review' && 'MATCH OPSLAAN'}
    </button>
    
  </div>
</div>




      {/* ANNULEER CONFIRMATION POP-UP */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center px-4" onMouseDown={() => setShowCancelConfirm(false)}>
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-xs w-full select-none" onMouseDown={e => e.stopPropagation()}>
            <div className="mb-6 text-lg font-bold text-[#04174C]">
              Wil je de wedstrijd annuleren? <span className="text-sm font-normal block mt-1 text-gray-500">Alle huidige data gaat verloren op het live dashboard.</span>
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg font-semibold text-gray-500 hover:bg-gray-100 transition" onClick={() => setShowCancelConfirm(false)}>Nee</button>
              <button className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={async () => { 
                // Bij annuleren: verwijder live status of zet op finished
                if (currentGame.id) {
                   const gameRef = doc(db, "games", currentGame.id);
                   await updateDoc(gameRef, { status: 'cancelled' });
                }
                onCancel(); 
                setShowCancelConfirm(false); 
              }}>Ja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};