import React from 'react';
import { Target, PartyPopper, Plus, Trophy, Shield, UserCheck, Check, X, Activity, Handshake, Axe, Users, Gamepad2 } from 'lucide-react';
import type { Player, Game, Parent } from '../types';

interface Props {
  players: Player[];
  parents: Parent[];
  games: Game[];
  startNewGame: () => void;
  canStart: boolean;
}

export const Dashboard: React.FC<Props> = ({ players, parents, games, startNewGame, canStart }) => {
  const getPlayerName = (id: number) => players.find(p => p.id === id)?.name || 'Onbekend';
  const getParentName = (id: number) => parents.find(p => p.id === id)?.name || 'Onbekend';

  const lastFiveGames = [...games]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .reverse();

  // BEREKENING VAN TEAM STATISTIEKEN
  const stats = games.reduce((acc, game) => {
    const ours = game.quarters.reduce((sum, q) => sum + q.goals.length, 0);
    const theirs = game.quarters.reduce((sum, q) => sum + q.opponentGoals, 0);
    
    acc.goalsFor += ours;
    acc.goalsAgainst += theirs;
    acc.totalSpectators += (game.parentsPresent?.length || 0);
    
    game.quarters.forEach(q => {
      acc.totalAssists += ((q as any).assists || []).length;
      acc.totalTackles += ((q as any).tackles || []).length;
      acc.totalSaves += (q.saves || 0);
    });
    
    if (ours > theirs) acc.wins += 1;
    else if (ours < theirs) acc.losses += 1;
    else acc.draws += 1;
    
    return acc;
  }, { 
    wins: 0, draws: 0, losses: 0, 
    goalsFor: 0, goalsAgainst: 0, 
    totalAssists: 0, totalTackles: 0, totalSaves: 0,
    totalSpectators: 0 
  });






  const goalDiff = stats.goalsFor - stats.goalsAgainst;

  const getResult = (game: Game) => {
    const ours = game.quarters.reduce((sum, q) => sum + q.goals.length, 0);
    const theirs = game.quarters.reduce((sum, q) => sum + q.opponentGoals, 0);
    if (ours > theirs) return 'W';
    if (ours < theirs) return 'L';
    return 'D';
  };

  // Statistieken per speler verzamelen
  const goalsByPlayer: Record<number, number> = {};
  const assistsByPlayer: Record<number, number> = {};
  const tacklesByPlayer: Record<number, number> = {};
  const savesByKeeper: Record<number, number> = {};

  games.forEach(g => {
    g.quarters.forEach(q => {
      q.goals.forEach(pId => goalsByPlayer[pId] = (goalsByPlayer[pId] || 0) + 1);
      ((q as any).assists || []).forEach((pId: number) => assistsByPlayer[pId] = (assistsByPlayer[pId] || 0) + 1);
      ((q as any).tackles || []).forEach((pId: number) => tacklesByPlayer[pId] = (tacklesByPlayer[pId] || 0) + 1);
      if (q.goalkeeper) savesByKeeper[q.goalkeeper] = (savesByKeeper[q.goalkeeper] || 0) + q.saves;
    });
  });

  const sortedScorers = Object.entries(goalsByPlayer).map(([id, goals]) => ({ id: parseInt(id), goals })).sort((a, b) => b.goals - a.goals).slice(0, 3);
  const sortedAssists = Object.entries(assistsByPlayer).map(([id, count]) => ({ id: parseInt(id), count })).sort((a, b) => b.count - a.count).slice(0, 3);
  const sortedTackles = Object.entries(tacklesByPlayer).map(([id, count]) => ({ id: parseInt(id), count })).sort((a, b) => b.count - a.count).slice(0, 3);
  const topKeepers = Object.entries(savesByKeeper).map(([id, saves]) => ({ id: parseInt(id), saves })).sort((a, b) => b.saves - a.saves).slice(0, 3);

  const parentAttendance: Record<number, number> = {};
  games.forEach(g => g.parentsPresent?.forEach(pId => parentAttendance[pId] = (parentAttendance[pId] || 0) + 1));
  const topParents = Object.entries(parentAttendance).map(([id, count]) => ({ id: parseInt(id), count })).sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 px-1">
        <h1 className="text-3xl font-black text-[#04174C] tracking-tight text-left leading-none">U9 Kaulille</h1>
        <button onClick={startNewGame} disabled={!canStart} className="bg-[#04174C] text-white py-2.5 px-4 rounded-xl shadow-lg hover:bg-[#052A6B] disabled:bg-gray-200 flex items-center gap-2 transition-all active:scale-95 shrink-0">
          <Plus size={18} strokeWidth={3} />
          <span className="font-bold text-xs uppercase tracking-wider">Nieuwe wedstrijd</span>
        </button>
      </div>
      
      <div className="grid gap-4">
        {/* Top Rij: Balans, Vorm en Saldo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-blue-50 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center gap-2 mb-3 text-[#04174C] font-bold uppercase text-[10px] tracking-wider opacity-60">
              <Activity size={14} /> Resultaten & Vorm
            </div>
            
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-black text-[#04174C]">{stats.wins}W</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-sm font-black text-[#04174C]">{stats.draws}G</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-black text-[#04174C]">{stats.losses}V</span>
              </div>
            </div>

            <div className="flex items-center justify-start overflow-x-auto pb-1">
              {games.length === 0 ? (
                <span className="text-[10px] text-gray-400 italic font-medium">Geen data</span>
              ) : (
                lastFiveGames.map((game, i) => (
                  <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 text-[10px] font-bold ${getResult(game) === 'W' ? 'bg-green-500' : getResult(game) === 'L' ? 'bg-red-500' : 'bg-gray-400'} ${i !== 0 ? 'ml-1.5' : ''}`}>
                    {getResult(game)}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-span-1 bg-white p-4 rounded-2xl shadow-sm border border-blue-50 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center gap-2 mb-1 text-[#04174C] font-bold uppercase text-[10px] tracking-wider opacity-60">
              <Target size={14} /> Doelsaldo
            </div>
            <div>
              <div className="text-2xl font-black text-[#04174C] leading-none">
                {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
              </div>
              <div className="text-[9px] text-gray-400 font-bold mt-1 leading-tight tracking-tight">
                {stats.goalsFor} <span className="text-gray-300">voor</span><br/>
                {stats.goalsAgainst} <span className="text-gray-300">tegen</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Prestaties Sectie (2 kolommen, 3 rijen) */}
<div className="bg-[#04174C] p-6 rounded-2xl shadow-lg border border-blue-900/20 text-white">
  <div className="flex items-center gap-2 mb-6 font-bold uppercase text-xs tracking-wider opacity-80">
    <Users size={18} /> Team Prestaties
  </div>
  <div className="grid grid-cols-2 gap-y-6">
    {/* Rij 1: Matchen & Doelpunten */}
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <Gamepad2 size={16} className="opacity-60" />
        <span className="text-2xl font-black">{games.length}</span>
      </div>
      <span className="text-[10px] uppercase font-bold opacity-50 tracking-wide">Wedstrijden</span>
    </div>
    <div className="flex flex-col pl-6 border-l border-white/10">
      <div className="flex items-center gap-2">
        <Target size={16} className="text-white opacity-60" />
        <span className="text-2xl font-black text-white">{stats.goalsFor}</span>
      </div>
      <span className="text-[10px] uppercase font-bold opacity-50 tracking-wide">Doelpunten</span>
    </div>

    {/* Rij 2: Assists & Tackles */}
    <div className="flex flex-col border-t border-white/5 pt-4">
      <div className="flex items-center gap-2">
        <Handshake size={16} className="text-yellow-400 opacity-80" />
        <span className="text-2xl font-black text-white">{stats.totalAssists}</span>
      </div>
      <span className="text-[10px] uppercase font-bold opacity-50 tracking-wide">Assists</span>
    </div>
    <div className="flex flex-col pl-6 border-l border-t border-white/10 pt-4">
      <div className="flex items-center gap-2">
        <Axe size={16} className="text-blue-400 opacity-80" />
        <span className="text-2xl font-black text-white">{stats.totalTackles}</span>
      </div>
      <span className="text-[10px] uppercase font-bold opacity-50 tracking-wide">Tackles</span>
    </div>

    {/* Rij 3: Saves & Fans */}
    <div className="flex flex-col border-t border-white/5 pt-4">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-green-400 opacity-80" />
        <span className="text-2xl font-black text-white">{stats.totalSaves}</span>
      </div>
      <span className="text-[10px] uppercase font-bold opacity-50 tracking-wide">Saves</span>
    </div>
    <div className="flex flex-col pl-6 border-l border-t border-white/10 pt-4">
      <div className="flex items-center gap-2">
        <UserCheck size={16} className="text-purple-400 opacity-80" />
        <span className="text-2xl font-black text-white">{stats.totalSpectators}</span>
      </div>
      <span className="text-[10px] uppercase font-bold opacity-50 tracking-wide">Toeschouwers</span>
    </div>
  </div>
</div>

        {/* Topscorer Lijst */}
        {sortedScorers.length > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
            <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
              <Trophy size={18} className="text-yellow-500" /> Topschutter
            </div>
            <div className="space-y-3">
              {sortedScorers.map((scorer, index) => (
                <div key={scorer.id} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">{index + 1}. {getPlayerName(scorer.id)}</span>
                  <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-lg">{scorer.goals} goals</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Keepers en Ouders grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topKeepers.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
              <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
                <Shield size={18} className="text-green-500" /> De Muur
              </div>
              <div className="space-y-3">
                {topKeepers.map((keeper, index) => (
                  <div key={keeper.id} className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-700">{index + 1}. {getPlayerName(keeper.id)}</span>
                    <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                      {keeper.saves} {keeper.saves === 1 ? 'save' : 'saves'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

{/* Hakbijl */}
{sortedTackles.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
              <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
                <Axe size={18} className="text-blue-600" /> Hakbijl
              </div>
              <div className="space-y-3">
                {sortedTackles.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-700">{index + 1}. {getPlayerName(item.id)}</span>
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                      {item.count} {item.count === 1 ? 'tackle' : 'tackles'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}


        {/* Assists en Tackles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-1">
          {/* Assistenkoning */}
          {sortedAssists.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
              <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
                <Handshake size={18} className="text-yellow-600" /> Assistenkoning
              </div>
              <div className="space-y-3">
                {sortedAssists.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-700">{index + 1}. {getPlayerName(item.id)}</span>
                    <span className="text-xs font-bold bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg">
                      {item.count} {item.count === 1 ? 'assist' : 'assists'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          
        </div>
          {topParents.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
              <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
                <UserCheck size={18} className="text-purple-500" /> Superfans
              </div>
              <div className="space-y-3">
                {topParents.map((parent, index) => (
                  <div key={parent.id} className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-700">{index + 1}. {getParentName(parent.id)}</span>
                    <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">
                      {parent.count} {parent.count === 1 ? 'wedstrijd' : 'wedstrijden'}
                    </span>                                        
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <img src="/clublogo.png" alt="Club Logo" className="max-w-[70px] object-contain opacity-40 grayscale hover:grayscale-0 transition-all duration-500" />
        <div className="flex flex-col items-center">
          <p className="text-[10px] text-[#04174C]/30 font-black uppercase tracking-[0.2em]">U9 Kaulille FC</p>
          <p className="text-[9px] text-[#04174C]/20 font-bold uppercase tracking-widest mt-0.5">Seizoen {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
        </div>
      </div>
    </div>
  );
};