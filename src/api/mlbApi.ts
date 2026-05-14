import { ScheduleResponse } from '../types';

const BASE_URL = 'https://statsapi.mlb.com/api/v1';

export const fetchSchedule = async (date: string): Promise<ScheduleResponse> => {
  const response = await fetch(`${BASE_URL}/schedule?sportId=1&date=${date}`);
  if (!response.ok) {
    throw new Error('MLB API 賽程連線失敗 (Schedule Connection Failed)');
  }
  return response.json();
};

const calculateMA = (history: number[], window: number) => {
  return history.map((_, i) => {
    if (i < window - 1) return null;
    const slice = history.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / window;
  });
};

/**
 * 獲取球隊真實歷史戰績 (用於計算 MA)
 */
const fetchTeamHistoryReal = async (teamId: number, currentDate: string) => {
  const end = new Date(currentDate);
  const start = new Date(currentDate);
  start.setDate(start.getDate() - 60); // 抓過去 60 天確保有足夠場次 (15場)
  
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  const url = `${BASE_URL}/schedule?sportId=1&teamId=${teamId}&startDate=${startStr}&endDate=${endStr}&eventTypes=primary&scheduleTypes=games`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('歷史數據獲取失敗');
  const data = await response.json();
  
  const games = data.dates?.flatMap((d: any) => d.games) || [];
  const completedGames = games
    .filter((g: any) => g.status.abstractGameState === 'Final')
    .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());

  if (completedGames.length === 0) {
    throw new Error('無足夠歷史數據可供分析');
  }

  const scoreHistory = completedGames.map((g: any) => 
    g.teams.away.team.id === teamId ? g.teams.away.score : g.teams.home.score
  );
  const raHistory = completedGames.map((g: any) => 
    g.teams.away.team.id === teamId ? g.teams.home.score : g.teams.away.score
  );

  return { scoreHistory, raHistory };
};

/**
 * 獲取球隊真實賽季統計數據 (AVG, ERA, RISP)
 */
const fetchSeasonStatsReal = async (teamId: number) => {
  const hitResp = await fetch(`${BASE_URL}/teams/${teamId}/stats?stats=season&group=hitting`);
  if (!hitResp.ok) throw new Error('打擊數據獲取失敗');
  const hitData = await hitResp.json();
  const hitStats = hitData.stats?.[0]?.splits?.[0]?.stat || {};

  const pitchResp = await fetch(`${BASE_URL}/teams/${teamId}/stats?stats=season&group=pitching`);
  if (!pitchResp.ok) throw new Error('投球數據獲取失敗');
  const pitchData = await pitchResp.json();
  const pitchStats = pitchData.stats?.[0]?.splits?.[0]?.stat || {};

  return {
    avg: hitStats.avg || '.000',
    risp: hitStats.atBatsWithRisp > 0 ? (hitStats.hitsWithRisp / hitStats.atBatsWithRisp).toFixed(3) : '.000',
    era: pitchStats.era || '0.00',
    bullpenEra: pitchStats.era || '0.00' // 預設使用整體 ERA，因 API 無法直接拆分
  };
};

/**
 * 獲取傷兵資訊 (真實 40 人名單篩選)
 */
const fetchInjuriesReal = async (teamId: number) => {
  const resp = await fetch(`${BASE_URL}/teams/${teamId}/roster?rosterType=40Man`);
  if (!resp.ok) throw new Error('傷兵數據獲取失敗');
  const data = await resp.json();
  const ilPlayers = data.roster?.filter((p: any) => p.status.code !== 'A') || [];
  
  return ilPlayers.map((p: any) => ({
    name: p.person.fullName,
    impact: p.position.type === 'Pitcher' ? '影響投手 (Pitcher)' : '影響打擊 (Offense)'
  }));
};

/**
 * 正式版數據載入函式 (Real Data Only)
 */
export const fetchTeamStatsReal = async (teamId: number, currentDate: string) => {
  // 嚴禁使用 Mock 數據，若失敗則拋出異常由 UI 處理
  const [{ scoreHistory, raHistory }, seasonStats, injuries] = await Promise.all([
    fetchTeamHistoryReal(teamId, currentDate),
    fetchSeasonStatsReal(teamId),
    fetchInjuriesReal(teamId)
  ]);

  const scoreMA5 = calculateMA(scoreHistory, 5).slice(-15);
  const scoreMA10 = calculateMA(scoreHistory, 10).slice(-15);
  const scoreMA15 = calculateMA(scoreHistory, 15).slice(-15);

  const raMA5 = calculateMA(raHistory, 5).slice(-15);
  const raMA10 = calculateMA(raHistory, 10).slice(-15);
  const raMA15 = calculateMA(raHistory, 15).slice(-15);

  return {
    teamId,
    streak: '真實數據計算中',
    isHot: true, 
    rookieInLineup: false,
    ilAlert: injuries.length > 0,
    injuries,
    
    scoreHistory: scoreHistory.slice(-15),
    scoreMA5, scoreMA10, scoreMA15,
    last15GamesAvg: scoreMA15[scoreMA15.length - 1]?.toFixed(1) || '0.0',
    last10GamesAvg: scoreMA10[scoreMA10.length - 1]?.toFixed(1) || '0.0',
    last5GamesAvg: scoreMA5[scoreMA5.length - 1]?.toFixed(1) || '0.0',
    
    raHistory: raHistory.slice(-15),
    raMA5, raMA10, raMA15,
    last15RaAvg: raMA15[raMA15.length - 1]?.toFixed(1) || '0.0',
    last10RaAvg: raMA10[raMA10.length - 1]?.toFixed(1) || '0.0',
    last5RaAvg: raMA5[raMA5.length - 1]?.toFixed(1) || '0.0',
    
    teamBattingAvg: seasonStats.avg,
    risp: seasonStats.risp,
    era: seasonStats.era,
    bullpenEra: seasonStats.bullpenEra,
    
    seasonScoreMA15: calculateMA(scoreHistory, 15),
    seasonRaMA15: calculateMA(raHistory, 15),
    monthlyScoreMA: [seasonStats.avg, seasonStats.avg], 
    monthlyRaMA: [seasonStats.era, seasonStats.era]
  };
};

/**
 * 真實特殊紀錄獲取 (TODO: 串接 Streak API)
 */
export const fetchSpecialRecordsReal = async (gamePk: number) => {
  // 目前先回傳空陣列，待串接官方 Streak 數據
  // 嚴禁回傳隨機模擬內容
  return [];
};
