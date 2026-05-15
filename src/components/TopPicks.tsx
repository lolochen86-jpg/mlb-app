import { Game } from '../types';
import { getChineseTeamName, getTeamLogoUrl } from '../utils/teamUtils';
import './TopPicks.css';

interface TopPick {
  game: Game;
  score: number;
  reason: string;
  awayPred: string;
  homePred: string;
}

interface Props {
  picks: TopPick[];
  onSelect: (game: Game) => void;
}

export function TopPicks({ picks, onSelect }: Props) {
  return (
    <div className="top-picks-section">
      <div className="section-header">
        <span className="fire-icon">🔥</span>
        <h3>今日最推 (Top Picks of the Day)</h3>
        <span className="formula-tag">AI 數據分析結果</span>
      </div>
      
      {picks.length === 0 ? (
        <div className="picks-placeholder glass-panel">
          數據分析引擎運算中，請稍候...
          <br/>
          <span style={{fontSize: '0.8rem', opacity: 0.6}}>(AI is calculating the best value games)</span>
        </div>
      ) : (
        <div className="picks-grid">
          {picks.map((pick, i) => (
            <div key={i} className="pick-card glass-panel" onClick={() => onSelect(pick.game)}>
              <div className="pick-rank">TOP {i + 1}</div>
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
                <div className="pick-reason">{pick.reason}</div>
                <div className="pick-prediction">
                  預測比分: {pick.awayPred} - {pick.homePred}
                </div>
              </div>
              <div className="pick-confidence">
                推薦指數: <span className="score-val">{Math.round(pick.score)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
