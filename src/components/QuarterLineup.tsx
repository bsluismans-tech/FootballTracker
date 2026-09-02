import React, { useState } from 'react';
import { ClipboardList, Hand } from 'lucide-react';
import type { Player, Quarter, FieldPosition } from '../types';

interface Props {
  quarter: Quarter;
  presentPlayers: Player[];
  onUpdateQuarter: (updates: Partial<Quarter>) => void;
  onConfirm: () => void;
}

type WizardStep = 'keeper' | 'verdediging' | 'middenveld' | 'aanval';
const STEP_ORDER: WizardStep[] = ['keeper', 'verdediging', 'middenveld', 'aanval'];
const STEP_LABELS: Record<WizardStep, string> = {
  keeper: 'Keeper',
  verdediging: 'Verdediging',
  middenveld: 'Middenveld',
  aanval: 'Aanval',
};

const DEFENSE_SLOTS: { pos: FieldPosition; label: string }[] = [
  { pos: 'verdediger_links', label: 'Links' },
  { pos: 'verdediger_centraal', label: 'Centraal' },
  { pos: 'verdediger_rechts', label: 'Rechts' },
];
const ATTACK_SLOTS: { pos: FieldPosition; label: string }[] = [
  { pos: 'aanvaller_links', label: 'Links' },
  { pos: 'spits', label: 'Spits' },
  { pos: 'aanvaller_rechts', label: 'Rechts' },
];

// Welke posities horen bij welke stap (bepaalt wie in de knoppenlijst van die stap mag verschijnen).
const STEP_POSITIONS: Record<WizardStep, FieldPosition[]> = {
  keeper: ['keeper'],
  verdediging: DEFENSE_SLOTS.map(s => s.pos),
  middenveld: ['middenvelder'],
  aanval: ATTACK_SLOTS.map(s => s.pos),
};

const isStepComplete = (lineup: Partial<Record<FieldPosition, number>>, step: WizardStep) =>
  STEP_POSITIONS[step].every(pos => lineup[pos] != null);

// Bepaalt bij het (her)openen van dit scherm meteen de juiste stap: de eerste die nog niet volledig is.
const computeInitialStep = (lineup: Partial<Record<FieldPosition, number>>): WizardStep =>
  STEP_ORDER.find(step => !isStepComplete(lineup, step)) || 'aanval';

