import type { Fixture, LeagueFixtures } from '@/lib/sport/fetcher';

export interface LeagueSeasonStats {
  league: string;
  played: number;
  totalGoals: number;
  goalsPerMatch: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  homeGoalsPerMatch: number;
  awayGoalsPerMatch: number;
  bttsPct: number;
  over25Pct: number;
}

// Aggregat-Statistiken über den gesamten Vergangenheits-Pool einer Liga
// (3 Saisons). Pure, testbar. Genau das, was Tipper als
// "Liga-Grundwerte" verstehen.
export function computeLeagueSeasonStats(leagues: LeagueFixtures[]): LeagueSeasonStats[] {
  return leagues
    .map((lf) => statsForFixtures(lf.league.name, lf.last))
    .filter((s): s is LeagueSeasonStats => s !== null);
}

function statsForFixtures(leagueName: string, finished: Fixture[]): LeagueSeasonStats | null {
  const usable = finished.filter((f) => f.homeScore !== null && f.awayScore !== null);
  if (usable.length === 0) return null;
  let homeGoals = 0;
  let awayGoals = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let btts = 0;
  let over25 = 0;
  for (const f of usable) {
    const hs = f.homeScore ?? 0;
    const as = f.awayScore ?? 0;
    homeGoals += hs;
    awayGoals += as;
    if (hs > as) homeWins++;
    else if (hs < as) awayWins++;
    else draws++;
    if (hs >= 1 && as >= 1) btts++;
    if (hs + as > 2.5) over25++;
  }
  const played = usable.length;
  return {
    league: leagueName,
    played,
    totalGoals: homeGoals + awayGoals,
    goalsPerMatch: (homeGoals + awayGoals) / played,
    homeWinPct: Math.round((homeWins / played) * 1000) / 10,
    drawPct: Math.round((draws / played) * 1000) / 10,
    awayWinPct: Math.round((awayWins / played) * 1000) / 10,
    homeGoalsPerMatch: homeGoals / played,
    awayGoalsPerMatch: awayGoals / played,
    bttsPct: Math.round((btts / played) * 1000) / 10,
    over25Pct: Math.round((over25 / played) * 1000) / 10
  };
}
