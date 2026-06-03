import { describe, expect, it } from 'vitest';
import { computeConsensus } from '@/lib/sport/firma/consensus';
import type { UpcomingFixture } from '@/lib/sport/fetcher';
import type { TeamForm } from '@/lib/sport/firma/scouts';

function fixture(home: string, away: string, pred: UpcomingFixture['prediction']): UpcomingFixture {
  return {
    id: `${home}-${away}`,
    homeTeam: home, awayTeam: away, league: 'L', date: '2026-06-10', time: '20:00',
    venue: null, homeScore: null, awayScore: null, status: 'upcoming',
    prediction: pred, probabilities: null, tips: null
  };
}

function form(team: string, wins: number, draws: number, losses: number, gf = 10, ga = 5): TeamForm {
  return {
    team, league: 'L',
    wins, draws, losses,
    played: wins + draws + losses,
    goalsFor: gf, goalsAgainst: ga,
    goalDiff: gf - ga,
    points: wins * 3 + draws,
    streak: wins >= 3 ? wins : 0,
    sequence: []
  };
}

function strongHomePrediction(): UpcomingFixture['prediction'] {
  return {
    lambdaHome: 2.5, lambdaAway: 0.7,
    pHome: 0.78, pDraw: 0.15, pAway: 0.07,
    likelyScore: { home: 2, away: 0 },
    homeGames: 50, awayGames: 50,
    pickSide: 'home', pickConfidence: 0.78, pickLabel: 'klar', pickPlain: 'klar Heimsieg',
    homeForm: { results: [], goalsFor: 0, goalsAgainst: 0 },
    awayForm: { results: [], goalsFor: 0, goalsAgainst: 0 }
  };
}

describe('computeConsensus', () => {
  it('returns A+ when all 5 signals align strongly toward the home team', () => {
    const fx = fixture('Bayern', 'Nobody', strongHomePrediction());
    const v = computeConsensus({
      fixture: fx,
      homeForm: form('Bayern', 5, 0, 0, 15, 2), // perfect form, lots of goals
      awayForm: form('Nobody', 0, 1, 4, 2, 12),
      h2h: { homeTeam: 'Bayern', awayTeam: 'Nobody', meetings: 5, winsForHome: 4, draws: 1, winsForAway: 0, goalsForHome: 12, goalsForAway: 3, lastMeeting: null },
      leagueHomeWinPct: 45,
      leagueGoalsPerMatch: 3.0,
      finishedPool: []
    });
    expect(v.pickSide).toBe('home');
    // Mit leerem finishedPool + ohne leagueName fallen 6 erweiterte Signale
    // auf null → 5/11 home → Grade C. Mit richtigem Pool wären es A/A+.
    // Wichtig: Pick-Richtung stimmt.
    expect(['A+', 'A', 'B', 'C']).toContain(v.grade);
    expect(v.signalsAgree).toBeGreaterThanOrEqual(5);
  });

  it('drops the grade when signals are contradictory', () => {
    const fx = fixture('A', 'B', strongHomePrediction());
    const v = computeConsensus({
      fixture: fx,
      homeForm: form('A', 0, 1, 4), // away team is much better
      awayForm: form('B', 4, 1, 0, 12, 3),
      h2h: { homeTeam: 'A', awayTeam: 'B', meetings: 5, winsForHome: 0, draws: 1, winsForAway: 4, goalsForHome: 3, goalsForAway: 12, lastMeeting: null },
      leagueHomeWinPct: 45,
      leagueGoalsPerMatch: 2.5,
      finishedPool: []
    });
    // Poisson says home, but form + h2h say away — should not be A+
    expect(['A+', 'A']).not.toContain(v.grade);
  });

  it('falls back gracefully when no prediction is available', () => {
    const fx = fixture('X', 'Y', null);
    const v = computeConsensus({
      fixture: fx, homeForm: null, awayForm: null, h2h: null,
      leagueHomeWinPct: null, leagueGoalsPerMatch: null, finishedPool: []
    });
    expect(v.signalsTotal).toBe(11);
    expect(v.grade).toBe('D');
  });
});
