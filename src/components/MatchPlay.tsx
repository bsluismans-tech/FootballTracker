import React, { useState, useEffect } from 'react';
import { Shield, Target, Axe, RefreshCw, ArrowUpCircle, X as CloseIcon, Goal, Clock, Trash2, Triangle, ListChecks, Bandage } from 'lucide-react';
import type { Player, Quarter, Game, FieldPosition, GoalType } from '../types';
import { formatMinute, getQuarterMinute } from '../utils/matchTime';
import { GOAL_TYPES, GOAL_TYPE_LABELS } from '../utils/goalTypes';

interface Props {
  quarter: Quarter;
  activeQuarterIdx: number;
  presentPlayers: Player[];
  currentGame: Game;
  onUpdateQuarter: (updates: Partial<Quarter>) => void;
  handleButtonClick: (action: () => void) => void;
  handlePressStart: (action: () => void) => void;
  handlePressEnd: () => void;
  onEditLineup: () => void;
  viewMode: 'list' | 'quick';
}

type QuickStep = 'menu' | 'select-scorer' | 'select-assist' | 'select-goal-type' | 'select-opponent-goal-type' | 'select-tackler' | 'select-outgoing' | 'select-injured' | 'injury-followup';
type EventType = 'goal' | 'tackle' | 'save' | 'opponentGoal' | 'substitution' | 'injury';

