import React, { useState } from 'react';
import { ClipboardEdit, Sparkles, Loader2 } from 'lucide-react';
import type { Game, Player } from '../types';
import { generateMatchReport } from '../utils/aiMatchReport';

interface Props {
  currentGame: Game;
  players: Player[];
  totalGoals: number;
  totalOpponentGoals: number;
  onUpdateGame: (game: Game) => void;
}

export const MatchReview: React.FC<Props> = ({ currentGame, players, totalGoals, totalOpponentGoals, onUpdateGame }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  // Zolang de tekst onaangeroerd AI-gegenereerd is, tonen we een klein label; zodra de
  // gebruiker zelf iets wijzigt, verdwijnt dat (het is dan hun eigen tekst geworden).
  const [wasAiFilled, setWasAiFilled] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationFailed(false);
    try {
      const text = await generateMatchReport(currentGame, players, totalGoals, totalOpponentGoals);
      if (text) {
        onUpdateGame({ ...currentGame, notes: text });
        setWasAiFilled(true);
      } else {
        setGenerationFailed(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl p-6 bg-navy text-white shadow-lg text-center space-y-3">
        <div aria-hidden className="pointer-events-none absolute -top-16 -end-16 w-48 h-48 rounded-full bg-volt/10 blur-2xl" />
        <h3 className="relative font-display text-6xl font-bold leading-none tabular-nums">{totalGoals} - {totalOpponentGoals}</h3>
        <p className="relative text-sm font-medium text-white/60">U10 Kaulille vs {currentGame.opponent || 'Tegenstander'}</p>
        <div className={`relative text-sm font-semibold px-3 py-1 rounded-md inline-block ${totalGoals > totalOpponentGoals ? 'bg-volt text-navy' : totalGoals < totalOpponentGoals ? 'bg-red-500/20 text-red-200' : 'bg-white/10 text-white/80'}`}>{totalGoals > totalOpponentGoals ? 'Gewonnen' : totalGoals < totalOpponentGoals ? 'Verloren' : 'Gelijkspel'}</div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-navy/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2 text-navy"><ClipboardEdit size={18} className="text-navy/50" /> Opmerkingen</h3>
          {wasAiFilled && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-volt-soft text-volt-ink">
              <Sparkles size={12} /> AI-suggestie
            </span>
          )}
        </div>
        <textarea
          className="w-full p-3 border border-navy/10 rounded-lg bg-navy/[0.02] text-gray-700 outline-none focus:ring-2 focus:ring-navy/20 transition-all"
          rows={6}
          placeholder="Matchverslag..."
          value={currentGame.notes || ''}
          onChange={(e) => { setWasAiFilled(false); onUpdateGame({ ...currentGame, notes: e.target.value }); }}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="mt-3 w-full py-3.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-navy text-white disabled:opacity-60 active:scale-95 transition-all"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-volt" />}
          {isGenerating ? 'Verslag wordt gegenereerd...' : 'Genereer AI-verslag'}
        </button>
        {generationFailed && (
          <p className="mt-2 text-xs font-medium text-red-600 text-center">
            Kon geen AI-verslag genereren. Probeer het straks opnieuw (zie console voor details).
          </p>
        )}
      </div>
    </div>
  );
};
