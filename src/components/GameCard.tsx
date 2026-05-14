import { useEffect, useState } from 'react';
import { Game } from '../types';
import { fetchTeamStatsReal, fetchSpecialRecordsReal } from '../api/mlbApi';
import { getTeamLogoUrl, getChineseTeamName } from '../utils/teamUtils';
import './GameCard.css';

interface Props {
  game: Game;
  onClick: () => void;
}

export function GameCard({ game, onClick }: Props) {
  const [awayStats, setAwayStats] = useState<any>(null);
  const [homeStats, setHomeStats] = useState<any>(null);
  const [specialRecords, setSpecialRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAdvancedStats = async () => {
      try {
        setError(null);
        const dateStr = game.gameDate.split('T')[0];
        const [away, home, records] = await Promise.all([
          fetchTeamStatsReal(game.teams.away.team.id, dateStr),
          fetchTeamStatsReal(game.teams.home.team.id, dateStr),
          fetchSpecialRecordsReal(game.gamePk)
        ]);
        
        setAwayStats(away);
        setHomeStats(home);
        setSpecialRecords(records);
      } catch (err: any) {
        console.error('Data fetch error:', err);
        setError('連線失敗 (API Error)');
      }
    };
    loadAdvancedStats();
  }, [game]);

  const renderTeamInfo = (teamInfo: any, stats: any) => {
    if (error) return <div className="team-error">{error}</div>;
    if (!stats) return <div className="team-skeleton">載入中...</div>;
    
    return (
      <div className="team-info">
        <div className="team-name-row">
          <img src={getTeamLogoUrl(teamInfo.team.id)} alt={teamInfo.team.name} className="team-logo-small" />
          <div className="team-name-container">
            <span className="team-name">{getChineseTeamName(teamInfo.team.id, teamInfo.team.name)}</span>
            <span className="team-name-en">{teamInfo.team.name}</span>
          </div>
        </div>
        <div className="team-record">
          {teamInfo.leagueRecord.wins}勝 - {teamInfo.leagueRecord.losses}敗
        </div>
        <div className="status-tags">
          {stats.ilAlert && <span className="tag il">傷兵警報 (IL)</span>}
          {!stats.ilAlert && <span className="tag complete">人員齊全</span>}
        </div>
        {teamInfo.score !== undefined && (
          <div className="team-score">{teamInfo.score}</div>
        )}
      </div>
    );
  };

  return (
    <div className="game-card glass-panel" onClick={onClick}>
      <div className="game-status">
        <span>{game.status.detailedState} <span style={{marginLeft: '8px', color: '#60a5fa'}}>{game.gameDate.split('T')[1].substring(0, 5)} (UTC)</span></span>
        {specialRecords.length > 0 && (
          <div className="special-record-alert">
            {specialRecords.map((r, i) => <div key={i}>{r.message}</div>)}
          </div>
        )}
      </div>
      
      <div className="teams-container">
        {renderTeamInfo(game.teams.away, awayStats)}
        <div className="vs">VS</div>
        {renderTeamInfo(game.teams.home, homeStats)}
      </div>
    </div>
  );
}
