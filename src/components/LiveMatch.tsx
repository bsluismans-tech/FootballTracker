import React, { useRef, useState, useEffect } from 'react';
import { X, List, LayoutGrid, ListChecks } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Player, Game, Quarter } from '../types';
import { FIELD_POSITIONS } from '../utils/positions';

// Importeer de sub-componenten
import { MatchSetup } from './MatchSetup';
import { QuarterLineup } from './QuarterLineup';
import { MatchPlay } from './MatchPlay';
import { MatchReview } from './MatchReview';

interface Props {
  currentGame: Game;
  players: Player[];
  onUpdateGame: (game: Game) => void;
  onSave: () => void;
  onCancel: () => void;
}

type Step = 'setup' | 'play' | 'review';

// Zijn alle 8 posities van dit kwart al ingevuld? Zo ja, hoeft de opstelling-wizard niet
// getoond te worden (bv. bij het bewerken van een al afgeronde wedstrijd) — je komt dan
// meteen op het actiescherm, en kan de opstelling nog altijd aanpassen via "Opstelling wijzigen".
const isLineupComplete = (quarter?: Quarter) =>
  !!quarter && FIELD_POSITIONS.every(({ value }) => quarter.lineup?.[value] != null);

export const LiveMatch: React.FC<Props> = ({ currentGame, players, onUpdateGame, onSave, onCancel }) => {
  // Bij het (verder) invullen van een live wedstrijd (vanuit het Dashboard) starten we
  // meteen in het juiste kwart in plaats van opnieuw bij de opstelling.
  const [currentStep, setCurrentStep] = useState<Step>(() =>
    currentGame.status === 'active' ? 'play' : 'setup'
  );
  const initialQuarterIdx = currentGame.status === 'active' && currentGame.currentQuarter
    ? Math.min(Math.max(currentGame.currentQuarter - 1, 0), 3)
    : 0;
  const [activeQuarterIdx, setActiveQuarterIdx] = useState(initialQuarterIdx);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [playViewMode, setPlayViewMode] = useState<'list' | 'quick'>('quick');

  // Aan het begin van elk kwart moet de basisopstelling bevestigd zijn voor er doelpunten/
  // tackles/... geregistreerd kunnen worden — maar staat die al volledig (bv. bij het bewerken
  // van een afgeronde wedstrijd), dan gaan we meteen naar het actiescherm.
  const [quarterPhase, setQuarterPhase] = useState<'lineup' | 'actions'>(() =>
    isLineupComplete(currentGame.quarters[initialQuarterIdx]) ? 'actions' : 'lineup'
  );
  const isFirstQuarterPhaseSync = useRef(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // Scroll instant naar boven bij navigatie
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep, activeQuarterIdx]);

  // Telkens als we van kwart wisselen (voor- of achteruit): enkel de opstelling-wizard tonen
  // als die voor dát kwart nog niet volledig is, anders meteen naar het actiescherm.
  useEffect(() => {
    if (isFirstQuarterPhaseSync.current) {
      isFirstQuarterPhaseSync.current = false;
      return;
    }
    setQuarterPhase(isLineupComplete(currentGame.quarters[activeQuarterIdx]) ? 'actions' : 'lineup');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuarterIdx]);

  // Zodra het kwart écht start (opstelling bevestigd), leggen we het startuur vast — alle
  // minuten van events in dit kwart worden berekend t.o.v. dit tijdstip (zie MatchPlay).
  useEffect(() => {
    if (currentStep === 'play' && quarterPhase === 'actions') {
      const q = currentGame.quarters[activeQuarterIdx];
      if (q && !q.startedAt) {
        updateQuarter(activeQuarterIdx, { startedAt: new Date().toISOString() });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, quarterPhase, activeQuarterIdx]);

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
            // Zodat het live dashboard weet welk kwart momenteel bezig is
            currentQuarter: activeQuarterIdx + 1,
            lastUpdate: new Date().toISOString()
          });
        } catch (err) {
          console.error("Fout bij synchroniseren naar dashboard:", err);
        }
      }
    };

    syncToFirebase();
  }, [currentGame, currentStep, activeQuarterIdx]);

  // --- STATISTIEK BEREKENINGEN ---
  const totalGoals = currentGame.quarters.reduce((sum, q) => sum + q.goalEvents.length, 0);
  const totalOpponentGoals = currentGame.quarters.reduce((sum, q) => sum + q.opponentGoalEvents.length, 0);

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
      // Bij 'lineup' gebeurt de voortgang automatisch zodra de opstelling compleet is
      // (zie QuarterLineup's onConfirm-call), dus deze knop is dan niet zichtbaar.
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

  const presentPlayers = players.filter(p => currentGame.playersPresent.includes(p.id));

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 select-none">
      
      {/* PROGRESS TRACKER BOVENAAN */}
      <div className="flex justify-between items-center mb-4 px-1">
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
        <div className="flex items-center gap-4">
          {currentStep === 'play' && quarterPhase === 'actions' && (
            <button
              onClick={() => setQuarterPhase('lineup')}
              className="flex items-center gap-1.5 text-[#04174C]/60 font-bold text-[10px] uppercase tracking-widest"
            >
              <ListChecks size={14} /> Opstelling wijzigen
            </button>
          )}
          <button onClick={() => setShowCancelConfirm(true)} className="text-red-500 flex items-center gap-1 font-semibold text-sm">
            <X size={18} /> Annuleren
          </button>
        </div>
      </div>

      {/* RENDER DE JUISTE STAP GEBASEERD OP DE STATE */}
      {currentStep === 'setup' && (
        <MatchSetup 
          currentGame={currentGame} 
          players={players} 
          onUpdateGame={onUpdateGame} 
          formatDateForInput={formatDateForInput} 
          handleDateChange={handleDateChange} 
        />
      )}

      {currentStep === 'play' && quarterPhase === 'lineup' && (
        <QuarterLineup
          quarter={currentGame.quarters[activeQuarterIdx]}
          presentPlayers={presentPlayers}
          onUpdateQuarter={(updates) => updateQuarter(activeQuarterIdx, updates)}
          onConfirm={() => setQuarterPhase('actions')}
        />
      )}

      {currentStep === 'play' && quarterPhase === 'actions' && (
        <MatchPlay
          currentGame={currentGame}
          quarter={currentGame.quarters[activeQuarterIdx]}
          activeQuarterIdx={activeQuarterIdx}
          presentPlayers={presentPlayers}
          onUpdateQuarter={(updates) => updateQuarter(activeQuarterIdx, updates)}
          handleButtonClick={handleButtonClick}
          handlePressStart={handlePressStart}
          handlePressEnd={handlePressEnd}
          viewMode={playViewMode}
        />
      )}

      {/* VIEW-SWITCH: Lijst / Tegels (alleen tijdens het invullen van een kwart, geen sticky element) */}
      {currentStep === 'play' && quarterPhase === 'actions' && (
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl shadow-sm mt-4">
          <button
            onClick={() => setPlayViewMode('list')}
            title="Lijst"
            aria-label="Lijst"
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center transition-all ${
              playViewMode === 'list' ? 'bg-white text-[#04174C] shadow-sm' : 'text-gray-400'
            }`}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setPlayViewMode('quick')}
            title="Tegels"
            aria-label="Tegels"
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center transition-all ${
              playViewMode === 'quick' ? 'bg-white text-[#04174C] shadow-sm' : 'text-gray-400'
            }`}
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      )}

      {currentStep === 'review' && (
        <MatchReview
          currentGame={currentGame}
          players={players}
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

    {/* START / VOLGENDE / OPSLAAN KNOP (niet zichtbaar tijdens de opstelling-wizard: die gaat automatisch verder) */}
    {!(currentStep === 'play' && quarterPhase === 'lineup') && (
      <button
        onClick={handleNext}
        className={`flex-1 text-white py-4 rounded-xl font-bold shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm
          ${currentStep === 'review' ? 'bg-green-600 shadow-green-200' : 'bg-[#04174C] shadow-blue-200'}`}
      >
        {currentStep === 'setup' && 'START WEDSTRIJD'}
        {currentStep === 'play' && (activeQuarterIdx < 3 ? `Start kwart ${activeQuarterIdx + 2}` : 'Einde wedstrijd')}
        {currentStep === 'review' && 'MATCH OPSLAAN'}
      </button>
    )}
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
                await onCancel();
                setShowCancelConfirm(false); 
              }}>Ja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};