import React from 'react';
import { X, Target, Handshake, Axe, Shield, Trophy, Star } from 'lucide-react';
import type { Player, Game } from '../types';

interface Props {
  player: Player;
  games: Game[];
  onClose: () => void;
}

export const PlayerStatsModal: React.FC<Props> = ({ player, games, onClose }) => {
  // Bereken persoonlijke stats op basis van afgeronde matchen
  const finishedGames = games.filter(g => g.status === 'finished');
  
  const stats = finishedGames.reduce((acc, game) => {
    game.quarters.forEach(q => {
      acc.goals += (q.goals || []).filter(id => id === player.id).length;
      acc.assists += ((q as any).assists || []).filter((id: number) => id === player.id).length;
      acc.tackles += ((q as any).tackles || []).filter((id: number) => id === player.id).length;
      if (q.goalkeeper === player.id) {
        acc.saves += (q.saves || 0);
      }
    });
    if (game.playersPresent.includes(player.id)) acc.matches += 1;
    return acc;
  }, { goals: 0, assists: 0, tackles: 0, saves: 0, matches: 0 });

  return (
    <div className="fixed inset-0 bg-[#04174C]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative border-4 border-white">
        
        {/* Header / Banner */}
        <div className="bg-gradient-to-br from-[#04174C] to-[#052A6B] p-8 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
            <X size={24} />
          </button>
          
          <div className="w-24 h-24 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-white/20">
            <Star size={48} className="text-yellow-400 fill-yellow-400" />
          </div>
          
          <h3 className="text-2xl font-black text-white uppercase tracking-tight">{player.name}</h3>
          <p className="text-blue-300 text-[10px] font-bold uppercase tracking-[0.2em]">U9 Kaulille FC</p>
        </div>

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 gap-4 bg-gray-50">
          <StatBox icon={<Gamepad2 size={16}/>} label="Matchen" value={stats.matches} color="text-blue-600" />
          <StatBox icon={<Target size={16}/>} label="Goals" value={stats.goals} color="text-green-600" />
          <StatBox icon={<Handshake size={16}/>} label="Assists" value={stats.assists} color="text-yellow-600" />
          <StatBox icon={<Axe size={16}/>} label="Tackles" value={stats.tackles} color="text-red-600" />
          {stats.saves > 0 && (
            <div className="col-span-2">
               <StatBox icon={<Shield size={16}/>} label="Reddingen als keeper" value={stats.saves} color="text-purple-600" />
            </div>
          )}
        </div>

        <div className="p-4 text-center border-t border-gray-100">
           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Officiële Club Statistieken</p>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon, label, value, color }: { icon: any, label: string, value: number, color: string }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
    <div className={`${color} mb-1 opacity-80`}>{icon}</div>
    <div className="text-xl font-black text-[#04174C]">{value}</div>
    <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{label}</div>
  </div>
);

const Gamepad2 = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" /><rect x="2" y="6" width="20" height="12" rx="2" /></svg>
);