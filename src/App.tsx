import { useState, useEffect } from 'react';
import { ScheduleHeader } from './components/ScheduleHeader';
import { GameCard } from './components/GameCard';
import { StatsDashboard } from './components/StatsDashboard';
import { fetchSchedule } from './api/mlbApi';
import { Game } from './types';
import './App.css';

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const data = await fetchSchedule(dateStr);
        if (data.dates && data.dates.length > 0) {
          setGames(data.dates[0].games);
        } else {
          setGames([]);
        }
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSchedule();
    setSelectedGame(null); // Reset selection on date change
  }, [selectedDate]);

  return (
    <div className="app-container">
      <header className="main-header">
        <h1>MLB 賽事預測引擎 (Prediction Engine)</h1>
        <p className="subtitle">進階數據與分析 (Advanced Stats & Analysis)</p>
      </header>

      <ScheduleHeader 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
      />

      <main className="content-layout">
        <div className="games-list">
          {loading ? (
            <div className="loading-state">載入賽程中 (Loading schedule)...</div>
          ) : games.length === 0 ? (
            <div className="empty-state">本日無安排賽事 (No games scheduled).</div>
          ) : (
            games.map(game => (
              <GameCard 
                key={game.gamePk} 
                game={game} 
                onClick={() => setSelectedGame(game)}
              />
            ))
          )}
        </div>

        <div className="dashboard-container">
          {selectedGame ? (
            <StatsDashboard 
              game={selectedGame} 
              onClose={() => setSelectedGame(null)} 
            />
          ) : (
            <div className="dashboard-placeholder glass-panel">
              請在左側選擇一場賽事來檢視進階預測數據
              <br/>
              <span style={{fontSize: '0.8rem', opacity: 0.7}}>(Select a game to view advanced stats)</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
