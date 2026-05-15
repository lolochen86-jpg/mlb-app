import { useState, useEffect } from 'react';
import { ScheduleHeader } from './components/ScheduleHeader';
import { GameCard } from './components/GameCard';
import { StatsDashboard } from './components/StatsDashboard';
import { fetchSchedule, getDailyTopPicks } from './api/mlbApi';
import { Game } from './types';
import { getTeamLogoUrl, getChineseTeamName } from './utils/teamUtils';
import './App.css';
import './components/TopPicks.css';

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [games, setGames] = useState<Game[]>([]);
  const [topPicks, setTopPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    
    const loadSchedule = async () => {
      setLoading(true);
      setLoadingPicks(true);
      setTopPicks([]);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const data = await fetchSchedule(dateStr);
        let gamesList: Game[] = [];
        
        if (data.dates && data.dates.length > 0) {
          gamesList = data.dates[0].games;
          setGames(gamesList);
          
          // 加載賽程後立即分析最推場次
          const picks = await getDailyTopPicks(gamesList, dateStr);
          setTopPicks(picks);
        } else {
          setGames([]);
        }
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
        setLoadingPicks(false);
      }
    };
    
    loadSchedule();
    setSelectedGame(null); 
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

      {/* 今日最推區塊 - 恢復專業質感 */}
      <div className="top-picks-section">
        <div className="section-header">
          <span className="fire-icon">🔥</span>
          <h3>今日最推 (Top Picks of the Day)</h3>
          <span className="formula-tag">AI 數據分析結果</span>
        </div>
        
        {loadingPicks || topPicks.length === 0 ? (
          <div className="picks-placeholder glass-panel">
            {loadingPicks ? 'AI 數據分析引擎運算中...' : '本日數據分析完畢，暫無高信心場次'}
          </div>
        ) : (
          <div className="picks-grid">
            {topPicks.map((pick, i) => {
              const awayScore = parseFloat(pick.awayPred);
              const homeScore = parseFloat(pick.homePred);
              const winnerId = awayScore > homeScore ? pick.game.teams.away.team.id : pick.game.teams.home.team.id;
              const winnerName = getChineseTeamName(winnerId, awayScore > homeScore ? pick.game.teams.away.team.name : pick.game.teams.home.team.name);
              
              return (
                <div key={i} className="pick-card glass-panel" onClick={() => setSelectedGame(pick.game)}>
                  <div className="pick-rank">TOP {i + 1}</div>
                  <div className="pick-winner-tag">推薦：{winnerName} 勝</div>
                  <div className="pick-teams">
                    <div className="pick-team">
                      <img src={getTeamLogoUrl(pick.game.teams.away.team.id)} alt="away" />
                      <span>{getChineseTeamName(pick.game.teams.away.team.id, pick.game.teams.away.team.name)}</span>
                    </div>
                    <div className="pick-vs">VS</div>
                    <div className="pick-team">
                      <img src={getTeamLogoUrl(pick.game.teams.home.team.id)} alt="home" />
                      <span>{getChineseTeamName(pick.game.teams.home.team.id, pick.game.teams.home.team.name)}</span>
                    </div>
                  </div>
                  <div className="pick-info">
                    <div className="pick-prediction">預測比分: {pick.awayPred} - {pick.homePred}</div>
                  </div>
                  <div className="pick-confidence">
                    信心指數: <span className="score-val">{Math.round(pick.score)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


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
