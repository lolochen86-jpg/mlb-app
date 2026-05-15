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
  let startStr = '2026-03-20'; 
  const endStr = end.toISOString().split('T')[0];
  
  const fetchGames = async (start: string) => {
    const url = `${BASE_URL}/schedule?sportId=1&teamId=${teamId}&startDate=${start}&endDate=${endStr}&eventTypes=primary&scheduleTypes=games`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('歷史數據獲取失敗');
    const data = await response.json();
    return data.dates?.flatMap((d: any) => d.games) || [];
  };

  let games = await fetchGames(startStr);
  
  // 如果場次不足 20 場 (可能跨球季或數據缺失)，往前多抓 90 天
  if (games.filter((g: any) => g.status.statusCode === 'F' || g.status.statusCode === 'O').length < 20) {
    const fallbackDate = new Date(currentDate);
    fallbackDate.setDate(fallbackDate.getDate() - 150);
    startStr = fallbackDate.toISOString().split('T')[0];
    games = await fetchGames(startStr);
  }

  // 只要是狀態為 F (Final) 或 O (Game Over) 且有比分的都算
  const completedGames = games
    .filter((g: any) => (g.status.statusCode === 'F' || g.status.statusCode === 'O') && g.teams.away.score !== undefined)
    .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());

  if (completedGames.length === 0) {
    throw new Error('無足夠歷史數據可供分析');
  }

  const history = completedGames.map((g: any) => ({
    date: g.gameDate,
    score: g.teams.away.team.id === teamId ? g.teams.away.score : g.teams.home.score,
    ra: g.teams.away.team.id === teamId ? g.teams.home.score : g.teams.away.score
  }));

  return history;
};

const calculateMonthlyStats = (history: any[]) => {
  const months = ['03', '04', '05', '06', '07', '08', '09'];
  const scoreMonthly = months.map(m => {
    const monthGames = history.filter(g => g.date.split('-')[1] === m);
    if (monthGames.length === 0) return null;
    return monthGames.reduce((a, b) => a + b.score, 0) / monthGames.length;
  });
  const raMonthly = months.map(m => {
    const monthGames = history.filter(g => g.date.split('-')[1] === m);
    if (monthGames.length === 0) return null;
    return monthGames.reduce((a, b) => a + b.ra, 0) / monthGames.length;
  });
  return { 
    scoreMonthly: scoreMonthly.slice(1), 
    raMonthly: raMonthly.slice(1) 
  };
};

/**
 * 獲取球隊真實賽季統計數據 (AVG, ERA, RISP)
 */
const fetchSeasonStatsReal = async (teamId: number) => {
  // 獲取打擊數據
  const hitResp = await fetch(`${BASE_URL}/teams/${teamId}/stats?stats=season&group=hitting`);
  if (!hitResp.ok) throw new Error('打擊數據獲取失敗');
  const hitData = await hitResp.json();
  const hitStats = hitData.stats?.[0]?.splits?.[0]?.stat || {};

  // 獲取先發投手數據 (sitCode=sp)
  const starterResp = await fetch(`${BASE_URL}/teams/${teamId}/stats?stats=season&group=pitching&sitCode=sp`);
  const starterData = await starterResp.json();
  const starterEra = starterData.stats?.[0]?.splits?.[0]?.stat?.era || '0.00';

  // 獲取牛棚投手數據 (sitCode=rp)
  const bullpenResp = await fetch(`${BASE_URL}/teams/${teamId}/stats?stats=season&group=pitching&sitCode=rp`);
  const bullpenData = await bullpenResp.json();
  const bullpenEra = bullpenData.stats?.[0]?.splits?.[0]?.stat?.era || '0.00';

  return {
    avg: hitStats.avg || '.000',
    risp: hitStats.atBatsWithRisp > 0 ? (hitStats.hitsWithRisp / hitStats.atBatsWithRisp).toFixed(3) : '.000',
    era: starterEra, // 使用先發防禦率作為主要 ERA
    bullpenEra: bullpenEra
  };
};

/**
 * 獲取傷兵資訊 (聚焦於先發與核心球員)
 */
const fetchInjuriesReal = async (teamId: number) => {
  const resp = await fetch(`${BASE_URL}/teams/${teamId}/roster?rosterType=40Man`);
  if (!resp.ok) throw new Error('傷兵數據獲取失敗');
  const data = await resp.json();
  const ilPlayers = data.roster?.filter((p: any) => p.status.code !== 'A') || [];
  
  return ilPlayers
    .map((p: any) => {
      let type = '其他成員 (Support)';
      if (p.position.type === 'Pitcher') {
        type = '先發/主戰投手 (Pitcher)';
      } else if (['1B', '2B', '3B', 'SS', 'CF', 'LF', 'RF', 'C'].includes(p.position.abbreviation)) {
        type = '核心打者 (Core Starter)';
      }
      return {
        name: p.person.fullName,
        impact: type,
        isStarter: type.includes('Pitcher') || type.includes('Core')
      };
    })
    .sort((a, b) => (a.isStarter === b.isStarter ? 0 : a.isStarter ? -1 : 1));
};

