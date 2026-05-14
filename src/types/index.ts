export interface Team {
  id: number;
  name: string;
  link: string;
}

export interface GameStatus {
  abstractGameState: string;
  codedGameState: string;
  detailedState: string;
  statusCode: string;
  startTimeTBD: boolean;
}

export interface GameTeamInfo {
  leagueRecord: {
    wins: number;
    losses: number;
    pct: string;
  };
  score?: number;
  team: Team;
  isWinner?: boolean;
}

export interface GameTeams {
  away: GameTeamInfo;
  home: GameTeamInfo;
}

export interface Game {
  gamePk: number;
  gameDate: string;
  status: GameStatus;
  teams: GameTeams;
  venue: {
    id: number;
    name: string;
  };
}

export interface ScheduleResponse {
  dates: {
    date: string;
    games: Game[];
  }[];
}
