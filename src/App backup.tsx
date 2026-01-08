import { useState, useEffect } from 'react';
import type { Player, Parent, Game } from './types';
import { Dashboard } from './components/Dashboard';
import { Navigation } from './components/Navigation';
import { GameHistory } from './components/GameHistory';
import { LiveMatch } from './components/LiveMatch'; // Nieuwe import
import { Settings } from './components/Settings';

export default function App() {
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

  const [view, setView] = useState('dashboard');
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  useEffect(() => {
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('parents', JSON.stringify(parents));
    localStorage.setItem('games', JSON.stringify(games));
  }, [players, parents, games]);

  // NIEUW: Functie om een wedstrijd te verwijderen
  const deleteGame = (id: number) => {
    setGames(games.filter(g => g.id !== id));
  };

  // NIEUW: Functie om een bestaande wedstrijd te bewerken
  const editGame = (game: Game) => {
    setCurrentGame(game);
    setView('game');
  };

  const startNewGame = () => {
    if (players.length === 0) return;
    const game: Game = {
      id: Date.now(),
      date: new Date().toISOString(),
      quarters: [1, 2, 3, 4].map(n => ({ 
        number: n, goals: [], tackles: [], saves: 0, goalkeeper: null, opponentGoals: 0 
      })),
      playersPresent: players.map(p => p.id), 
      parentsPresent: [],
      opponent: '',
      isAway: false,
      notes: ''
    };
    setCurrentGame(game);
    setView('game');
  };

  const saveGame = () => {
    if (currentGame) {
      setGames(prevGames => {
        // Check of de game al bestaat in de lijst
        const exists = prevGames.find(g => g.id === currentGame.id);
        if (exists) {
          // Update bestaande game
          return prevGames.map(g => g.id === currentGame.id ? currentGame : g);
        }
        // Voeg nieuwe game toe bovenaan
        return [currentGame, ...prevGames];
      });
      setCurrentGame(null);
      setView('dashboard');
    }
  };

  return (
    <div className={`min-h-screen ${view === 'dashboard' ? 'bg-[#04174C]/5' : 'bg-gray-50'} pb-24`}>
      {view === 'dashboard' && (
        <Dashboard 
          players={players}
          parents={parents} 
          games={games} 
          startNewGame={startNewGame} 
          canStart={players.length > 0} 
        />
      )}
      {view === 'settings' && (
        <Settings 
          players={players} 
          parents={parents} 
          setPlayers={setPlayers} 
          setParents={setParents} 
        />
      )}

      {/*onDeleteGame toegevoegd aan GameHistory */}
      {view === 'history' && (
        <GameHistory 
          games={games} 
          players={players} 
          onDeleteGame={deleteGame} 
          onEditGame={editGame}
          startNewGame={startNewGame}
          canStart={players.length > 0}
        />
      )}
      
      {view === 'game' && currentGame && (
        <LiveMatch 
          currentGame={currentGame} 
          players={players} 
          parents={parents}
          onUpdateGame={setCurrentGame} 
          onSave={saveGame}
          onCancel={() => { setCurrentGame(null); setView('dashboard'); }}
        />
      )}

      {view !== 'game' && (
        <Navigation 
          view={view} 
          setView={setView} 
        />
      )}
    </div>
  );
}