// Schätzt für eine Liga den Saison-Fortschritt aus dem last-Pool. Sehr grobe
// Heuristik: 38 Spieltage * 9 Spiele = 342 Saison-Spiele für Top-Ligen.
// Liefert einen Prozent-Wert zwischen 0..100 plus eine grobe Phase.

import type { LeagueFixtures } from '@/lib/sport/fetcher';

export interface SeasonProgress {
  leagueId: string;
  finishedGames: number;
  estimatedTotal: number;
  percent: number;
  phase: 'Pause' | 'Saisonstart' | 'Hinrunde' | 'Winterpause' | 'Rückrunde' | 'Endspurt' | 'beendet';
}

const TOP_LEAGUE_TOTAL = 342; // 38 * 9 (Bundesliga, La Liga, Premier League, Ligue 1, Serie A)
const SMALL_LEAGUE_TOTAL = 240; // konservative Default-Schätzung für kleinere Ligen

function estimateTotal(name: string): number {
  const big = ['Premier League', 'Bundesliga', 'La Liga', 'Serie A', 'Ligue 1'];
  return big.some((b) => name.includes(b)) ? TOP_LEAGUE_TOTAL : SMALL_LEAGUE_TOTAL;
}

export function leagueSeasonProgress(lf: LeagueFixtures): SeasonProgress {
  const finished = lf.last.length;
  const total = estimateTotal(lf.league.name);
  const pct = Math.max(0, Math.min(100, Math.round((finished / total) * 100)));

  let phase: SeasonProgress['phase'];
  if (finished === 0) phase = 'Pause';
  else if (pct >= 95) phase = 'beendet';
  else if (pct >= 80) phase = 'Endspurt';
  else if (pct >= 55) phase = 'Rückrunde';
  else if (pct >= 45) phase = 'Winterpause';
  else if (pct >= 10) phase = 'Hinrunde';
  else phase = 'Saisonstart';

  return {
    leagueId: lf.league.id,
    finishedGames: finished,
    estimatedTotal: total,
    percent: pct,
    phase
  };
}
