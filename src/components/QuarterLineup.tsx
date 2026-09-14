import React, { useState, useEffect } from 'react';
import { Hand, Clock } from 'lucide-react';
import type { Player, Quarter, FieldPosition, Game } from '../types';
import { formatMinute, getQuarterMinute } from '../utils/matchTime';

interface Props {
  quarter: Quarter;
  presentPlayers: Player[];
  currentGame: Game;
  onUpdateQuarter: (updates: Partial<Quarter>) => void;
  onCancel: () => void;
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

export const QuarterLineup: React.FC<Props> = ({ quarter, presentPlayers, currentGame, onUpdateQuarter, onCancel }) => {
  const [focusedPosition, setFocusedPosition] = useState<FieldPosition>(() =>
    computeInitialFocus(quarter.lineup || {})
  );

  // Live minuutklok: elke seconde een re-render forceren zodat de score-header hierboven
  // (net als bij het invoeren van events) de verstreken tijd blijft bijwerken.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentMinute = (): number => getQuarterMinute(quarter);

  const totalOurGoals = currentGame.quarters.reduce((sum, q) => sum + (q.goalEvents?.length || 0), 0);
  const totalOpponentGoals = currentGame.quarters.reduce((sum, q) => sum + (q.opponentGoalEvents?.length || 0), 0);
  const leftName = currentGame.isAway ? (currentGame.opponent || 'Tegenstander') : 'Kaulille';
  const leftScore = currentGame.isAway ? totalOpponentGoals : totalOurGoals;
  const rightName = currentGame.isAway ? 'Kaulille' : (currentGame.opponent || 'Tegenstander');
  const rightScore = currentGame.isAway ? totalOurGoals : totalOpponentGoals;

  // Was de opstelling al volledig toen dit scherm geopend werd? Dan zit je hier via "Opstelling
  // wijzigen" (bewerken), en tonen we een Annuleren-knop om terug te gaan zonder verder te wijzigen.
  // Bij de allereerste, nog onvolledige opstelling van een kwart is er niets om naar terug te keren.
  const [canCancel] = useState<boolean>(() =>
    POSITION_ORDER.every(pos => (quarter.lineup || {})[pos] != null)
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

  // Zodra alle 8 posities een speler hebben, leiden we meteen de wisselspelers af — maar we
  // schakelen niet automatisch door naar het volgende scherm: dat gebeurt pas als de gebruiker
  // expliciet op de sticky "Bevestigen"-knop tikt (zie LiveMatch.tsx).
  const applyLineupUpdate = (newLineup: Partial<Record<FieldPosition, number>>) => {
    const allFilled = POSITION_ORDER.every(pos => newLineup[pos] != null);
    if (!allFilled) {
      onUpdateQuarter({ lineup: newLineup });
      return;
    }
    const assignedIds = new Set(Object.values(newLineup) as number[]);
    const substitutes = sortedPresentPlayers.filter(p => !assignedIds.has(p.id)).map(p => p.id);
    onUpdateQuarter({ lineup: newLineup, substitutes });
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

    applyLineupUpdate(newLineup);
    setFocusedPosition(nextFocus(focusedPosition));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* ALGEMENE SCORE BOVENAAN (THUIS/UIT DYNAMISCH) — enkel bij het wijzigen van een reeds
          bevestigde opstelling tijdens een lopend kwart, net als bij het invoeren van events.
          Bij de allereerste, nog lege opstelling van een kwart is er nog geen kwart aan de gang
          (de klok start pas als de opstelling bevestigd wordt), dus tonen we hier niets. */}
      {canCancel && (
        <div className="bg-[#04174C] text-white rounded-2xl p-4 shadow-lg flex items-center justify-between px-8 relative">
          <div className="text-center flex-1">
            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest truncate max-w-[100px] mx-auto">
              {leftName}
            </p>
            <p className="text-3xl font-black tabular-nums">{leftScore}</p>
          </div>
          <div className="text-xl font-black opacity-20 px-4">-</div>
          <div className="text-center flex-1">
            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest truncate max-w-[100px] mx-auto">
              {rightName}
            </p>
            <p className="text-3xl font-black tabular-nums">{rightScore}</p>
          </div>
          <div className="absolute -top-2 -right-2 bg-white text-[#04174C] rounded-full px-2.5 py-1 shadow-md flex items-center gap-1 text-[10px] font-black">
            <Clock size={11} /> {formatMinute(getCurrentMinute())}
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#04174C]/20">
        {/* ANNULEREN (rechtsboven, consistent met de andere stappen) — enkel zichtbaar als je
            hier via "Opstelling wijzigen" zit, niet bij de allereerste, nog lege opstelling. */}
        {canCancel && (
          <div className="flex justify-end mb-2">
            <button onClick={onCancel} className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
              Annuleren
            </button>
          </div>
        )}

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
                    ? '-translate-y-8'
                    : pos === 'aanvaller_links' || pos === 'aanvaller_rechts'
                    ? 'translate-y-8'
                    : '';
                return (
                  <button
                    key={pos}
                    onClick={() => handleSlotTap(pos)}
                    className={`w-20 h-11 rounded-xl border-2 flex flex-col items-center justify-center text-center px-1 transition-all active:scale-95 ${wingOffset} ${
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
