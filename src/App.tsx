import { useState, useEffect, useRef } from 'react';
import type { Player, Game } from './types';
import { Dashboard } from './components/Dashboard';
import { Navigation } from './components/Navigation';
import { GameHistory } from './components/GameHistory';
import { LiveMatch } from './components/LiveMatch';
import { Settings } from './components/Settings';

// Importeer Firebase config en Firestore functies
import { db } from './firebase'; 
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { getSeasonId } from './utils/season';

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  const [view, setView] = useState('dashboard');
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [editBackup, setEditBackup] = useState<Game | null>(null);
  const [editReturnView, setEditReturnView] = useState<'dashboard' | 'history'>('dashboard');
  // Welke wedstrijd er opengeklapt moet staan bij het navigeren naar Wedstrijden vanuit het Dashboard.
  const [expandGameId, setExpandGameId] = useState<number | null>(null);

  const viewGameInHistory = (game: Game) => {
    setExpandGameId(game.id as number);
    setView('history');
  };

  // ADMIN MODE: standaard uit, activeren/deactiveren door 3x op het clublogo te tikken
  const [isAdminMode, setIsAdminMode] = useState(false);
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<number | null>(null);

  const handleLogoTap = () => {
    logoTapCountRef.current += 1;

    if (logoTapTimerRef.current) {
      window.clearTimeout(logoTapTimerRef.current);
      logoTapTimerRef.current = null;
    }

    if (logoTapCountRef.current >= 3) {
      setIsAdminMode(prev => !prev);
      logoTapCountRef.current = 0;
    } else {
      logoTapTimerRef.current = window.setTimeout(() => {
        logoTapCountRef.current = 0;
      }, 1000);
    }
  };

  // 1. DATA OPHALEN UIT FIRESTORE (Real-time)
  useEffect(() => {
    // Luister naar Spelers
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ ...doc.data() } as Player)));
    });

    // Luister naar Wedstrijden (gesorteerd op datum)
    const qGames = query(collection(db, "games"), orderBy("date", "desc"));
    const unsubGames = onSnapshot(qGames, (snapshot) => {
      setGames(snapshot.docs.map(doc => ({ ...doc.data() } as Game)));
    });

    return () => {
      unsubPlayers();
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

  const editGame = (game: Game, returnView: 'dashboard' | 'history' = 'history') => {
    setEditBackup(JSON.parse(JSON.stringify(game)));
    setEditReturnView(returnView);
    setCurrentGame(game);
    setView('game');
  };

  // 4. START NIEUWE WEDSTRIJD
  const startNewGame = async () => {
    if (players.length === 0) return;
    
    const newId = Date.now();
    const now = new Date();
    const game: Game = {
      id: newId,
      date: now.toISOString(),
      seasonId: getSeasonId(now),
      // Status 'setup' zorgt dat hij nog NIET op het live-dashboard verschijnt
      status: 'setup',
      quarters: [1, 2, 3, 4].map(n => ({
        number: n,
        goalEvents: [],
        tackleEvents: [],
        saveEvents: [],
        opponentGoalEvents: [],
        substitutes: [],   // Belangrijk voor wissel-logica
        substitutions: [], // Belangrijk voor pijl-logica
        lineup: {}         // Basisopstelling, wordt aan het begin van het kwart ingevuld
      })),
      playersPresent: players.map(p => p.id),
      parentsPresent: [],
      opponent: '',
      isAway: false,
      notes: ''
    };

    try {
      // We maken het document direct aan in de DB zodat LiveMatch kan syncen
      await setDoc(doc(db, "games", newId.toString()), game);
      setEditBackup(null);
      setEditReturnView('dashboard');
      setCurrentGame(game);
      setView('game');
    } catch (error) {
      console.error("Fout bij aanmaken wedstrijd:", error);
    }
  };

  // 5. WEDSTRIJD DEFINITIEF OPSLAAN
  const saveGame = async () => {
    if (currentGame) {
      try {
        // Eindresultaat vastleggen zodat dit later niet telkens herberekend moet worden
        // uit de kwarten (handig voor rapportages/AI-analyses over het seizoen).
        const finalScoreFor = currentGame.quarters.reduce((sum, q) => sum + (q.goalEvents?.length || 0), 0);
        const finalScoreAgainst = currentGame.quarters.reduce((sum, q) => sum + (q.opponentGoalEvents?.length || 0), 0);
        const result = finalScoreFor > finalScoreAgainst ? 'win' : finalScoreFor < finalScoreAgainst ? 'loss' : 'draw';

        // De status wordt in LiveMatch.tsx al op 'finished' gezet bij de laatste stap,
        // maar voor de zekerheid forceren we het hier nogmaals bij het afsluiten.
        const finalGame: Game = { ...currentGame, status: 'finished', finalScoreFor, finalScoreAgainst, result };
        await setDoc(doc(db, "games", currentGame.id.toString()), finalGame);
        setCurrentGame(null);
        setEditBackup(null);
        setView('dashboard');
      } catch (error) {
        console.error("Fout bij opslaan:", error);
        alert("Kon de wedstrijd niet opslaan.");
      }
    }
  };

  return (
    <div className={`min-h-screen ${view === 'dashboard' ? 'bg-[#04174C]/5' : 'bg-gray-50'} pb-24`}>
      {view === 'dashboard' && (
        <Dashboard
          players={players}
          games={games}
          startNewGame={startNewGame}
          canStart={players.length > 0}
          isAdminMode={isAdminMode}
          onLogoTap={handleLogoTap}
          onEditGame={(game) => editGame(game, 'dashboard')}
          onViewGame={viewGameInHistory}
        />
      )}

      {view === 'settings' && (
        <Settings
          players={players}
          games={games}
          isAdminMode={isAdminMode}
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
          isAdminMode={isAdminMode}
          initialExpandedGameId={expandGameId}
          onExpandConsumed={() => setExpandGameId(null)}
        />
      )}

      {view === 'game' && currentGame && (
        <LiveMatch 
          currentGame={currentGame} 
          players={players} 
          onUpdateGame={setCurrentGame} 
          onSave={saveGame}
          onCancel={async () => {
            if (currentGame) {
              try {
                const gameRef = doc(db, "games", currentGame.id.toString());
                if (editBackup) {
                  // Bewerken geannuleerd: oorspronkelijke (finished) wedstrijd terugzetten
                  await setDoc(gameRef, editBackup);
                } else {
                  await updateDoc(gameRef, { status: 'cancelled' });
                }
              } catch (error) {
                console.error("Fout bij annuleren:", error);
              }
            }
            const returnView = editBackup ? editReturnView : 'dashboard';
            setCurrentGame(null);
            setEditBackup(null);
            setView(returnView);
          }}
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