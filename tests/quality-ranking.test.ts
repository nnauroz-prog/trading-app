import { describe, expect, it } from 'vitest';
import { rankPredictionsByQuality, summarizeLeagueQuality } from '@/lib/sport/quality-ranking';
import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import type { MatchPrediction, TeamForm5 } from '@/lib/sport/predictor';
import type { FootballProbabilityModel } from '@/lib/sport/probabilities';

const form: TeamForm5 = { results: ['W'], goalsFor: 1, goalsAgainst: 0 };

function pred(over: Partial<MatchPrediction> = {}): MatchPrediction {
  return {
    lambdaHome: 1.5, lambdaAway: 1, pHome: 0.55, pDraw: 0.25, pAway: 0.20,
    likelyScore: { home: 1, away: 1 }, homeGames: 10, awayGames: 10,
    pickSide: 'home', pickConfidence: 0.55, pickLabel: 'klar', pickPlain: 'klar Heim',
    homeForm: form, awayForm: form, ...over
  };
}

function probs(over: Partial<FootballProbabilityModel> = {}): FootballProbabilityModel {
  return {
    homeWin: 0.55, draw: 0.25, awayWin: 0.20,
    over05: 0.9, over15: 0.78, over25: 0.55, under25: 0.45,
    bothTeamsToScore: 0.5, bothTeamsNotToScore: 0.5,
    topScorelines: [], expectedHomeGoals: 1.5, expectedAwayGoals: 1,
    homeGamesUsed: 40, awayGamesUsed: 40, modelConfidence: 'high', dataQuality: 'good',
    explanation: '', headToHead: { totalGames: 0, homeWins: 0, draws: 0, awayWins: 0, recentResults: [] },
    ...over
  };
}

function fixture(over: Partial<UpcomingFixture> = {}): UpcomingFixture {
  return {
    id: 'f', homeTeam: 'A', awayTeam: 'B', league: 'L', date: '2026-06-04',
    time: '20:00', venue: null, homeScore: null, awayScore: null, status: 'upcoming',
    prediction: pred(), probabilities: probs(), tips: null, ...over
  };
}

function lf(name: string, next: UpcomingFixture[]): LeagueFixtures {
  return { league: { id: name, name, country: 'X' }, next, last: [] };
}

describe('rankPredictionsByQuality', () => {
  it('sortiert absteigend nach Score', () => {
    const ranked = rankPredictionsByQuality({
      leagues: [
        lf('A', [fixture({ id: '1', probabilities: probs({ dataQuality: 'good' }) })]),
        lf('B', [fixture({ id: '2', probabilities: probs({ dataQuality: 'weak', homeGamesUsed: 3, awayGamesUsed: 3 }) })])
      ]
    });
    expect(ranked.length).toBe(2);
    expect(ranked[0].quality.score).toBeGreaterThan(ranked[1].quality.score);
    expect(ranked[0].fixture.id).toBe('1');
  });

  it('respektiert isoDateAllowList', () => {
    const ranked = rankPredictionsByQuality({
      leagues: [
        lf('A', [
          fixture({ id: '1', date: '2026-06-04' }),
          fixture({ id: '2', date: '2026-06-10' })
        ])
      ],
      isoDateAllowList: new Set(['2026-06-04'])
    });
    expect(ranked.length).toBe(1);
    expect(ranked[0].fixture.id).toBe('1');
  });

  it('überspringt Fixtures ohne prediction', () => {
    const ranked = rankPredictionsByQuality({
      leagues: [lf('A', [fixture({ id: '1', prediction: null })])]
    });
    expect(ranked.length).toBe(0);
  });
});

describe('summarizeLeagueQuality', () => {
  it('liefert pro Liga bester Score + bester Tipp', () => {
    const map = summarizeLeagueQuality([
      lf('A', [
        fixture({ id: '1', homeTeam: 'X', awayTeam: 'Y' }),
        fixture({ id: '2', homeTeam: 'Q', awayTeam: 'R', probabilities: probs({ dataQuality: 'weak' }) })
      ])
    ]);
    const a = map.get('A')!;
    expect(a.count).toBe(2);
    expect(a.bestScore).toBeGreaterThan(0);
    expect(a.bestLabel).toBeTruthy();
    expect(a.bestMarketLabel).toBeTruthy();
  });
});
