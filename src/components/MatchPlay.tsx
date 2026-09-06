import React, { useState, useEffect } from 'react';
import { Shield, Target, Axe, RefreshCw, ArrowUpCircle, X as CloseIcon, Goal, Clock } from 'lucide-react';
import type { Player, Quarter, Game, FieldPosition } from '../types';

interface Props {
  quarter: Quarter;
  activeQuarterIdx: number;
  presentPlayers: Player[];
  currentGame: Game;
  onUpdateQuarter: (updates: Partial<Quarter>) => void;
  handleButtonClick: (action: () => void) => void;
  handlePressStart: (action: () => void) => void;
  handlePressEnd: () => void;
  viewMode: 'list' | 'quick';
}

type QuickStep = 'menu' | 'select-scorer' | 'select-assist' | 'select-tackler' | 'select-outgoing';

export const MatchPlay: React.FC<Props> = ({
  quarter, activeQuarterIdx, presentPlayers, currentGame, onUpdateQuarter,
  handleButtonClick, handlePressStart, handlePressEnd, viewMode
}) => {
  const [wisselTarget, setWisselTarget] = useState<number | null>(null);
  const [quickStep, setQuickStep] = useState<QuickStep>('menu');
  const [pendingScorerId, setPendingScorerId] = useState<number | null>(null);

  // Reset de "Snel invoeren"-flow bij het wisselen van kwart of weergave
  useEffect(() => {
    setQuickStep('menu');
    setPendingScorerId(null);
  }, [activeQuarterIdx, viewMode]);

  // Live minuutklok: elke seconde een re-render forceren zodat de verstreken tijd zichtbaar
  // blijft meetellen, en elk event dat toegevoegd wordt de juiste minuut krijgt.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentMinute = (): number => {
    if (!quarter.startedAt) return 1;
    const elapsedMs = Date.now() - new Date(quarter.startedAt).getTime();
    return Math.max(1, Math.floor(elapsedMs / 60000) + 1);
  };

  const substitutes = quarter.substitutes || [];
  const substitutions = quarter.substitutions || [];

  const sortedPresentPlayers = [...presentPlayers].sort((a, b) => a.name.localeCompare(b.name));
  const activeOnField = sortedPresentPlayers.filter(p => !substitutes.includes(p.id));

  const getName = (id?: number | null) => (id != null ? presentPlayers.find(p => p.id === id)?.name || 'Onbekend' : 'Onbekend');

  // Voert een wissel door: de invaller neemt de positie over van de speler die het veld verlaat,
  // zodat de opstelling na een wissel meteen weer klopt.
  const substitutePlayer = (outId: number, inId: number) => {
    const newSubs = substitutes.filter((id: number) => id !== inId);
    newSubs.push(outId);
    const newSubstitutions = [...substitutions, { outId, inId, minute: getCurrentMinute() }];

    const lineup = quarter.lineup || {};
    const vacatedPosition = (Object.keys(lineup) as FieldPosition[]).find(pos => lineup[pos] === outId);
    const newLineup = vacatedPosition ? { ...lineup, [vacatedPosition]: inId } : lineup;

    onUpdateQuarter({
      substitutes: newSubs,
      substitutions: newSubstitutions,
      lineup: newLineup
    });
  };

  // Voegt een nieuw doelpunt toe, met een snapshot van wie er op dat moment op het veld stond
  // en de minuut waarop het gebeurde.
  const addGoal = (scorerId: number, assistId: number | null) => {
    onUpdateQuarter({
      goalEvents: [...quarter.goalEvents, { scorerId, assistId, playersOnField: activeOnField.map(p => p.id), minute: getCurrentMinute() }]
    });
  };

  const undoLastQuickGoal = () => {
    if (quarter.goalEvents.length === 0) return;
    onUpdateQuarter({ goalEvents: quarter.goalEvents.slice(0, -1) });
  };

  const undoLastQuickTackle = () => {
    if ((quarter.tackleEvents || []).length === 0) return;
    onUpdateQuarter({ tackleEvents: quarter.tackleEvents.slice(0, -1) });
  };

  const undoLastQuickSave = () => {
    if ((quarter.saveEvents || []).length === 0) return;
    onUpdateQuarter({ saveEvents: quarter.saveEvents.slice(0, -1) });
  };

  const undoLastQuickOpponentGoal = () => {
    if ((quarter.opponentGoalEvents || []).length === 0) return;
    onUpdateQuarter({ opponentGoalEvents: quarter.opponentGoalEvents.slice(0, -1) });
  };

  // Bereken totale score over alle kwarten
  const totalOurGoals = currentGame.quarters.reduce((sum, q) => sum + (q.goalEvents?.length || 0), 0);
  const totalOpponentGoals = currentGame.quarters.reduce((sum, q) => sum + (q.opponentGoalEvents?.length || 0), 0);

  // Dynamische indeling op basis van Thuis/Uit
  const leftName = currentGame.isAway ? (currentGame.opponent || 'Tegenstander') : 'Kaulille';
  const leftScore = currentGame.isAway ? totalOpponentGoals : totalOurGoals;
  const rightName = currentGame.isAway ? 'Kaulille' : (currentGame.opponent || 'Tegenstander');
  const rightScore = currentGame.isAway ? totalOurGoals : totalOpponentGoals;

  // Chronologische lijst van alle events dit kwart (voor de lijstweergave, enkel ter info).
  type TimelineEntry = { minute: number; icon: React.ReactNode; text: React.ReactNode; key: string };
  const timeline: TimelineEntry[] = [
    ...quarter.goalEvents.map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `goal-${i}`,
      icon: <Goal size={14} className="text-yellow-600 shrink-0" />,
      text: (
        <>Goal <b>{getName(e.scorerId)}</b>{e.assistId != null && <span className="text-gray-400 font-normal"> (Assist: {getName(e.assistId)})</span>}</>
      ),
    })),
    ...(quarter.tackleEvents || []).map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `tackle-${i}`,
      icon: <Axe size={14} className="text-blue-600 shrink-0" />,
      text: <>Tackle <b>{getName(e.playerId)}</b></>,
    })),
    ...(quarter.saveEvents || []).map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `save-${i}`,
      icon: <Shield size={14} className="text-emerald-600 shrink-0" />,
      text: <>Redding <b>{getName(e.playerId)}</b></>,
    })),
    ...(quarter.opponentGoalEvents || []).map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `opp-${i}`,
      icon: <Target size={14} className="text-red-600 shrink-0" />,
      text: 'Tegendoelpunt',
    })),
    ...substitutions.map((s, i): TimelineEntry => ({
      minute: s.minute ?? 0,
      key: `sub-${i}`,
      icon: <RefreshCw size={14} className="text-gray-500 shrink-0" />,
      text: <>Wissel: <b>{getName(s.outId)}</b> uit - <b>{getName(s.inId)}</b> in</>,
    })),
  ].sort((a, b) => a.minute - b.minute);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* ALGEMENE SCORE BOVENAAN (THUIS/UIT DYNAMISCH) */}
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
          <Clock size={11} /> {getCurrentMinute()}'
        </div>
      </div>

      {/* MODAL / OVERLAY VOOR WISSEL SELECTIE */}
      {wisselTarget !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={() => setWisselTarget(null)}>
          <div
            className="bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 space-y-5 border border-gray-100"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h4 className="font-black text-[#04174C] text-sm uppercase tracking-wider">Speler wisselen</h4>
              </div>
              <button onClick={() => setWisselTarget(null)} className="p-2 bg-gray-50 rounded-full text-gray-400">
                <CloseIcon size={20}/>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Wie komt erin?</p>
              <div className="grid grid-cols-2 gap-2">
                {sortedPresentPlayers
                  .filter(p => substitutes.includes(p.id))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        substitutePlayer(wisselTarget, p.id);
                        setWisselTarget(null);
                      }}
                      className="py-3 px-2 bg-green-50 border border-green-100 rounded-xl text-xs font-black text-green-700 hover:bg-green-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowUpCircle size={14} />
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>

            <button
              onClick={() => setWisselTarget(null)}
              className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* LIJSTWEERGAVE: chronologisch overzicht van alles wat dit kwart gebeurd is (enkel ter info,
          invoer gebeurt via Snel invoeren) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {timeline.length === 0 ? (
            <p className="text-center text-gray-400 text-xs italic py-8">Nog geen events dit kwart.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {timeline.map(item => (
                <div key={item.key} className="flex items-center gap-3 py-2.5 px-3">
                  <span className="w-7 text-right text-[11px] font-black text-gray-400 tabular-nums shrink-0">{item.minute}'</span>
                  {item.icon}
                  <span className="text-xs font-bold text-[#04174C] flex-1">{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SNEL INVOEREN: 4 grote actieknoppen (enige manier om events toe te voegen) */}
      {viewMode === 'quick' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          {quickStep === 'menu' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleButtonClick(() => setQuickStep('select-scorer'))}
                onTouchStart={() => handlePressStart(undoLastQuickGoal)}
                onTouchEnd={handlePressEnd}
                className="h-28 rounded-2xl bg-yellow-50 border-2 border-yellow-100 text-yellow-700 flex flex-col items-center justify-center gap-1 font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all"
              >
                <Goal size={24} />
                <span className="text-2xl leading-none">{quarter.goalEvents.length}</span>
                <span className="text-[10px]">Doelpunt</span>
              </button>
              <button
                onClick={() => handleButtonClick(() => onUpdateQuarter({ opponentGoalEvents: [...(quarter.opponentGoalEvents || []), { minute: getCurrentMinute() }] }))}
                onTouchStart={() => handlePressStart(undoLastQuickOpponentGoal)}
                onTouchEnd={handlePressEnd}
                className="h-28 rounded-2xl bg-red-50 border-2 border-red-100 text-red-700 flex flex-col items-center justify-center gap-1 font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all"
              >
                <Target size={24} />
                <span className="text-2xl leading-none">{(quarter.opponentGoalEvents || []).length}</span>
                <span className="text-[10px]">Tegendoelpunt</span>
              </button>
              <button
                onClick={() => handleButtonClick(() => setQuickStep('select-tackler'))}
                onTouchStart={() => handlePressStart(undoLastQuickTackle)}
                onTouchEnd={handlePressEnd}
                className="h-28 rounded-2xl bg-blue-50 border-2 border-blue-100 text-blue-700 flex flex-col items-center justify-center gap-1 font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all"
              >
                <Axe size={24} />
                <span className="text-2xl leading-none">{(quarter.tackleEvents || []).length}</span>
                <span className="text-[10px]">Tackle</span>
              </button>
              <button
                onClick={() => handleButtonClick(() => onUpdateQuarter({
                  saveEvents: [...(quarter.saveEvents || []), { playerId: quarter.lineup?.keeper ?? 0, minute: getCurrentMinute() }]
                }))}
                onTouchStart={() => handlePressStart(undoLastQuickSave)}
                onTouchEnd={handlePressEnd}
                className="h-28 rounded-2xl bg-emerald-50 border-2 border-emerald-100 text-emerald-700 flex flex-col items-center justify-center gap-1 font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all"
              >
                <Shield size={24} />
                <span className="text-2xl leading-none">{(quarter.saveEvents || []).length}</span>
                <span className="text-[10px]">Redding</span>
              </button>
            </div>
          )}

          {/* WISSEL-KNOP ONDER DE TEGELS */}
          {quickStep === 'menu' && (
            <button
              onClick={() => setQuickStep('select-outgoing')}
              className="w-full mt-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw size={14} /> Wissel
            </button>
          )}

          {quickStep === 'select-outgoing' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-[#04174C] text-xs uppercase tracking-widest">Wie gaat eraf?</h4>
                <button onClick={() => setQuickStep('menu')} className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setWisselTarget(p.id); setQuickStep('menu'); }}
                    className="h-20 px-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickStep === 'select-scorer' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-[#04174C] text-xs uppercase tracking-widest">Wie scoorde?</h4>
                <button onClick={() => setQuickStep('menu')} className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPendingScorerId(p.id); setQuickStep('select-assist'); }}
                    className="h-20 px-2 rounded-xl bg-green-50 border border-green-100 text-green-800 font-bold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickStep === 'select-assist' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-[#04174C] text-xs uppercase tracking-widest">Wie gaf de assist?</h4>
                <button onClick={() => { setPendingScorerId(null); setQuickStep('menu'); }} className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (pendingScorerId !== null) {
                        addGoal(pendingScorerId, p.id);
                      }
                      setPendingScorerId(null);
                      setQuickStep('menu');
                    }}
                    className="h-20 px-2 rounded-xl bg-yellow-50 border border-yellow-100 text-yellow-800 font-bold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (pendingScorerId !== null) {
                      addGoal(pendingScorerId, null);
                    }
                    setPendingScorerId(null);
                    setQuickStep('menu');
                  }}
                  className="h-20 px-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                >
                  Niemand
                </button>
              </div>
            </div>
          )}

          {quickStep === 'select-tackler' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-[#04174C] text-xs uppercase tracking-widest">Wie deed de tackle?</h4>
                <button onClick={() => setQuickStep('menu')} className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onUpdateQuarter({ tackleEvents: [...(quarter.tackleEvents || []), { playerId: p.id, minute: getCurrentMinute() }] });
                      setQuickStep('menu');
                    }}
                    className="h-20 px-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
