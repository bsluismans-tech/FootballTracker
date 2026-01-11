import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Target, Plus, Trophy, Shield, UserCheck, Activity, Handshake, Axe, Users, Gamepad2, Megaphone } from 'lucide-react';
import { LiveScoreboard } from './LiveScoreboard';
import type { Player, Game, Parent } from '../types';

interface Props {
  players: Player[];
  parents: Parent[];
  games: Game[];
  startNewGame: () => void;
  canStart: boolean;
}

export const Dashboard: React.FC<Props> = ({ players, parents, games, startNewGame, canStart }) => {
  const [liveGame, setLiveGame] = useState<Game | null>(null);
  const [lastFinishedGame, setLastFinishedGame] = useState<Game | null>(null);

  // REAL-TIME FIREBASE LISTENERS
  useEffect(() => {
    // 1. Luister naar een actieve match voor de LIVE status
    const qLive = query(
      collection(db, "games"), 
      where("status", "==", "active"), 
      limit(1)
    );
    const unsubscribeLive = onSnapshot(qLive, (snapshot) => {
      if (!snapshot.empty) {
        setLiveGame({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Game);
      } else {
        setLiveGame(null);
      }
    });

    // 2. Haal de laatste voltooide match op voor de 'Laatste uitslag'
    const qLast = query(
      collection(db, "games"), 
      where("status", "==", "finished"), 
      orderBy("date", "desc"), 
      limit(1)
    );
    const unsubscribeLast = onSnapshot(qLast, (snapshot) => {
      if (!snapshot.empty) {
        setLastFinishedGame({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Game);
      } else {
        setLastFinishedGame(null);
      }
    });

    return () => {
      unsubscribeLive();
      unsubscribeLast();
    };
  }, []);

  const getPlayerName = (id: number) => players.find(p => p.id === id)?.name || 'Onbekend';
  const getParentName = (id: number) => parents.find(p => p.id === id)?.name || 'Onbekend';

  const finishedGames = games.filter(g => g.status === 'finished');

  const lastFiveGames = [...finishedGames]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .reverse();

  // BEREKENING VAN TEAM STATISTIEKEN
  const stats = finishedGames.reduce((acc, game) => {
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

  finishedGames.forEach(g => {
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
  finishedGames.forEach(g => g.parentsPresent?.forEach(pId => parentAttendance[pId] = (parentAttendance[pId] || 0) + 1));
  const topParents = Object.entries(parentAttendance).map(([id, count]) => ({ id: parseInt(id), count })).sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 select-none space-y-6">
      {/* Header */}
      <div className="px-1 pt-2">
        <h1 className="text-3xl font-black text-[#04174C] tracking-tight text-left leading-none uppercase">U9 Kaulille</h1>
      </div>

      {/* Live Scoreboard / Laatste Resultaat */}
      <section className="animate-in fade-in slide-in-from-top-4 duration-500">
        {liveGame ? (
          <LiveScoreboard game={liveGame} isLive={true} />
        ) : lastFinishedGame ? (
          <LiveScoreboard game={lastFinishedGame} isLive={false} />
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center">
            <Trophy className="mx-auto text-gray-200 mb-2" size={32} />
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Nog geen wedstrijdgegevens</p>
          </div>
        )}
      </section>
      
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
                {stats.goalsFor} <span className="text-gray-300">voor</span> {stats.goalsAgainst} <span className="text-gray-300">tegen</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- TEAM STATS SECTIE --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-8 text-[#04174C] font-bold uppercase text-xs tracking-wider">
            <Users size={18} className="text-blue-500" /> Team Stats
          </div>

          <div className="grid grid-cols-3 gap-y-8 gap-x-2 relative z-10">
            {[
              { label: 'Matchen', value: finishedGames.length, icon: <Gamepad2 size={16} />, color: 'text-blue-500' },
              { label: 'Goals', value: stats.goalsFor, icon: <Target size={16} />, color: 'text-yellow-500' },
              { label: 'Assists', value: stats.totalAssists, icon: <Handshake size={16} />, color: 'text-yellow-500' },
              { label: 'Tackles', value: stats.totalTackles, icon: <Axe size={16} />, color: 'text-blue-400' },
              { label: 'Saves', value: stats.totalSaves, icon: <Shield size={16} />, color: 'text-emerald-500' },
              { label: 'Fans', value: stats.totalSpectators, icon: <UserCheck size={16} />, color: 'text-purple-500' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-2xl font-black text-[#04174C] tabular-nums tracking-tight">
                    {item.value}
                  </span>
                  <div className={`${item.color} opacity-60`}>
                    {item.icon}
                  </div>
                </div>
                <span className="text-[9px] uppercase font-black tracking-widest text-gray-400">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* --- NIEUWE WEDSTRIJD KNOP --- */}
        <button 
          onClick={startNewGame} 
          disabled={!canStart} 
          className="w-full bg-[#04174C] text-white py-4 rounded-2xl shadow-xl hover:bg-[#052A6B] disabled:bg-gray-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
        >
          <Plus size={22} strokeWidth={3} />
          <span className="font-black uppercase tracking-[0.2em] text-sm">Nieuwe wedstrijd</span>
        </button>

        {/* Topschutter Lijst */}
        {sortedScorers.length > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
            <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
              <Trophy size={18} className="text-yellow-500" /> Topschutter
            </div>
            <div className="space-y-3">
              {sortedScorers.map((scorer, index) => (
                <div key={scorer.id} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">{index + 1}. {getPlayerName(scorer.id)}</span>
                  <span className="text-xs font-bold bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg">{scorer.goals} goals</span>
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
                      {keeper.saves} saves
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      {item.count} tackles
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
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
                      {item.count} assists
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      {parent.count} matchen
                    </span>                                        
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supertrainers Sectie */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-6 text-[#04174C] font-bold uppercase text-xs tracking-wider">
          <Megaphone size={18} className="text-blue-500" /> Topcoaches
        </div>
        
        <div className="flex justify-around items-center gap-4">
          {/* Trainer 1: Stijn */}
          <div className="flex flex-col items-center group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100">
                <img 
                  src="/Stijn.PNG" 
                  alt="Stijn" 
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = "https://ui-avatars.com/api/?name=Stijn&background=04174C&color=fff")}
                />
              </div>
            </div>
            <h3 className="mt-3 font-black text-[#04174C] text-sm">Stijn</h3>
            <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest">Coach</p>
          </div>

          {/* Trainer 2: Mathy */}
          <div className="flex flex-col items-center group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100">
                <img 
                  src="/Mathy.jpg" 
                  alt="Mathy" 
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = "https://ui-avatars.com/api/?name=Mathy&background=04174C&color=fff")}
                />
              </div>
            </div>
            <h3 className="mt-3 font-black text-[#04174C] text-sm">Mathy</h3>
            <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest">Coach</p>
          </div>
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