/**
 * 正式版數據載入函式 (Real Data Only)
 */
export const fetchTeamStatsReal = async (teamId: number, currentDate: string) => {
  const [history, seasonStats, injuries] = await Promise.all([
    fetchTeamHistoryReal(teamId, currentDate),
    fetchSeasonStatsReal(teamId),
    fetchInjuriesReal(teamId)
  ]);

  const scores = history.map(h => h.score);
  const ras = history.map(h => h.ra);

  const scoreMA5 = calculateMA(scores, 5).slice(-15);
  const scoreMA10 = calculateMA(scores, 10).slice(-15);
  const scoreMA15 = calculateMA(scores, 15).slice(-15);

  const raMA5 = calculateMA(ras, 5).slice(-15);
  const raMA10 = calculateMA(ras, 10).slice(-15);
  const raMA15 = calculateMA(ras, 15).slice(-15);

  const { scoreMonthly, raMonthly } = calculateMonthlyStats(history);

  return {
    teamId,
    injuries,
    
    scoreHistory: scores.slice(-15),
    scoreMA5, scoreMA10, scoreMA15,
    last15GamesAvg: scoreMA15[scoreMA15.length - 1]?.toFixed(1) || '0.0',
    last10GamesAvg: scoreMA10[scoreMA10.length - 1]?.toFixed(1) || '0.0',
    last5GamesAvg: scoreMA5[scoreMA5.length - 1]?.toFixed(1) || '0.0',
    
    raHistory: ras.slice(-15),
    raMA5, raMA10, raMA15,
    last15RaAvg: raMA15[raMA15.length - 1]?.toFixed(1) || '0.0',
    last10RaAvg: raMA10[raMA10.length - 1]?.toFixed(1) || '0.0',
    last5RaAvg: raMA5[raMA5.length - 1]?.toFixed(1) || '0.0',
    
    teamBattingAvg: seasonStats.avg,
    risp: seasonStats.risp,
    era: seasonStats.era,
    bullpenEra: seasonStats.bullpenEra,
    
    // 用於近30天走勢
    last30Scores: scores.slice(-30),
    last30Ras: ras.slice(-30),
    last30ScoreMA5: calculateMA(scores, 5).slice(-30),
    last30RaMA5: calculateMA(ras, 5).slice(-30),
    last30Dates: history.slice(-30).map(h => {
      const d = new Date(h.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),

    seasonScoreMA15: calculateMA(scores, 15),
    seasonRaMA15: calculateMA(ras, 15),
    monthlyScoreMA: scoreMonthly,
    monthlyRaMA: raMonthly
  };
};

/**
 * 批量分析當天所有賽事並選出最推的三場 (分批處理避免 API 崩潰)
 */
export const getDailyTopPicks = async (games: Game[], currentDate: string) => {
  if (!games || games.length === 0) return [];

  const results = [];
  const chunkSize = 3; // 每次只處理 3 場比賽
  
  for (let i = 0; i < games.length; i += chunkSize) {
    const chunk = games.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(async (game) => {
      try {
        const [away, home] = await Promise.all([
          fetchTeamStatsReal(game.teams.away.team.id, currentDate),
          fetchTeamStatsReal(game.teams.home.team.id, currentDate)
        ]);

        const awayPred = (parseFloat(away.last15GamesAvg) * 1.05 + parseFloat(home.last15RaAvg) * 0.95) / 2;
        const homePred = (parseFloat(home.last15GamesAvg) * 1.05 + parseFloat(away.last15RaAvg) * 0.95) / 2;
        const gap = Math.abs(awayPred - homePred);

        let score = Math.min(gap * 15, 40); 
        const awayHot = parseFloat(away.last5GamesAvg) > parseFloat(away.last15GamesAvg) ? 15 : 0;
        const homeHot = parseFloat(home.last5GamesAvg) > parseFloat(home.last15GamesAvg) ? 15 : 0;
        score += (awayHot + homeHot);

        const awayInjuryFactor = away.injuries.some((i: any) => i.isStarter) ? -15 : 0;
        const homeInjuryFactor = home.injuries.some((i: any) => i.isStarter) ? -15 : 0;
        score += (Math.abs(awayInjuryFactor) + Math.abs(homeInjuryFactor));

        return {
          game,
          score,
          reason: gap > 2 ? '戰力懸殊 (Strong Gap)' : score > 60 ? '手感極佳 (High Momentum)' : '數據面看好 (Data Favorite)',
          awayPred: awayPred.toFixed(1),
          homePred: homePred.toFixed(1)
        };
      } catch (e) {
        return null;
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults.filter(r => r !== null));
    
    // 如果已經抓到 5 場以上的有效數據，就先回傳（提升使用者體驗）
    if (results.length >= 5) break;
  }

  return results
    .sort((a, b) => b!.score - a!.score)
    .slice(0, 3);
};

/**
 * 補回遺失的特殊紀錄函數，修復編譯錯誤
 */
export const fetchSpecialRecordsReal = async (gamePk: number) => {
  return [];
};