export const MatchPlay: React.FC<Props> = ({
  quarter, activeQuarterIdx, presentPlayers, currentGame, onUpdateQuarter,
  handleButtonClick, handlePressStart, handlePressEnd, onEditLineup, viewMode
}) => {
  const [wisselTarget, setWisselTarget] = useState<number | null>(null);
  const [quickStep, setQuickStep] = useState<QuickStep>('menu');
  const [pendingScorerId, setPendingScorerId] = useState<number | null>(null);
  // Scorer + assist van het doelpunt dat aan het invoeren is, terwijl we nog vragen hoe het
  // doelpunt tot stand kwam.
  const [pendingGoal, setPendingGoal] = useState<{ scorerId: number; assistId: number | null } | null>(null);
  // Welke speler net als geblesseerd gemeld is, terwijl we vragen of die gewisseld wordt.
  const [pendingInjuredId, setPendingInjuredId] = useState<number | null>(null);
  // Welk event uit de chronologische lijst de gebruiker wil verwijderen (met bevestiging).
  const [deleteTarget, setDeleteTarget] = useState<{ type: EventType; index: number; label: string } | null>(null);

  // Reset de "Snel invoeren"-flow bij het wisselen van kwart of weergave
  useEffect(() => {
    setQuickStep('menu');
    setPendingScorerId(null);
    setPendingGoal(null);
    setPendingInjuredId(null);
  }, [activeQuarterIdx, viewMode]);

  // Live minuutklok: elke seconde een re-render forceren zodat de verstreken tijd zichtbaar
  // blijft meetellen, en elk event dat toegevoegd wordt de juiste minuut krijgt.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentMinute = (): number => getQuarterMinute(quarter);

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

  // Voegt een nieuw doelpunt toe, met een snapshot van wie er op dat moment op het veld stond,
  // de minuut waarop het gebeurde, en hoe het doelpunt tot stand kwam.
  const addGoal = (scorerId: number | null, assistId: number | null, goalType: GoalType) => {
    onUpdateQuarter({
      goalEvents: [...quarter.goalEvents, { scorerId, assistId, playersOnField: activeOnField.map(p => p.id), minute: getCurrentMinute(), goalType }]
    });
  };

  // Meldt een blessure. Los daarvan wordt (indien nodig) een aparte wissel doorgevoerd via de
  // bestaande wissel-modal — een blessure zelf verandert dus niets aan opstelling/wisselspelers.
  const addInjury = (playerId: number) => {
    onUpdateQuarter({
      injuryEvents: [...(quarter.injuryEvents || []), { playerId, minute: getCurrentMinute() }]
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

  // Chronologische lijst van alle events dit kwart (lijstweergave). type+index verwijzen naar
  // de plek in de eigen array van dat event, zodat verwijderen precies dat event treft.
  type TimelineEntry = { minute: number; icon: React.ReactNode; text: React.ReactNode; label: string; type: EventType; index: number; key: string };
  const timeline: TimelineEntry[] = [
    ...quarter.goalEvents.map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `goal-${i}`,
      type: 'goal',
      index: i,
      icon: <Goal size={14} className="text-volt-ink shrink-0" />,
      text: e.scorerId == null ? (
        <>Goal — <b>Eigen doelpunt tegenstander</b></>
      ) : (
        <>
          Goal <b>{getName(e.scorerId)}</b>
          {e.assistId != null && <span className="text-gray-500 font-normal"> (Assist: {getName(e.assistId)})</span>}
          {e.goalType && <span className="text-gray-500 font-normal"> — {GOAL_TYPE_LABELS[e.goalType]}</span>}
        </>
      ),
      label: e.scorerId == null
        ? 'Goal — Eigen doelpunt tegenstander'
        : `Goal ${getName(e.scorerId)}${e.assistId != null ? ` (Assist: ${getName(e.assistId)})` : ''}${e.goalType ? ` — ${GOAL_TYPE_LABELS[e.goalType]}` : ''}`,
    })),
    ...(quarter.tackleEvents || []).map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `tackle-${i}`,
      type: 'tackle',
      index: i,
      icon: <Axe size={14} className="text-navy/50 shrink-0" />,
      text: <>Tackle <b>{getName(e.playerId)}</b></>,
      label: `Tackle ${getName(e.playerId)}`,
    })),
    ...(quarter.saveEvents || []).map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `save-${i}`,
      type: 'save',
      index: i,
      icon: <Shield size={14} className="text-navy/50 shrink-0" />,
      text: <>Redding <b>{getName(e.playerId)}</b></>,
      label: `Redding ${getName(e.playerId)}`,
    })),
    ...(quarter.opponentGoalEvents || []).map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `opp-${i}`,
      type: 'opponentGoal',
      index: i,
      icon: <Target size={14} className="text-red-600 shrink-0" />,
      text: <>Tegendoelpunt{e.goalType && <span className="text-gray-500 font-normal"> — {GOAL_TYPE_LABELS[e.goalType]}</span>}</>,
      label: `Tegendoelpunt${e.goalType ? ` — ${GOAL_TYPE_LABELS[e.goalType]}` : ''}`,
    })),
    ...(quarter.injuryEvents || []).map((e, i): TimelineEntry => ({
      minute: e.minute ?? 0,
      key: `injury-${i}`,
      type: 'injury',
      index: i,
      icon: <Bandage size={14} className="text-orange-600 shrink-0" />,
      text: <>Blessure <b>{getName(e.playerId)}</b></>,
      label: `Blessure ${getName(e.playerId)}`,
    })),
    ...substitutions.map((s, i): TimelineEntry => ({
      minute: s.minute ?? 0,
      key: `sub-${i}`,
      type: 'substitution',
      index: i,
      icon: <RefreshCw size={14} className="text-gray-500 shrink-0" />,
      text: (
        <>
          Wissel:{' '}
          <Triangle size={9} className="inline rotate-180 fill-red-500 text-red-500 -translate-y-0.4" /> <b>{getName(s.outId)}</b> -{' '}
          <Triangle size={9} className="inline fill-volt-ink text-volt-ink -translate-y-0.4" /> <b>{getName(s.inId)}</b>
        </>
      ),
      label: `Wissel: ${getName(s.outId)} uit - ${getName(s.inId)} in`,
    })),
  ].sort((a, b) => a.minute - b.minute);

  // Verwijdert één specifiek event (na bevestiging) uit de bijhorende array.
  const deleteEvent = (type: EventType, index: number) => {
    switch (type) {
      case 'goal':
        onUpdateQuarter({ goalEvents: quarter.goalEvents.filter((_, i) => i !== index) });
        break;
      case 'tackle':
        onUpdateQuarter({ tackleEvents: quarter.tackleEvents.filter((_, i) => i !== index) });
        break;
      case 'save':
        onUpdateQuarter({ saveEvents: quarter.saveEvents.filter((_, i) => i !== index) });
        break;
      case 'opponentGoal':
        onUpdateQuarter({ opponentGoalEvents: quarter.opponentGoalEvents.filter((_, i) => i !== index) });
        break;
      case 'injury':
        onUpdateQuarter({ injuryEvents: (quarter.injuryEvents || []).filter((_, i) => i !== index) });
        break;
      case 'substitution': {
        // Wissel ongedaan maken: invaller terug naar de bank, uitgaande speler terug op het veld,
        // en de positie die de invaller had overgenomen teruggeven aan de oorspronkelijke speler
        // — zodat de opstelling/wisselspelers weer exact kloppen alsof de wissel nooit gebeurde.
        // (Bij latere, opeenvolgende wissels met dezelfde spelers is dit best-effort.)
        const sub = substitutions[index];
        const newSubstitutions = substitutions.filter((_, i) => i !== index);

        const newSubs = substitutes.filter((id: number) => id !== sub.outId);
        if (!newSubs.includes(sub.inId)) newSubs.push(sub.inId);

        const lineup = quarter.lineup || {};
        const takenOverPosition = (Object.keys(lineup) as FieldPosition[]).find(pos => lineup[pos] === sub.inId);
        const newLineup = takenOverPosition ? { ...lineup, [takenOverPosition]: sub.outId } : lineup;

        onUpdateQuarter({ substitutions: newSubstitutions, substitutes: newSubs, lineup: newLineup });
        break;
      }
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* ALGEMENE SCORE BOVENAAN (THUIS/UIT DYNAMISCH) */}
      <div className="bg-navy text-white rounded-2xl p-4 shadow-lg flex items-center justify-between px-4 relative">
        <div className="text-center flex-1">
          <p className="text-sm font-medium text-white/60 truncate max-w-[100px] mx-auto">
            {leftName}
          </p>
          <p className="font-display text-5xl font-bold leading-none tabular-nums">{leftScore}</p>
        </div>
        {/* Lopende minuut centraal tussen de scores, zoals op het scorebord van het startscherm */}
        <div className="shrink-0 px-2 bg-volt text-navy rounded-md py-1 flex items-center gap-1 font-display text-lg font-bold tabular-nums leading-none">
          <Clock size={14} /> {formatMinute(getCurrentMinute())}
        </div>
        <div className="text-center flex-1">
          <p className="text-sm font-medium text-white/60 truncate max-w-[100px] mx-auto">
            {rightName}
          </p>
          <p className="font-display text-5xl font-bold leading-none tabular-nums">{rightScore}</p>
        </div>
      </div>

      {/* MODAL / OVERLAY VOOR WISSEL SELECTIE */}
      {wisselTarget !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={() => setWisselTarget(null)}>
          <div
            className="bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 space-y-5 ring-1 ring-navy/5"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h4 className="font-semibold text-navy text-base">Speler wisselen</h4>
              </div>
              <button onClick={() => setWisselTarget(null)} className="p-2.5 bg-gray-100 rounded-full text-gray-500">
                <CloseIcon size={20}/>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500 font-medium mb-3">Wie komt erin?</p>
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
                      className="min-h-14 py-3 px-2 bg-volt-soft ring-1 ring-volt rounded-xl text-sm font-semibold text-navy hover:bg-volt active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowUpCircle size={16} className="text-volt-ink shrink-0" />
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>

            <button
              onClick={() => setWisselTarget(null)}
              className="w-full py-3.5 bg-gray-100 text-navy rounded-xl font-semibold text-sm"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* LIJSTWEERGAVE: chronologisch overzicht van alles wat dit kwart gebeurd is (enkel ter info,
          invoer gebeurt via Snel invoeren) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl ring-1 ring-navy/5 shadow-sm overflow-hidden">
          {timeline.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">Nog geen events dit kwart.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {timeline.map(item => (
                <div key={item.key} className="flex items-center gap-3 py-2 px-3">
                  <span className="w-11 text-right font-display text-base font-semibold leading-none text-gray-500 tabular-nums shrink-0">{formatMinute(item.minute)}</span>
                  {item.icon}
                  <span className="text-sm font-medium text-navy flex-1">{item.text}</span>
                  <button
                    onClick={() => setDeleteTarget({ type: item.type, index: item.index, label: item.label })}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2.5 -my-1 shrink-0"
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BEVESTIGING VOOR HET VERWIJDEREN VAN EEN EVENT */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={() => setDeleteTarget(null)}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center" onMouseDown={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-semibold text-navy mb-2">Event verwijderen?</h3>
            <p className="text-sm text-gray-500 mb-6">"{deleteTarget.label}" wordt verwijderd. Deze actie kan niet ongedaan worden gemaakt.</p>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl font-semibold text-navy bg-gray-100" onClick={() => setDeleteTarget(null)}>Nee</button>
              <button
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-100"
                onClick={() => {
                  deleteEvent(deleteTarget.type, deleteTarget.index);
                  setDeleteTarget(null);
                }}
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SNEL INVOEREN: 4 grote actieknoppen (enige manier om events toe te voegen) */}
      {viewMode === 'quick' && (
        <div className="bg-white rounded-2xl ring-1 ring-navy/5 shadow-sm p-4">
          {quickStep === 'menu' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleButtonClick(() => setQuickStep('select-scorer'))}
                onTouchStart={() => handlePressStart(undoLastQuickGoal)}
                onTouchEnd={handlePressEnd}
                className="h-28 rounded-2xl bg-volt text-navy flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Goal size={24} />
                <span className="font-display text-4xl font-bold leading-none tabular-nums">{quarter.goalEvents.length}</span>
                <span className="text-sm font-semibold">Doelpunt</span>
              </button>
              <button
                onClick={() => handleButtonClick(() => setQuickStep('select-opponent-goal-type'))}
                onTouchStart={() => handlePressStart(undoLastQuickOpponentGoal)}
                onTouchEnd={handlePressEnd}
                className="h-28 rounded-2xl bg-red-50 ring-2 ring-red-200 text-red-700 flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Target size={24} />
                <span className="font-display text-4xl font-bold leading-none tabular-nums">{(quarter.opponentGoalEvents || []).length}</span>
                <span className="text-sm font-semibold">Tegendoelpunt</span>
              </button>
              <button
                onClick={() => handleButtonClick(() => setQuickStep('select-tackler'))}
                onTouchStart={() => handlePressStart(undoLastQuickTackle)}
                onTouchEnd={handlePressEnd}
                className="h-28 rounded-2xl bg-navy/5 ring-1 ring-navy/10 text-navy flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Axe size={24} />
                <span className="font-display text-4xl font-bold leading-none tabular-nums">{(quarter.tackleEvents || []).length}</span>
                <span className="text-sm font-semibold">Tackle</span>
              </button>
              <button
                onClick={() => handleButtonClick(() => onUpdateQuarter({
                  saveEvents: [...(quarter.saveEvents || []), { playerId: quarter.lineup?.keeper ?? 0, minute: getCurrentMinute() }]
                }))}
                onTouchStart={() => handlePressStart(undoLastQuickSave)}
                onTouchEnd={handlePressEnd}
                className="h-28 rounded-2xl bg-navy/5 ring-1 ring-navy/10 text-navy flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Shield size={24} />
                <span className="font-display text-4xl font-bold leading-none tabular-nums">{(quarter.saveEvents || []).length}</span>
                <span className="text-sm font-semibold">Redding</span>
              </button>
              <button
                onClick={() => setQuickStep('select-injured')}
                className="h-28 rounded-2xl bg-orange-50 ring-1 ring-orange-200 text-orange-800 flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Bandage size={24} />
                <span className="font-display text-4xl font-bold leading-none tabular-nums">{(quarter.injuryEvents || []).length}</span>
                <span className="text-sm font-semibold">Blessure</span>
              </button>
              <button
                onClick={() => setQuickStep('select-outgoing')}
                className="h-28 rounded-2xl bg-gray-100 ring-1 ring-gray-200 text-navy flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <RefreshCw size={24} />
                <span className="font-display text-4xl font-bold leading-none tabular-nums">{substitutions.length}</span>
                <span className="text-sm font-semibold">Wissel</span>
              </button>
            </div>
          )}

          {quickStep === 'menu' && (
            <button
              onClick={onEditLineup}
              className="w-full mt-3 py-3.5 rounded-xl bg-white ring-1 ring-navy/15 text-navy font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <ListChecks size={16} /> Opstelling wijzigen
            </button>
          )}

          {quickStep === 'select-outgoing' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-navy text-base">Wie gaat eraf?</h4>
                <button onClick={() => setQuickStep('menu')} className="text-gray-500 text-sm font-semibold px-2 py-2.5 -my-2 -me-2">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setWisselTarget(p.id); setQuickStep('menu'); }}
                    className="h-20 px-2 rounded-xl bg-gray-100 text-navy font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
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
                <h4 className="font-semibold text-navy text-base">Wie scoorde?</h4>
                <button onClick={() => setQuickStep('menu')} className="text-gray-500 text-sm font-semibold px-2 py-2.5 -my-2 -me-2">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPendingScorerId(p.id); setQuickStep('select-assist'); }}
                    className="h-20 px-2 rounded-xl bg-volt-soft ring-1 ring-volt text-navy font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
                {/* Eigen doelpunt van de tegenstander: telt mee voor onze score, maar heeft
                    geen doelpuntenmaker/assist uit onze ploeg — dus scorer/assist overslaan. */}
                <button
                  onClick={() => {
                    addGoal(null, null, 'owngoal');
                    setQuickStep('menu');
                  }}
                  className="h-20 px-2 rounded-xl bg-white ring-1 ring-gray-300 text-gray-600 font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                >
                  Eigen doelpunt
                </button>
              </div>
            </div>
          )}

          {quickStep === 'select-assist' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-navy text-base">Wie gaf de assist?</h4>
                <button onClick={() => { setPendingScorerId(null); setQuickStep('menu'); }} className="text-gray-500 text-sm font-semibold px-2 py-2.5 -my-2 -me-2">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (pendingScorerId !== null) {
                        setPendingGoal({ scorerId: pendingScorerId, assistId: p.id });
                        setQuickStep('select-goal-type');
                      }
                      setPendingScorerId(null);
                    }}
                    className="h-20 px-2 rounded-xl bg-volt-soft ring-1 ring-volt text-navy font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (pendingScorerId !== null) {
                      setPendingGoal({ scorerId: pendingScorerId, assistId: null });
                      setQuickStep('select-goal-type');
                    }
                    setPendingScorerId(null);
                  }}
                  className="h-20 px-2 rounded-xl bg-white ring-1 ring-gray-300 text-gray-600 font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                >
                  Niemand
                </button>
              </div>
            </div>
          )}

          {quickStep === 'select-goal-type' && pendingGoal !== null && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-navy text-base">Hoe werd het doelpunt gemaakt?</h4>
                <button onClick={() => { setPendingGoal(null); setQuickStep('menu'); }} className="text-gray-500 text-sm font-semibold px-2 py-2.5 -my-2 -me-2">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      addGoal(pendingGoal.scorerId, pendingGoal.assistId, value);
                      setPendingGoal(null);
                      setQuickStep('menu');
                    }}
                    className="h-16 px-2 rounded-xl bg-volt-soft ring-1 ring-volt text-navy font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickStep === 'select-opponent-goal-type' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-navy text-base">Hoe scoorde de tegenstander?</h4>
                <button onClick={() => setQuickStep('menu')} className="text-gray-500 text-sm font-semibold px-2 py-2.5 -my-2 -me-2">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      onUpdateQuarter({
                        opponentGoalEvents: [...(quarter.opponentGoalEvents || []), { minute: getCurrentMinute(), goalType: value }]
                      });
                      setQuickStep('menu');
                    }}
                    className="h-16 px-2 rounded-xl bg-red-50 ring-1 ring-red-200 text-red-800 font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickStep === 'select-tackler' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-navy text-base">Wie deed de tackle?</h4>
                <button onClick={() => setQuickStep('menu')} className="text-gray-500 text-sm font-semibold px-2 py-2.5 -my-2 -me-2">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onUpdateQuarter({ tackleEvents: [...(quarter.tackleEvents || []), { playerId: p.id, minute: getCurrentMinute() }] });
                      setQuickStep('menu');
                    }}
                    className="h-20 px-2 rounded-xl bg-navy/5 ring-1 ring-navy/10 text-navy font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickStep === 'select-injured' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-navy text-base">Wie is geblesseerd?</h4>
                <button onClick={() => setQuickStep('menu')} className="text-gray-500 text-sm font-semibold px-2 py-2.5 -my-2 -me-2">Annuleren</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeOnField.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      addInjury(p.id);
                      setPendingInjuredId(p.id);
                      setQuickStep('injury-followup');
                    }}
                    className="h-20 px-2 rounded-xl bg-orange-50 ring-1 ring-orange-200 text-orange-900 font-semibold text-sm flex items-center justify-center text-center leading-tight active:scale-95 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickStep === 'injury-followup' && pendingInjuredId !== null && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-navy text-base">
                  Wordt {getName(pendingInjuredId)} gewisseld?
                </h4>
                <button
                  onClick={() => {
                    // Annuleren maakt het hele blessure-event ongedaan (niet enkel de wisselvraag) —
                    // dat werd net toegevoegd als laatste item, dus die verwijderen we weer.
                    onUpdateQuarter({ injuryEvents: (quarter.injuryEvents || []).slice(0, -1) });
                    setPendingInjuredId(null);
                    setQuickStep('menu');
                  }}
                  className="text-gray-500 text-sm font-semibold px-2 py-2.5 -my-2 -me-2 shrink-0"
                >
                  Annuleren
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setWisselTarget(pendingInjuredId);
                    setPendingInjuredId(null);
                    setQuickStep('menu');
                  }}
                  className="h-16 px-2 rounded-xl bg-red-50 ring-1 ring-red-200 text-red-800 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Triangle size={16} className="rotate-180 fill-red-500 text-red-500" /> Ja, wisselen
                </button>
                <button
                  onClick={() => {
                    setPendingInjuredId(null);
                    setQuickStep('menu');
                  }}
                  className="h-16 px-2 rounded-xl bg-gray-100 text-navy font-semibold text-sm flex items-center justify-center active:scale-95 transition-all"
                >
                  Nee, blijft staan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
