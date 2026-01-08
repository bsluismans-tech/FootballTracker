import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Users, Target, Shield, UserCheck } from 'lucide-react';

// TypeScript interfaces toevoegen voor betere controle
interface Player { id: number; name: string; }
interface Parent { id: number; name: string; }
interface Quarter {
  number: number;
  goals: number[];
  saves: number;
  goalkeeper: number | null;
  opponentGoals: number;
}
interface Game {
  id: number;
  date: string;
  quarters: Quarter[];
  playersPresent: number[];
  parentsPresent: number[];
}

export default function VoetbalTracker() {
  // 1. Laad data DIRECT bij het aanmaken van de state (Lazy Initializer)
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('players');
    return saved ? JSON.parse(saved) : [];
  });

  const [parents, setParents] = useState<Parent[]>(() => {
    const saved = localStorage.getItem('parents');
    return saved ? JSON.parse(saved) : [];
  });

  const [games, setGames] = useState<Game[]>(() => {
    const saved = localStorage.getItem('games');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [view, setView] = useState('dashboard');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newParentName, setNewParentName] = useState('');


  useEffect(() => {
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('parents', JSON.stringify(parents));
    localStorage.setItem('games', JSON.stringify(games));
    console.log("Data bijgewerkt in localStorage");
  }, [players, parents, games]);

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id: number) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const addParent = () => {
    if (newParentName.trim()) {
      setParents([...parents, { id: Date.now(), name: newParentName.trim() }]);
      setNewParentName('');
    }
  };

  const removeParent = (id: number) => {
    setParents(parents.filter(p => p.id !== id));
  };

  const startNewGame = () => {
    const game: Game = {
      id: Date.now(),
      date: new Date().toISOString(),
      quarters: [
        { number: 1, goals: [], saves: 0, goalkeeper: null, opponentGoals: 0 },
        { number: 2, goals: [], saves: 0, goalkeeper: null, opponentGoals: 0 },
        { number: 3, goals: [], saves: 0, goalkeeper: null, opponentGoals: 0 },
        { number: 4, goals: [], saves: 0, goalkeeper: null, opponentGoals: 0 }
      ],
      playersPresent: [],
      parentsPresent: []
    };
    setCurrentGame(game);
    setView('game');
  };

  const togglePlayerPresent = (playerId: number) => {
    if (!currentGame) return;
    setCurrentGame({
      ...currentGame,
      playersPresent: currentGame.playersPresent.includes(playerId)
        ? currentGame.playersPresent.filter(id => id !== playerId)
        : [...currentGame.playersPresent, playerId]
    });
  };

  const toggleParentPresent = (parentId: number) => {
    if (!currentGame) return;
    setCurrentGame({
      ...currentGame,
      parentsPresent: currentGame.parentsPresent.includes(parentId)
        ? currentGame.parentsPresent.filter(id => id !== parentId)
        : [...currentGame.parentsPresent, parentId]
    });
  };

  const setGoalkeeper = (quarterIndex: number, playerId: number) => {
    if (!currentGame) return;
    const newQuarters = [...currentGame.quarters];
    newQuarters[quarterIndex] = { ...newQuarters[quarterIndex], goalkeeper: playerId };
    setCurrentGame({ ...currentGame, quarters: newQuarters });
  };

  const addGoal = (quarterIndex: number, playerId: number) => {
    if (!currentGame) return;
    const newQuarters = [...currentGame.quarters];
    newQuarters[quarterIndex] = {
      ...newQuarters[quarterIndex],
      goals: [...newQuarters[quarterIndex].goals, playerId]
    };
    setCurrentGame({ ...currentGame, quarters: newQuarters });
  };

  const addSave = (quarterIndex: number) => {
    if (!currentGame) return;
    const newQuarters = [...currentGame.quarters];
    newQuarters[quarterIndex] = {
      ...newQuarters[quarterIndex],
      saves: newQuarters[quarterIndex].saves + 1
    };
    setCurrentGame({ ...currentGame, quarters: newQuarters });
  };

  const addOpponentGoal = (quarterIndex: number) => {
    if (!currentGame) return;
    const newQuarters = [...currentGame.quarters];
    newQuarters[quarterIndex] = {
      ...newQuarters[quarterIndex],
      opponentGoals: (newQuarters[quarterIndex].opponentGoals || 0) + 1
    };
    setCurrentGame({ ...currentGame, quarters: newQuarters });
  };

  const saveGame = () => {
    if (currentGame) {
      setGames([...games, currentGame]);
      setCurrentGame(null);
      setView('menu');
    }
  };

  const getPlayerName = (id: number) => players.find(p => p.id === id)?.name || 'Onbekend';
  const getParentName = (id: number) => parents.find(p => p.id === id)?.name || 'Onbekend';

  const calculateStats = () => {
    const totalGoals = games.reduce((sum, game) => 
      sum + game.quarters.reduce((qSum, q) => qSum + q.goals.length, 0), 0
    );

    const goalsByPlayer: Record<number, number> = {};
    games.forEach(game => {
      game.quarters.forEach(quarter => {
        quarter.goals.forEach(playerId => {
          goalsByPlayer[playerId] = (goalsByPlayer[playerId] || 0) + 1;
        });
      });
    });

    let topScorer: number | null = null;
    let topScorerGoals = 0;
    Object.entries(goalsByPlayer).forEach(([playerId, goals]) => {
      if (goals > topScorerGoals) {
        topScorerGoals = goals;
        topScorer = parseInt(playerId);
      }
    });

    const attendanceByParent: Record<number, number> = {};
    games.forEach(game => {
      game.parentsPresent.forEach(parentId => {
        attendanceByParent[parentId] = (attendanceByParent[parentId] || 0) + 1;
      });
    });

    let topParent: number | null = null;
    let topParentAttendance = 0;
    Object.entries(attendanceByParent).forEach(([parentId, attendance]) => {
      if (attendance > topParentAttendance) {
        topParentAttendance = attendance;
        topParent = parseInt(parentId);
      }
    });

    return { totalGoals, topScorer, topScorerGoals, topParent, topParentAttendance, goalsByPlayer };
  };

  

  
  
  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-green-50 p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-green-800 mb-6 text-center">U9 Kaulille</h1>
          <div className="space-y-4">
            <button onClick={() => setView('dashboard')} className="w-full bg-yellow-600 text-white py-4 px-6 rounded-lg text-xl font-semibold">Dashboard</button>
            <button onClick={startNewGame} disabled={players.length === 0} className="w-full bg-green-600 text-white py-4 px-6 rounded-lg text-xl font-semibold">Nieuwe Wedstrijd Starten</button>
            <button onClick={() => setView('players')} className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-xl font-semibold">Beheer Spelers ({players.length})</button>
            <button onClick={() => setView('parents')} className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg text-xl font-semibold">Beheer Ouders ({parents.length})</button>
            <button onClick={() => setView('history')} className="w-full bg-gray-600 text-white py-4 px-6 rounded-lg text-xl font-semibold">Wedstrijd Geschiedenis ({games.length})</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'players') {
    return (
      <div className="min-h-screen bg-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setView('menu')}
            className="mb-4 text-blue-600 hover:text-blue-800 font-semibold"
          >
            ← Terug naar Menu
          </button>
          
          <h2 className="text-2xl font-bold text-blue-800 mb-4">Beheer Spelers</h2>
          
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Voer spelernaam in"
              className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-lg text-lg"
            />
            <button
              onClick={addPlayer}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              <Plus size={24} />
            </button>
          </div>
          
          <div className="space-y-2">
            {players.map(player => (
              <div key={player.id} className="bg-white p-4 rounded-lg flex justify-between items-center">
                <span className="text-lg font-medium">{player.name}</span>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'parents') {
    return (
      <div className="min-h-screen bg-purple-50 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setView('menu')}
            className="mb-4 text-purple-600 hover:text-purple-800 font-semibold"
          >
            ← Terug naar Menu
          </button>
          
          <h2 className="text-2xl font-bold text-purple-800 mb-4">Beheer Ouders</h2>
          
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={newParentName}
              onChange={(e) => setNewParentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addParent()}
              placeholder="Voer oudernaam in"
              className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-lg text-lg"
            />
            <button
              onClick={addParent}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              <Plus size={24} />
            </button>
          </div>
          
          <div className="space-y-2">
            {parents.map(parent => (
              <div key={parent.id} className="bg-white p-4 rounded-lg flex justify-between items-center">
                <span className="text-lg font-medium">{parent.name}</span>
                <button
                  onClick={() => removeParent(parent.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'dashboard') {
    const stats = calculateStats();
    
    return (
      <div className="min-h-screen bg-yellow-50 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setView('menu')}
            className="mb-4 text-yellow-600 hover:text-yellow-800 font-semibold"
          >
            ← Terug naar Menu
          </button>
          
          <h2 className="text-2xl font-bold text-yellow-800 mb-6">U9 Kaulille</h2>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-4xl font-bold text-green-600 mb-2">{stats.totalGoals}</div>
              <div className="text-lg text-gray-600">Totaal Doelpunten Gescoord</div>
            </div>

            {stats.topScorer && (
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={24} className="text-yellow-600" />
                  <div className="text-xl font-bold">Topscorer</div>
                </div>
                <div className="text-2xl font-semibold text-gray-800">
                  {getPlayerName(stats.topScorer)}
                </div>
                <div className="text-lg text-gray-600">
                  {stats.topScorerGoals} doelpunt{stats.topScorerGoals !== 1 ? 'en' : ''}
                </div>
              </div>
            )}

            {stats.topParent && (
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck size={24} className="text-purple-600" />
                  <div className="text-xl font-bold">Meest Toegewijde Ouder</div>
                </div>
                <div className="text-2xl font-semibold text-gray-800">
                  {getParentName(stats.topParent)}
                </div>
                <div className="text-lg text-gray-600">
                  {stats.topParentAttendance} wedstrijd{stats.topParentAttendance !== 1 ? 'en' : ''} bijgewoond
                </div>
              </div>
            )}

            {Object.keys(stats.goalsByPlayer).length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <div className="text-xl font-bold mb-4">Alle Doelpuntenmakers</div>
                <div className="space-y-2">
                  {Object.entries(stats.goalsByPlayer)
                    .sort(([, a], [, b]) => b - a)
                    .map(([playerId, goals]) => (
                      <div key={playerId} className="flex justify-between items-center">
                        <span className="font-medium">{getPlayerName(parseInt(playerId))}</span>
                        <span className="text-gray-600">{goals} doelpunt{goals !== 1 ? 'en' : ''}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setView('menu')}
            className="mb-4 text-gray-600 hover:text-gray-800 font-semibold"
          >
            ← Terug naar Menu
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wedstrijd Geschiedenis</h2>
          
          <div className="space-y-4">
            {games.map(game => {
              const totalGoals = game.quarters.reduce((sum, q) => sum + q.goals.length, 0);
              const totalSaves = game.quarters.reduce((sum, q) => sum + q.saves, 0);
              const totalOpponentGoals = game.quarters.reduce((sum, q) => sum + (q.opponentGoals || 0), 0);
              
              const goalsByPlayer = {};
              game.quarters.forEach(quarter => {
                quarter.goals.forEach(playerId => {
                  goalsByPlayer[playerId] = (goalsByPlayer[playerId] || 0) + 1;
                });
              });
              
              return (
                <div key={game.id} className="bg-white p-4 rounded-lg">
                  <div className="font-semibold text-lg mb-2">
                    {new Date(game.date).toLocaleDateString('nl-NL')} {new Date(game.date).toLocaleTimeString('nl-NL')}
                  </div>
                  <div className="text-sm space-y-1 mb-3">
                    <div className="font-semibold text-green-600">Score: {totalGoals} - {totalOpponentGoals}</div>
                    <div>Onze Doelpunten: {totalGoals}</div>
                    <div>Tegenstander Doelpunten: {totalOpponentGoals}</div>
                    <div>Reddingen: {totalSaves}</div>
                    <div>Spelers: {game.playersPresent.length}</div>
                    <div>Ouders: {game.parentsPresent.length}</div>
                  </div>
                  {Object.keys(goalsByPlayer).length > 0 && (
                    <div className="border-t pt-2">
                      <div className="font-semibold text-sm mb-1">Doelpuntenmakers:</div>
                      <div className="text-sm space-y-1">
                        {Object.entries(goalsByPlayer).map(([playerId, goals]) => (
                          <div key={playerId}>
                            ⚽ {getPlayerName(parseInt(playerId))} ({goals})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'game' && currentGame) {
    return (
      <div className="min-h-screen bg-green-50 p-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setView('dashboard')}
            className="mb-4 text-yellow-600 hover:text-yellow-800 font-semibold"
          >
            ← Terug
          </button>
          <h2 className="text-2xl font-bold text-green-800 mb-4">Huidige Wedstrijd</h2>
          
          {/* Player Selection */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Users size={20} />
              Selecteer Aanwezige Spelers
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {players.map(player => (
                <button
                  key={player.id}
                  onClick={() => togglePlayerPresent(player.id)}
                  className={`p-3 rounded-lg font-medium ${
                    currentGame.playersPresent.includes(player.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {player.name}
                </button>
              ))}
            </div>
          </div>

          {/* Parent Attendance */}
          {parents.length > 0 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <UserCheck size={20} />
                Aanwezige Ouders
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {parents.map(parent => (
                  <button
                    key={parent.id}
                    onClick={() => toggleParentPresent(parent.id)}
                    className={`p-3 rounded-lg font-medium ${
                      currentGame.parentsPresent.includes(parent.id)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {parent.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quarters */}
          {currentGame.quarters.map((quarter, qIndex) => (
            <div key={quarter.number} className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-bold text-xl mb-3">Kwart {quarter.number}</h3>
              
              {/* Goalkeeper Selection for this quarter */}
              {currentGame.playersPresent.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={20} />
                    <span className="font-semibold">Doelman</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {players
                      .filter(p => currentGame.playersPresent.includes(p.id))
                      .map(player => (
                        <button
                          key={player.id}
                          onClick={() => setGoalkeeper(qIndex, player.id)}
                          className={`p-2 rounded-lg font-medium text-sm ${
                            quarter.goalkeeper === player.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {player.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Goals */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={20} />
                  <span className="font-semibold">Onze Doelpunten ({quarter.goals.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {players
                    .filter(p => currentGame.playersPresent.includes(p.id))
                    .map(player => (
                      <button
                        key={player.id}
                        onClick={() => addGoal(qIndex, player.id)}
                        className="bg-green-100 hover:bg-green-200 p-3 rounded-lg font-medium text-sm"
                      >
                        {player.name}
                      </button>
                    ))}
                </div>
                {quarter.goals.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    {quarter.goals.map((goalPlayerId, idx) => (
                      <div key={idx}>⚽ {getPlayerName(goalPlayerId)}</div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Saves */}
              {quarter.goalkeeper && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={20} />
                    <span className="font-semibold">Reddingen door {getPlayerName(quarter.goalkeeper)}: {quarter.saves}</span>
                  </div>
                  <button
                    onClick={() => addSave(qIndex)}
                    className="bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium"
                  >
                    Redding Toevoegen
                  </button>
                </div>
              )}
              
              {/* Opponent Goals */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">Tegenstander Doelpunten: {quarter.opponentGoals}</span>
                </div>
                <button
                  onClick={() => addOpponentGoal(qIndex)}
                  className="bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg font-medium text-red-700"
                >
                  Tegenstander Doelpunt Toevoegen
                </button>
              </div>
            </div>
          ))}

          {/* Save Game Button */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-300 p-4">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={saveGame}
                className="w-full bg-green-600 text-white py-4 px-6 rounded-lg text-xl font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Save size={24} />
                Wedstrijd Opslaan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}