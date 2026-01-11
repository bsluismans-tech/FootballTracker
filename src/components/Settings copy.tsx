// --- SUBCOMPONENT: PLAYER STATS MODAL ---
const PlayerStatsModal: React.FC<{ player: Player; games: Game[]; onClose: () => void }> = ({ player, games, onClose }) => {
  const finishedGames = games.filter(g => g.status === 'finished');
  
  const stats = finishedGames.reduce((acc, game) => {
    game.quarters.forEach(q => {
      acc.goals += (q.goals || []).filter(id => id === player.id).length;
      acc.assists += ((q as any).assists || []).filter((id: number) => id === player.id).length;
      acc.tackles += ((q as any).tackles || []).filter((id: number) => id === player.id).length;
      if (q.goalkeeper === player.id) acc.saves += (q.saves || 0);
    });
    if (game.playersPresent.includes(player.id)) acc.matches += 1;
    return acc;
  }, { goals: 0, assists: 0, tackles: 0, saves: 0, matches: 0 });

  return (
    <div 
      // Klik op de achtergrond sluit de modal
      onClick={onClose} 
      className="fixed inset-0 bg-[#04174C]/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 cursor-pointer"
    >
      <div 
        // StopPropagation voorkomt dat klikken OP de kaart de modal sluit
        onClick={(e) => e.stopPropagation()} 
        className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative border-4 border-white cursor-default"
      >
        <div className="bg-gradient-to-br from-[#04174C] to-[#052A6B] p-8 text-center relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
          <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-white/20">
            <Star size={40} className="text-yellow-400 fill-yellow-400" />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tight">{player.name}</h3>
          <p className="text-blue-300 text-[10px] font-bold uppercase tracking-[0.2em]">Ploeglid U9 Kaulille</p>
        </div>

        <div className="p-6 grid grid-cols-2 gap-3 bg-gray-50">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Gamepad2 size={16} className="text-blue-500 mb-1" />
            <div className="text-xl font-black text-[#04174C]">{stats.matches}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase">Matchen</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Target size={16} className="text-green-500 mb-1" />
            <div className="text-xl font-black text-[#04174C]">{stats.goals}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase">Goals</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Handshake size={16} className="text-yellow-500 mb-1" />
            <div className="text-xl font-black text-[#04174C]">{stats.assists}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase">Assists</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Axe size={16} className="text-red-500 mb-1" />
            <div className="text-xl font-black text-[#04174C]">{stats.tackles}</div>
            <div className="text-[8px] font-black text-gray-400 uppercase">Tackles</div>
          </div>
          {stats.saves > 0 && (
            <div className="col-span-2 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-4">
              <Shield size={16} className="text-purple-500" />
              <div className="text-sm font-black text-[#04174C]">{stats.saves} Reddingen</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};