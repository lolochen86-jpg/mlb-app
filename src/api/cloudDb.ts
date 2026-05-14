/**
 * 雲端資料庫介面 (預留給未來使用，例如 Firebase / Supabase)
 */

export const saveGameResultToCloud = async (gameData: any) => {
  console.log('Saving game result to cloud...', gameData);
  // TODO: Implement cloud DB connection here
  return Promise.resolve({ success: true });
};

export const fetchHistoricalDataFromCloud = async (teamId: number, limit: number = 15) => {
  console.log(`Fetching last ${limit} games for team ${teamId} from cloud...`);
  // TODO: Implement cloud DB connection here
  return Promise.resolve([]);
};
