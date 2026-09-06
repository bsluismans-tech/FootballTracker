import React, { useState } from 'react';
import { ClipboardList, Hand } from 'lucide-react';
import type { Player, Quarter, FieldPosition } from '../types';

interface Props {
  quarter: Quarter;
  presentPlayers: Player[];
  onUpdateQuarter: (updates: Partial<Quarter>) => void;
  onConfirm: () => void;
}

// Volgorde waarin de focus automatisch verspringt na het toewijzen van een speler.
const POSITION_ORDER: FieldPosition[] = [
  'keeper',
  'verdediger_links',
  'verdediger_centraal',
  'verdediger_rechts',
  'middenvelder',
  'aanvaller_links',
  'spits',
  'aanvaller_rechts',
];

// Korte labels voor in de compacte vakjes op het veld (rij geeft al context: verdediging/aanval).
const POSITION_SHORT_LABELS: Record<FieldPosition, string> = {
  keeper: 'Keeper',
  verdediger_links: 'Links',
  verdediger_centraal: 'Centraal',
  verdediger_rechts: 'Rechts',
  middenvelder: 'Midden',
  aanvaller_links: 'Links',
  spits: 'Spits',
  aanvaller_rechts: 'Rechts',
};

// Volledige labels voor de "Kies voor..."-tekst, waar de korte versie te dubbelzinnig zou zijn.
const POSITION_FULL_LABELS: Record<FieldPosition, string> = {
  keeper: 'Keeper',
  verdediger_links: 'Verdediger links',
  verdediger_centraal: 'Verdediger centraal',
  verdediger_rechts: 'Verdediger rechts',
  middenvelder: 'Middenvelder',
  aanvaller_links: 'Aanvaller links',
  spits: 'Spits',
  aanvaller_rechts: 'Aanvaller rechts',
};

// Visuele opstelling (dubbele ruit): aanval bovenaan (richting tegenstander), keeper onderaan.
const FORMATION_ROWS: FieldPosition[][] = [
  ['aanvaller_links', 'spits', 'aanvaller_rechts'],
  ['middenvelder'],
  ['verdediger_links', 'verdediger_centraal', 'verdediger_rechts'],
  ['keeper'],
];

// Bij het (her)openen focussen we meteen de eerste positie die nog leeg is.
const computeInitialFocus = (lineup: Partial<Record<FieldPosition, number>>): FieldPosition =>
  POSITION_ORDER.find(pos => lineup[pos] == null) || 'keeper';

