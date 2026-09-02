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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#04174C]/20 text-center space-y-2">
        <h3 className="text-3xl font-black text-[#04174C]">{totalGoals} - {totalOpponentGoals}</h3>
        <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">U9 Kaulille vs {currentGame.opponent || 'Tegenstander'}</p>
        <div className={`text-sm font-black px-4 py-1 rounded-full inline-block ${totalGoals >= totalOpponentGoals ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{totalGoals > totalOpponentGoals ? 'GEWONNEN 🎉' : totalGoals < totalOpponentGoals ? 'VERLOREN ⚽️' : 'GELIJKSPEL 🤝'}</div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2 text-yellow-800"><ClipboardEdit size={18} /> Opmerkingen</h3>
          {wasAiFilled && (
            <span className="flex items-center gap-1 text-[9px] font-black text-yellow-600 uppercase tracking-widest">
              <Sparkles size={12} /> AI-suggestie
            </span>
          )}
        </div>
        <textarea
          className="w-full p-3 border border-yellow-100 rounded-lg bg-yellow-50/30 text-gray-700 outline-none transition-all"
          rows={6}
          placeholder="Matchverslag..."
          value={currentGame.notes || ''}
          onChange={(e) => { setWasAiFilled(false); onUpdateGame({ ...currentGame, notes: e.target.value }); }}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="mt-3 w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 bg-yellow-500 text-white disabled:opacity-60 active:scale-95 transition-all"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {isGenerating ? 'Verslag wordt gegenereerd...' : 'Genereer AI-verslag'}
        </button>
        {generationFailed && (
          <p className="mt-2 text-[10px] font-bold text-red-500 text-center">
            Kon geen AI-verslag genereren. Probeer het straks opnieuw (zie console voor details).
          </p>
        )}
      </div>
    </div>
  );
};
