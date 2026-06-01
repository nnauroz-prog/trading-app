import type { Fixture, LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import { SPORT_FIRMA } from '@/lib/sport/firma/roster';
import { computeTeamForms } from '@/lib/sport/firma/scouts';
import { computeHeadToHead } from '@/lib/sport/h2h';
import { collectFirmaVotes } from '@/lib/sport/firma/employee-votes';
import { computeFootballProbabilities } from '@/lib/sport/probabilities';
import { predictMatch } from '@/lib/sport/predictor';
import { computeLeagueSeasonStats } from '@/lib/sport/firma/season-stats';

export interface EmployeeBacktestStat {
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  totalVotes: number;
  rightVotes: number;
  wrongVotes: number;
  pushVotes: number; // Draws bei Heim/Auswärts-Vote
  abstainCount: number;
  hitRatePct: number | null;
  sampleQuality: 'good' | 'medium' | 'weak';
}

const HISTORICAL_SAMPLE_PER_LEAGUE = 80; // Wie viele Spiele pro Liga ins Backtest

// Backtestet jede Vote-Funktion gegen den Vergangenheits-Pool.
// Für jedes betrachtete Spiel rekonstruieren wir den Context aus den DAVOR
// liegenden Spielen, lassen jeden Mitarbeiter abstimmen, vergleichen mit dem
// tatsächlichen Ergebnis. So entsteht eine echte Hit-Rate pro Mitarbeiter.
export function backtestEmployees(leagues: LeagueFixtures[]): EmployeeBacktestStat[] {
  // Initialisiere Zähler pro Mitarbeiter.
  const stats = new Map<string, EmployeeBacktestStat>();
  for (const e of SPORT_FIRMA) {
    stats.set(e.id, {
      employeeId: e.id,
      employeeName: e.name,
      role: e.role,
      department: e.department,
      totalVotes: 0,
      rightVotes: 0,
      wrongVotes: 0,
      pushVotes: 0,
      abstainCount: 0,
      hitRatePct: null,
      sampleQuality: 'weak'
    });
  }

  for (const lf of leagues) {
    const finished = lf.last.filter((f) => f.homeScore !== null && f.awayScore !== null);
    if (finished.length < 30) continue; // zu wenig Spiele für sinnvollen Backtest

    // Sortieren nach Datum aufsteigend — wir bauen den Context aus
    // chronologisch DAVOR liegenden Spielen.
    const chronological = [...finished].sort((a, b) => a.date.localeCompare(b.date));
    const halfPoint = Math.floor(chronological.length / 2);
    const trainingPool = chronological.slice(0, halfPoint);
    const testingPool = chronological.slice(halfPoint).slice(0, HISTORICAL_SAMPLE_PER_LEAGUE);

    if (trainingPool.length < 20 || testingPool.length < 10) continue;
    const leagueStats = computeLeagueSeasonStats([{ league: lf.league, last: trainingPool, next: [] }])[0] ?? null;

    for (const match of testingPool) {
      // Pre-Match-Pool: alle Spiele DAVOR aus dem chronologischen Lauf.
      const preMatchPool = chronological.filter((g) => g.date < match.date);
      if (preMatchPool.length < 15) continue;

      const fakeFixture = buildFakeUpcoming(match, preMatchPool);
      if (!fakeFixture.prediction) continue;

      const forms = computeTeamForms([{ league: lf.league, last: preMatchPool, next: [] }]);
      const homeForm = forms.find((f) => f.team === match.homeTeam) ?? null;
      const awayForm = forms.find((f) => f.team === match.awayTeam) ?? null;
      const h2h = computeHeadToHead(match.homeTeam, match.awayTeam, preMatchPool);

      const voteResult = collectFirmaVotes({
        fixture: fakeFixture,
        leagueName: lf.league.name,
        homeForm,
        awayForm,
        h2h,
        leagueStats,
        finishedPool: preMatchPool
      });

      const actualSide: 'home' | 'away' | 'draw' = (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'home'
        : (match.homeScore ?? 0) < (match.awayScore ?? 0) ? 'away'
        : 'draw';

      for (const vote of voteResult.votes) {
        const stat = stats.get(vote.employeeId);
        if (!stat) continue;
        if (vote.side === 'abstain') {
          stat.abstainCount++;
        } else {
          stat.totalVotes++;
          if (vote.side === actualSide) stat.rightVotes++;
          else stat.wrongVotes++;
        }
      }
    }
  }

  // Hit-Rate + Sample-Quality finalisieren.
  for (const stat of stats.values()) {
    if (stat.totalVotes > 0) {
      stat.hitRatePct = Math.round((stat.rightVotes / stat.totalVotes) * 1000) / 10;
    }
    if (stat.totalVotes >= 50) stat.sampleQuality = 'good';
    else if (stat.totalVotes >= 15) stat.sampleQuality = 'medium';
    else stat.sampleQuality = 'weak';
  }

  return Array.from(stats.values());
}

// Wandelt ein gespieltes Match in einen "upcoming"-Fixture-Eindruck um,
// damit die Vote-Funktionen ihn verarbeiten können. Die Prediction wird aus
// dem preMatchPool berechnet — also kein Lookahead.
function buildFakeUpcoming(match: Fixture, preMatchPool: Fixture[]): UpcomingFixture {
  const probabilities = computeFootballProbabilities(match.homeTeam, match.awayTeam, preMatchPool);
  const prediction = predictMatch(match.homeTeam, match.awayTeam, preMatchPool);
  return {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league,
    date: match.date,
    time: match.time,
    venue: match.venue,
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    prediction,
    probabilities,
    tips: null
  };
}
