import { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import CarGarage from './components/CarGarage.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import './styles/app.css';

// Views: 'login' | 'garage' | 'game' | 'leaderboard'
export default function App() {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('carDodgeUser');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
        setView('garage');
      } catch {
        localStorage.removeItem('carDodgeUser');
      }
    }
  }, []);

  function handleLogin(user) {
    setCurrentUser(user);
    localStorage.setItem('carDodgeUser', JSON.stringify(user));
    setView('garage');
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem('carDodgeUser');
    localStorage.removeItem('selectedCarId');
    setView('login');
  }

  function handleStartGame() {
    setView('game');
  }

  function handleGameOver() {
    setView('garage');
  }

  return (
    <div className="app-root" data-view={view}>
      {view === 'login' && <Login onLogin={handleLogin} />}

      {view === 'garage' && currentUser && (
        <CarGarage
          user={currentUser}
          onStartGame={handleStartGame}
          onViewLeaderboard={() => setView('leaderboard')}
          onLogout={handleLogout}
        />
      )}

      {view === 'game' && currentUser && (
        <GameCanvas
          user={currentUser}
          onGameOver={handleGameOver}
        />
      )}

      {view === 'leaderboard' && (
        <Leaderboard onBack={() => setView('garage')} />
      )}
    </div>
  );
}
