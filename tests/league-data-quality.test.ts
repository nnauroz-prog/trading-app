import { describe, expect, it } from 'vitest';
import { leagueDataQuality } from '@/lib/sport/league-data-quality';
import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import type { MatchPrediction, TeamForm5 } from '@/lib/sport/predictor';
import type { FootballProbabilityModel } from '@/lib/sport/probabilities';

const form: TeamForm5 = { results: [], goalsFor: 0, goalsAgainst: 0 };

function pred(over: Partial<MatchPrediction> = {}): MatchPrediction {
  return {
    lambdaHome: 1.5, lambdaAway: 1, pHome: 0.5, pDraw: 0.25, pAway: 0.25,
    likelyScore: { home: 1, away: 1 },
    homeGames: 10, awayGames: 10,
    pickSide: 'home', pickConfidence: 0.5, pickLabel: 'leicht', pickPlain: 'leicht Heim',
    homeForm: form, awayForm: form,
    ...over
  };
}
function probs(over: Partial<FootballProbabilityModel> = {}): FootballProbabilityModel {
  return {
    homeWin: 0.5, draw: 0.25, awayWin: 0.25,
    over05: 0.9, over15: 0.8, over25: 0.6, under25: 0.4,
    bothTeamsToScore: 0.5, bothTeamsNotToScore: 0.5,
    topScorelines: [], expectedHomeGoals: 1.5, expectedAwayGoals: 1,
    homeGamesUsed: 15, awayGamesUsed: 15,
    modelConfidence: 'medium', dataQuality: 'good',
    explanation: '', headToHead: { totalGames: 0, homeWins: 0, draws: 0, awayWins: 0, recentResults: [] },
    ...over
  };
}
function fixture(over: Partial<UpcomingFixture> = {}): UpcomingFixture {
  return {
    id: 'f', homeTeam: 'A', awayTeam: 'B', league: 'L', date: '2026-06-04',
    time: '20:00', venue: null, homeScore: null, awayScore: null, status: 'upcoming',
    prediction: pred(), probabilities: probs(), tips: null,
    ...over
  };
}

function lf(next: UpcomingFixture[]): LeagueFixtures {
  return { league: { id: 'X', name: 'L', country: 'C' }, next, last: [] };
}

describe('leagueDataQuality', () => {
  it('Grade A bei guter Datenlage und vielen klaren Picks', () => {
    const note = leagueDataQuality(lf([
      fixture({ id: '1', prediction: pred({ pickLabel: 'klar' }), probabilities: probs({ dataQuality: 'good' }) }),
      fixture({ id: '2', prediction: pred({ pickLabel: 'klar' }), probabilities: probs({ dataQuality: 'good' }) }),
      fixture({ id: '3', prediction: pred({ pickLabel: 'klar' }), probabilities: probs({ dataQuality: 'good' }) })
    ]));
    expect(note.grade).toBe('A');
    expect(note.goodDataPct).toBe(100);
    expect(note.clearPicksPct).toBe(100);
  });

  it('Grade D bei null Spielen', () => {
    const note = leagueDataQuality(lf([]));
    expect(note.grade).toBe('D');
    expect(note.fixtures).toBe(0);
  });

  it('Grade C bei dünner Datenlage', () => {
    const note = leagueDataQuality(lf([
      fixture({ id: '1', prediction: pred({ pickLabel: 'offen' }), probabilities: probs({ dataQuality: 'weak' }) }),
      fixture({ id: '2', prediction: pred({ pickLabel: 'offen' }), probabilities: probs({ dataQuality: 'medium' }) }),
      fixture({ id: '3', prediction: pred({ pickLabel: 'leicht' }), probabilities: probs({ dataQuality: 'medium' }) })
    ]));
    expect(['C', 'D']).toContain(note.grade);
    expect(note.goodDataPct).toBe(0);
  });

  it('berechnet durchschnittlichen Sample-Size', () => {
    const note = leagueDataQuality(lf([
      fixture({ id: '1', probabilities: probs({ homeGamesUsed: 10, awayGamesUsed: 10 }) }),
      fixture({ id: '2', probabilities: probs({ homeGamesUsed: 20, awayGamesUsed: 20 }) })
    ]));
    expect(note.averageSampleSize).toBe(30); // (20 + 40) / 2
  });
});