export const QuarterLineup: React.FC<Props> = ({ quarter, presentPlayers, onUpdateQuarter, onConfirm }) => {
  const [focusedPosition, setFocusedPosition] = useState<FieldPosition>(() =>
    computeInitialFocus(quarter.lineup || {})
  );

  const sortedPresentPlayers = [...presentPlayers].sort((a, b) => a.name.localeCompare(b.name));
  const lineup = quarter.lineup || {};

  const getPlayerName = (id?: number | null) => (id != null ? presentPlayers.find(p => p.id === id)?.name : undefined);

  // Enkel spelers die nog nergens op het veld staan tonen we onderaan — wie al een positie
  // heeft, verdwijnt uit de lijst (past beter op een telefoonscherm en voorkomt dubbele keuzes).
  const assignedIds = new Set(Object.values(lineup) as number[]);
  const unassignedPlayers = sortedPresentPlayers.filter(p => !assignedIds.has(p.id));

  // Bij de keeperselectie tonen we spelers die als keeper gemarkeerd staan (Ploeg-instellingen) vooraan.
  const playerButtons = focusedPosition === 'keeper'
    ? [...unassignedPlayers].sort((a, b) => Number(!!b.isKeeper) - Number(!!a.isKeeper))
    : unassignedPlayers;

  const nextFocus = (current: FieldPosition): FieldPosition => {
    const idx = POSITION_ORDER.indexOf(current);
    return POSITION_ORDER[(idx + 1) % POSITION_ORDER.length];
  };

  // Ronde compleet zodra alle 8 posities een speler hebben: wisselspelers automatisch afleiden
  // en meteen doorschakelen naar het volgende scherm.
  const finishIfComplete = (newLineup: Partial<Record<FieldPosition, number>>): boolean => {
    const allFilled = POSITION_ORDER.every(pos => newLineup[pos] != null);
    if (!allFilled) {
      onUpdateQuarter({ lineup: newLineup });
      return false;
    }
    const assignedIds = new Set(Object.values(newLineup) as number[]);
    const substitutes = sortedPresentPlayers.filter(p => !assignedIds.has(p.id)).map(p => p.id);
    onUpdateQuarter({ lineup: newLineup, substitutes });
    onConfirm();
    return true;
  };

  // Tik op een positie op het veld: leeg -> gewoon focussen; bezet -> leegmaken en focussen,
  // zodat er meteen een nieuwe speler voor gekozen kan worden.
  const handleSlotTap = (position: FieldPosition) => {
    if (lineup[position] != null) {
      const newLineup = { ...lineup };
      delete newLineup[position];
      onUpdateQuarter({ lineup: newLineup });
    }
    setFocusedPosition(position);
  };

  // Tik op een speler onderaan: wijst toe aan de gefocuste positie (haalt hem overal elders
  // weg) en springt door naar de volgende positie in de vaste volgorde.
  const handlePlayerTap = (playerId: number) => {
    const newLineup = { ...lineup };
    (Object.keys(newLineup) as FieldPosition[]).forEach(pos => {
      if (newLineup[pos] === playerId) delete newLineup[pos];
    });
    newLineup[focusedPosition] = playerId;

    if (!finishIfComplete(newLineup)) {
      setFocusedPosition(nextFocus(focusedPosition));
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
        <h3 className="font-bold mb-1 flex items-center gap-2 text-[#04174C]">
          <ClipboardList size={18} /> Basisopstelling kwart {quarter.number}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Kies een speler voor: <span className="font-black text-[#04174C]">{POSITION_FULL_LABELS[focusedPosition]}</span>
        </p>

        {/* VISUELE OPSTELLING */}
        <div className="bg-green-50 rounded-2xl border-2 border-green-100 p-4 space-y-6 mb-4">
          {FORMATION_ROWS.map((row, i) => (
            <div key={i} className="flex justify-center gap-2">
              {row.map(pos => {
                const playerId = lineup[pos];
                const name = getPlayerName(playerId);
                const isFocused = focusedPosition === pos;
                // Vleugelverdedigers iets omhoog, vleugelaanvallers iets omlaag: samen met de
                // centrale verdediger/spits ontstaat zo de dubbele-ruit-vorm i.p.v. platte rijen.
                const wingOffset =
                  pos === 'verdediger_links' || pos === 'verdediger_rechts'
                    ? '-translate-y-10'
                    : pos === 'aanvaller_links' || pos === 'aanvaller_rechts'
                    ? 'translate-y-10'
                    : '';
                return (
                  <button
                    key={pos}
                    onClick={() => handleSlotTap(pos)}
                    className={`flex-1 max-w-[110px] h-16 rounded-xl border-2 flex flex-col items-center justify-center text-center px-1 transition-all active:scale-95 ${wingOffset} ${
                      isFocused
                        ? 'border-[#04174C] bg-[#04174C] shadow-lg scale-105'
                        : name
                        ? 'border-[#04174C]/40 bg-white'
                        : 'border-dashed border-gray-300 bg-white/60'
                    }`}
                  >
                    <span className={`text-[8px] font-black uppercase tracking-widest ${isFocused ? 'text-white/70' : 'text-gray-400'}`}>
                      {POSITION_SHORT_LABELS[pos]}
                    </span>
                    <span className={`text-xs font-bold truncate max-w-full ${isFocused ? 'text-white' : name ? 'text-[#04174C]' : 'text-gray-300'}`}>
                      {name || '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* SPELERSLIJST (enkel nog niet-toegewezen spelers, compact voor op een telefoonscherm) */}
        <div className="grid grid-cols-3 gap-1.5">
          {playerButtons.map(p => (
            <button
              key={p.id}
              onClick={() => handlePlayerTap(p.id)}
              className="h-11 px-1 rounded-lg text-[11px] font-bold text-center flex items-center justify-center gap-1 leading-tight transition active:scale-95 bg-gray-100 text-gray-600 truncate"
            >
              {p.isKeeper && focusedPosition === 'keeper' && <Hand size={11} className="text-blue-500 shrink-0" />}
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
