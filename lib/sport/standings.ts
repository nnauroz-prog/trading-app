import { Fixture } from '@/lib/sport/fetcher';

export interface TeamStanding {
  team: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number; // 3-1-0
}

// Computes a league standing from the finished fixtures we have for this league.
// Not authoritative (we only have ~the last 15 results per league) — labelled
// as "geschätzt aus den letzten Liga-Spielen".
export function computeStandings(finished: Fixture[]): TeamStanding[] {
  const map = new Map<string, TeamStanding>();
  const ensure = (team: string): TeamStanding => {
    if (!map.has(team)) {
      map.set(team, { team, games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 });
    }
    return map.get(team)!;
  };

  for (const e of finished) {
    if (e.status !== 'finished' || e.homeScore === null || e.awayScore === null) continue;
    const home = ensure(e.homeTeam);
    const away = ensure(e.awayTeam);
    home.games++; away.games++;
    home.goalsFor += e.homeScore; home.goalsAgainst += e.awayScore;
    away.goalsFor += e.awayScore; away.goalsAgainst += e.homeScore;
    if (e.homeScore > e.awayScore) {
      home.wins++; home.points += 3;
      away.losses++;
    } else if (e.homeScore < e.awayScore) {
      away.wins++; away.points += 3;
      home.losses++;
    } else {
      home.draws++; home.points++;
      away.draws++; away.points++;
    }
  }
  for (const s of map.values()) {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  }
  const out = Array.from(map.values());
  out.sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.team.localeCompare(b.team)
  );
  return out;
}
