import { useState, useEffect } from 'react';
import type { Player, Parent, Game } from './types';
import { Dashboard } from './components/Dashboard';
import { Navigation } from './components/Navigation';
import { GameHistory } from './components/GameHistory';
import { LiveMatch } from './components/LiveMatch';
import { Settings } from './components/Settings';

// Importeer Firebase config en Firestore functies
import { db } from './firebase'; 
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  const [view, setView] = useState('dashboard');
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  // 1. DATA OPHALEN UIT FIRESTORE (Real-time)
  useEffect(() => {
    // Luister naar Spelers
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ ...doc.data() } as Player)));
    });

    // Luister naar Ouders
    const unsubParents = onSnapshot(collection(db, "parents"), (snapshot) => {
      setParents(snapshot.docs.map(doc => ({ ...doc.data() } as Parent)));
    });

    // Luister naar Wedstrijden (gesorteerd op datum)
    const qGames = query(collection(db, "games"), orderBy("date", "desc"));
    const unsubGames = onSnapshot(qGames, (snapshot) => {
      setGames(snapshot.docs.map(doc => ({ ...doc.data() } as Game)));
    });

    // Cleanup subscriptions
    return () => {
      unsubPlayers();
      unsubParents();
      unsubGames();
    };
  }, []);

  // 3. WEDSTRIJD VERWIJDEREN
  const deleteGame = async (id: number) => {
    try {
      await deleteDoc(doc(db, "games", id.toString()));
    } catch (error) {
      console.error("Fout bij verwijderen:", error);
    }
  };

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
        number: n, goals: [], tackles: [], assists: [], saves: 0, goalkeeper: null, opponentGoals: 0 
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

  // 4. WEDSTRIJD OPSLAAN IN CLOUD
  const saveGame = async () => {
    if (currentGame) {
      try {
        // setDoc met { merge: true } update de game als het ID al bestaat, anders maakt hij een nieuwe.
        await setDoc(doc(db, "games", currentGame.id.toString()), currentGame);
        setCurrentGame(null);
        setView('dashboard');
      } catch (error) {
        console.error("Fout bij opslaan:", error);
        alert("Kon de wedstrijd niet opslaan in de database.");
      }
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
        />
      )}

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