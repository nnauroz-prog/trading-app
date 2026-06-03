import type { Fixture } from '@/lib/sport/fetcher';

export interface HeadToHeadResult {
  meetings: number;
  homeTeam: string;
  awayTeam: string;
  // From the perspective of the upcoming match's home team.
  winsForHome: number;
  draws: number;
  winsForAway: number;
  goalsForHome: number;
  goalsForAway: number;
  lastMeeting: {
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  } | null;
}

// Walks the supplied finished fixtures and pulls every direct duel between the
// two teams (Heim/Auswärts vertauscht oder nicht). Pure + deterministisch.
export function computeHeadToHead(
  homeTeam: string,
  awayTeam: string,
  finished: Fixture[]
): HeadToHeadResult {
  const duels = finished
    .filter(
      (f) =>
        f.status === 'finished' &&
        f.homeScore !== null &&
        f.awayScore !== null &&
        ((f.homeTeam === homeTeam && f.awayTeam === awayTeam) ||
          (f.homeTeam === awayTeam && f.awayTeam === homeTeam))
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  let winsForHome = 0;
  let draws = 0;
  let winsForAway = 0;
  let goalsForHome = 0;
  let goalsForAway = 0;

  for (const d of duels) {
    const hs = d.homeScore ?? 0;
    const as = d.awayScore ?? 0;
    const isUpcomingHomeAtHome = d.homeTeam === homeTeam;
    const homePerspectiveGoals = isUpcomingHomeAtHome ? hs : as;
    const awayPerspectiveGoals = isUpcomingHomeAtHome ? as : hs;
    goalsForHome += homePerspectiveGoals;
    goalsForAway += awayPerspectiveGoals;
    if (hs === as) draws++;
    else if ((isUpcomingHomeAtHome && hs > as) || (!isUpcomingHomeAtHome && as > hs)) winsForHome++;
    else winsForAway++;
  }

  const last = duels[0];
  return {
    meetings: duels.length,
    homeTeam,
    awayTeam,
    winsForHome,
    draws,
    winsForAway,
    goalsForHome,
    goalsForAway,
    lastMeeting: last
      ? {
          date: last.date,
          homeTeam: last.homeTeam,
          awayTeam: last.awayTeam,
          homeScore: last.homeScore ?? 0,
          awayScore: last.awayScore ?? 0
        }
      : null
  };
}