export const QuarterLineup: React.FC<Props> = ({ quarter, presentPlayers, onUpdateQuarter, onConfirm }) => {
  const [step, setStep] = useState<WizardStep>(() => computeInitialStep(quarter.lineup || {}));

  // Alle aanwezige spelers komen in aanmerking voor een positie — wie wisselspeler is,
  // volgt hierna net uit wie er geen positie toegewezen krijgt (zie finishWizard).
  const sortedPresentPlayers = [...presentPlayers].sort((a, b) => a.name.localeCompare(b.name));

  const lineup = quarter.lineup || {};

  // Spelers die in de knoppenlijst van de huidige stap mogen verschijnen: nog niet opgesteld,
  // óf al opgesteld op een positie die tot deze stap behoort (zodat je een eigen keuze kan herzien).
  const stepPositions = STEP_POSITIONS[step];
  const availablePlayers = sortedPresentPlayers.filter(p => {
    const assignedElsewhere = (Object.entries(lineup) as [FieldPosition, number][])
      .some(([pos, id]) => id === p.id && !stepPositions.includes(pos));
    return !assignedElsewhere;
  });

  // Bij de keeperselectie tonen we spelers die als keeper gemarkeerd staan (Ploeg-instellingen)
  // vooraan, met een handschoen-icoon (stabiele sort behoudt de alfabetische volgorde per groep).
  const keeperStepPlayers = step === 'keeper'
    ? [...availablePlayers].sort((a, b) => Number(!!b.isKeeper) - Number(!!a.isKeeper))
    : availablePlayers;

  // Wijst een speler toe aan een positie (en haalt hem overal elders weg, voor de zekerheid).
  const withAssignment = (position: FieldPosition, playerId: number) => {
    const newLineup = { ...lineup };
    (Object.keys(newLineup) as FieldPosition[]).forEach(pos => {
      if (newLineup[pos] === playerId) delete newLineup[pos];
    });
    newLineup[position] = playerId;
    return newLineup;
  };

  const withCleared = (position: FieldPosition) => {
    const newLineup = { ...lineup };
    delete newLineup[position];
    return newLineup;
  };

  // Ronde afgerond (na de laatste stap): iedere aanwezige speler zonder positie
  // wordt automatisch wisselspeler voor dit kwart.
  const finishWizard = (finalLineup: Partial<Record<FieldPosition, number>>) => {
    const assignedIds = new Set(Object.values(finalLineup) as number[]);
    const substitutes = sortedPresentPlayers.filter(p => !assignedIds.has(p.id)).map(p => p.id);
    onUpdateQuarter({ lineup: finalLineup, substitutes });
    onConfirm();
  };

  const goToNextStep = (fromStep: WizardStep, newLineup: Partial<Record<FieldPosition, number>>) => {
    const idx = STEP_ORDER.indexOf(fromStep);
    if (idx === STEP_ORDER.length - 1) {
      finishWizard(newLineup);
    } else {
      onUpdateQuarter({ lineup: newLineup });
      setStep(STEP_ORDER[idx + 1]);
    }
  };

  // Eén positie te vervullen (Keeper / Middenveld): klik wijst toe en gaat meteen door,
  // nogmaals klikken op de reeds gekozen speler maakt de keuze ongedaan.
  const handleSinglePick = (position: FieldPosition, playerId: number) => {
    if (lineup[position] === playerId) {
      onUpdateQuarter({ lineup: withCleared(position) });
      return;
    }
    goToNextStep(step, withAssignment(position, playerId));
  };

  // Drie posities te vervullen (Verdediging / Aanval): klik vult de eerst lege positie
  // van links naar rechts; klik op een reeds toegewezen speler maakt die positie weer leeg.
  const handleSlotPick = (slots: { pos: FieldPosition; label: string }[], playerId: number) => {
    const occupiedSlot = slots.find(s => lineup[s.pos] === playerId);
    if (occupiedSlot) {
      onUpdateQuarter({ lineup: withCleared(occupiedSlot.pos) });
      return;
    }
    const emptySlot = slots.find(s => lineup[s.pos] == null);
    if (!emptySlot) return;
    const newLineup = withAssignment(emptySlot.pos, playerId);
    if (slots.every(s => newLineup[s.pos] != null)) {
      goToNextStep(step, newLineup);
    } else {
      onUpdateQuarter({ lineup: newLineup });
    }
  };

  const getPlayerName = (id?: number | null) => (id != null ? presentPlayers.find(p => p.id === id)?.name : undefined);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
        <h3 className="font-bold mb-1 flex items-center gap-2 text-[#04174C]">
          <ClipboardList size={18} /> Basisopstelling kwart {quarter.number}
        </h3>

        {/* STAPPEN-INDICATOR */}
        <div className="flex gap-1.5 mb-4 mt-2">
          {STEP_ORDER.map(s => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full ${
                s === step ? 'bg-[#04174C]' : isStepComplete(lineup, s) ? 'bg-[#04174C]/40' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-black text-[#04174C] uppercase tracking-wide">{STEP_LABELS[step]}</p>
          {step !== 'keeper' && (
            <button
              onClick={() => setStep(STEP_ORDER[STEP_ORDER.indexOf(step) - 1])}
              className="text-[10px] text-gray-400 font-black uppercase tracking-widest"
            >
              ‹ Vorige stap
            </button>
          )}
        </div>

        {/* STAP: KEEPER (1 positie) — spelers die als keeper gemarkeerd staan komen vooraan */}
        {step === 'keeper' && (
          <div className="grid grid-cols-2 gap-2">
            {keeperStepPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => handleSinglePick('keeper', p.id)}
                className={`h-20 px-2 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-1.5 leading-tight transition active:scale-[0.97] ${lineup.keeper === p.id ? 'bg-[#04174C] text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
              >
                {p.isKeeper && <Hand size={14} className={lineup.keeper === p.id ? 'text-white' : 'text-blue-500'} />}
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* STAP: VERDEDIGING (3 posities, links naar rechts) */}
        {step === 'verdediging' && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {DEFENSE_SLOTS.map(slot => {
                const name = getPlayerName(lineup[slot.pos]);
                return (
                  <div
                    key={slot.pos}
                    className={`h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center px-1 ${
                      name ? 'border-[#04174C] bg-[#04174C]/5' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {!name && <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{slot.label}</span>}
                    {name && (
                      <>
                        <span className="text-[8px] font-black text-[#04174C]/40 uppercase tracking-widest">{slot.label}</span>
                        <span className="text-xs font-bold text-[#04174C] truncate max-w-full">{name}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availablePlayers.map(p => {
                const assignedSlot = DEFENSE_SLOTS.find(s => lineup[s.pos] === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSlotPick(DEFENSE_SLOTS, p.id)}
                    className={`h-20 px-2 rounded-xl text-sm font-bold text-center flex items-center justify-center leading-tight transition active:scale-[0.97] ${assignedSlot ? 'bg-[#04174C] text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* STAP: MIDDENVELD (1 positie) */}
        {step === 'middenveld' && (
          <div className="grid grid-cols-2 gap-2">
            {availablePlayers.map(p => (
              <button
                key={p.id}
                onClick={() => handleSinglePick('middenvelder', p.id)}
                className={`h-20 px-2 rounded-xl text-sm font-bold text-center flex items-center justify-center leading-tight transition active:scale-[0.97] ${lineup.middenvelder === p.id ? 'bg-[#04174C] text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* STAP: AANVAL (3 posities, links naar rechts) */}
        {step === 'aanval' && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {ATTACK_SLOTS.map(slot => {
                const name = getPlayerName(lineup[slot.pos]);
                return (
                  <div
                    key={slot.pos}
                    className={`h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center px-1 ${
                      name ? 'border-[#04174C] bg-[#04174C]/5' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {!name && <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{slot.label}</span>}
                    {name && (
                      <>
                        <span className="text-[8px] font-black text-[#04174C]/40 uppercase tracking-widest">{slot.label}</span>
                        <span className="text-xs font-bold text-[#04174C] truncate max-w-full">{name}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availablePlayers.map(p => {
                const assignedSlot = ATTACK_SLOTS.find(s => lineup[s.pos] === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSlotPick(ATTACK_SLOTS, p.id)}
                    className={`h-20 px-2 rounded-xl text-sm font-bold text-center flex items-center justify-center leading-tight transition active:scale-[0.97] ${assignedSlot ? 'bg-[#04174C] text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
