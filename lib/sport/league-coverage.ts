// Liga-Coverage-Audit: zeigt im Detail-Bereich, welche Ligen heute Spiele
// liefern und wie es mit ihren Form-Daten aussieht. Im Gegensatz zur
// Liga-DataQuality-Note rechnet sich diese hier auf den Tages-Pool.

import type { LeagueFixtures } from '@/lib/sport/fetcher';

export interface LeagueCoverageRow {
  leagueId: string;
  leagueName: string;
  country: string;
  todayCount: number;
  next7dCount: number;
  hasFinishedPool: boolean;
  hasPredictions: boolean;
  hasProbabilities: boolean;
}

export function computeLeagueCoverage(leagues: LeagueFixtures[], todayIso: string, horizonDays = 7): LeagueCoverageRow[] {
  const today = new Date(`${todayIso}T00:00:00`).getTime();
  const horizon = today + horizonDays * 24 * 60 * 60 * 1000;
  return leagues.map((lf) => {
    const todayCount = lf.next.filter((f) => f.date === todayIso).length;
    const next7d = lf.next.filter((f) => {
      const t = new Date(`${f.date}T00:00:00`).getTime();
      return t >= today && t <= horizon;
    }).length;
    const hasPredictions = lf.next.some((f) => f.prediction !== null);
    const hasProbabilities = lf.next.some((f) => f.probabilities !== null);
    return {
      leagueId: lf.league.id,
      leagueName: lf.league.name,
      country: lf.league.country,
      todayCount,
      next7dCount: next7d,
      hasFinishedPool: lf.last.length > 0,
      hasPredictions,
      hasProbabilities
    };
  });
}

export interface CoverageSummary {
  totalLeagues: number;
  activeLeagues: number;        // mit min. 1 next-Spiel
  todayTotal: number;
  next7dTotal: number;
  withProbabilities: number;
}

export function summarizeCoverage(rows: LeagueCoverageRow[]): CoverageSummary {
  return {
    totalLeagues: rows.length,
    activeLeagues: rows.filter((r) => r.next7dCount > 0).length,
    todayTotal: rows.reduce((sum, r) => sum + r.todayCount, 0),
    next7dTotal: rows.reduce((sum, r) => sum + r.next7dCount, 0),
    withProbabilities: rows.filter((r) => r.hasProbabilities).length
  };
}
