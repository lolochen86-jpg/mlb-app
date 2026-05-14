import { useEffect, useState } from 'react';
import { Game } from '../types';
import { fetchTeamStatsReal } from '../api/mlbApi';
import { LineChart } from './LineChart';
import { getTeamLogoUrl, getChineseTeamName } from '../utils/teamUtils';
import './StatsDashboard.css';

interface Props {
  game: Game;
  onClose: () => void;
}

type ChartTab = '15games' | 'season' | 'monthly';

export function StatsDashboard({ game, onClose }: Props) {
  const [awayStats, setAwayStats] = useState<any>(null);
  const [homeStats, setHomeStats] = useState<any>(null);
  const [chartTab, setChartTab] = useState<ChartTab>('15games');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setError(null);
        const dateStr = game.gameDate.split('T')[0];
        const [away, home] = await Promise.all([
          fetchTeamStatsReal(game.teams.away.team.id, dateStr),
          fetchTeamStatsReal(game.teams.home.team.id, dateStr)
        ]);
        setAwayStats(away);
        setHomeStats(home);
      } catch (err: any) {
        setError('數據分析加載失敗，請檢查網路連線 (API Connection Failed)');
      }
    };
    loadStats();
  }, [game]);

  if (error) return (
    <div className="stats-dashboard glass-panel error-panel">
      <h3>⚠️ 連線不穩定</h3>
      <p>{error}</p>
      <button onClick={onClose}>關閉面板</button>
    </div>
  );

  if (!awayStats || !homeStats) return <div className="stats-dashboard glass-panel">數據載入中 (Loading Data)...</div>;

  const renderTeamStats = (stats: any, teamInfo: any, type: string) => {
    let scoreLines = [];
    let raLines = [];
    let labels: string[] = [];

    if (chartTab === '15games') {
      labels = Array.from({length: 15}, (_, i) => {
        const val = 15 - i;
        return (val === 15 || val === 10 || val === 5 || val === 1) ? val.toString() : '';
      });
      scoreLines = [
        { data: stats.scoreHistory, color: 'rgba(255,255,255,0.4)', label: '當場得分', showLine: false },
        { data: stats.scoreMA5, color: '#ef4444', label: '5MA' },
        { data: stats.scoreMA10, color: '#f97316', label: '10MA' },
        { data: stats.scoreMA15, color: '#eab308', label: '15MA' },
      ];
      raLines = [
        { data: stats.raHistory, color: 'rgba(255,255,255,0.4)', label: '當場失分', showLine: false },
        { data: stats.raMA5, color: '#3b82f6', label: '5MA' },
        { data: stats.raMA10, color: '#06b6d4', label: '10MA' },
        { data: stats.raMA15, color: '#10b981', label: '15MA' },
      ];
    } else if (chartTab === 'season') {
      labels = Array.from({length: stats.seasonScoreMA15.length}, (_, i) => i % 10 === 0 ? `G${i+1}` : '');
      scoreLines = [{ data: stats.seasonScoreMA15, color: '#ef4444', label: '得分 15MA' }];
      raLines = [{ data: stats.seasonRaMA15, color: '#3b82f6', label: '失分 15MA' }];
    } else {
      labels = ['4月', '5月', '6月', '7月', '8月', '9月'];
      scoreLines = [{ data: stats.monthlyScoreMA, color: '#ef4444', label: '月均得分' }];
      raLines = [{ data: stats.monthlyRaMA, color: '#3b82f6', label: '月均失分' }];
    }

    return (
      <div className="team-column">
        <div className="dashboard-team-header">
          <img src={getTeamLogoUrl(teamInfo.team.id)} alt={`${type} logo`} className="team-logo-large" />
          <div>
            <h4>{getChineseTeamName(teamInfo.team.id, teamInfo.team.name)} ({type})</h4>
            <div className="team-name-en-sub">{teamInfo.team.name}</div>
          </div>
        </div>
        
        <div className="charts-container">
          <LineChart lines={scoreLines} labels={labels} title="得分趨勢 (Runs Scored Trend)" />
          <LineChart lines={raLines} labels={labels} title="失分趨勢 (Runs Allowed Trend)" />
        </div>

        <div className="stat-group-title">加分項 (Offense Factors)</div>
        <div className="stat-row">
          <span className="stat-label">近 5/10/15 場均得</span>
          <span className="stat-value highlight">{stats.last5GamesAvg} / {stats.last10GamesAvg} / {stats.last15GamesAvg}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">團隊打擊率 (Team AVG)</span>
          <span className="stat-value">{stats.teamBattingAvg}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">得點圈打擊率 (RISP)</span>
          <span className="stat-value">{stats.risp}</span>
        </div>

        <div className="stat-group-title">守分項 (Defense Factors)</div>
        <div className="stat-row">
          <span className="stat-label">近 5/10/15 場均失</span>
          <span className="stat-value" style={{color: '#60a5fa'}}>{stats.last5RaAvg} / {stats.last10RaAvg} / {stats.last15RaAvg}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">先發防禦率 (Starter ERA)</span>
          <span className="stat-value">{stats.era}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">牛棚防禦率 (Bullpen ERA)</span>
          <span className="stat-value">{stats.bullpenEra}</span>
        </div>
        
        <div className="stat-group-title">人員與傷兵 (Roster & Injuries)</div>
        {stats.injuries.length > 0 ? (
          <div className="injury-list">
            {stats.injuries.map((inj: any, i: number) => (
              <div key={i} className="injury-item">
                <span className="injury-name">{inj.name}</span>
                <span className="injury-impact">{inj.impact}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="stat-row">
            <span className="stat-label">傷兵名單 (IL)</span>
            <span className="stat-value" style={{color: '#4ade80'}}>人員齊全</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="stats-dashboard glass-panel">
      <div className="dashboard-header">
        <h3>對戰數據分析 (Matchup Analysis)</h3>
        <div className="chart-tabs">
          <button className={chartTab === '15games' ? 'active' : ''} onClick={() => setChartTab('15games')}>近15場</button>
          <button className={chartTab === 'monthly' ? 'active' : ''} onClick={() => setChartTab('monthly')}>月份走勢</button>
          <button className={chartTab === 'season' ? 'active' : ''} onClick={() => setChartTab('season')}>整季走勢</button>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="stats-comparison">
        {renderTeamStats(awayStats, game.teams.away, '客隊')}
        <div className="vs-divider"></div>
        {renderTeamStats(homeStats, game.teams.home, '主隊')}
      </div>
      
      <div className="prediction-engine">
        <h4>預測得分引擎 (Prediction Engine)</h4>
        <div className="prediction-content">
          <p>⚠️ 僅限真實數據計算，若數據不足則停止分析</p>
          <div className="score-prediction">
            <div className="predicted-score">
              {getChineseTeamName(game.teams.away.team.id, game.teams.away.team.name)}
              <strong>{Math.round(parseFloat(awayStats.last15GamesAvg) * 1.05 + parseFloat(homeStats.last15RaAvg) * 0.95) / 2}</strong>
            </div>
            <span>-</span>
            <div className="predicted-score">
              {getChineseTeamName(game.teams.home.team.id, game.teams.home.team.name)}
              <strong>{Math.round(parseFloat(homeStats.last15GamesAvg) * 1.05 + parseFloat(awayStats.last15RaAvg) * 0.95) / 2}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
