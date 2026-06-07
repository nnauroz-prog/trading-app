import { describe, expect, it } from 'vitest';
import { rankSafeFootballTips } from '@/lib/sport/safe-football-tips';
import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import type { FootballProbabilityModel } from '@/lib/sport/probabilities';

function makeProb(over: Partial<FootballProbabilityModel> = {}): FootballProbabilityModel {
  return {
    homeWin: 0.4, draw: 0.3, awayWin: 0.3,
    over05: 0.95, over15: 0.82, over25: 0.55,
    under25: 0.45,
    bothTeamsToScore: 0.55, bothTeamsNotToScore: 0.45,
    topScorelines: [],
    expectedHomeGoals: 1.4, expectedAwayGoals: 1.1,
    homeGamesUsed: 8, awayGamesUsed: 8,
    modelConfidence: 'medium', dataQuality: 'good',
    explanation: 'test',
    headToHead: { totalGames: 0, homeWins: 0, draws: 0, awayWins: 0, recentResults: [] },
    ...over
  };
}

function makeFixture(id: string, date: string, home: string, away: string, prob: FootballProbabilityModel | null): UpcomingFixture {
  return {
    id, homeTeam: home, awayTeam: away, league: 'Test', date, time: '15:30',
    venue: null, homeScore: null, awayScore: null, status: 'upcoming',
    prediction: null, probabilities: prob, tips: null
  };
}

function makeLeague(name: string, fixtures: UpcomingFixture[]): LeagueFixtures {
  return {
    league: { id: '1', name, country: 'DE' },
    next: fixtures,
    last: []
  };
}

describe('rankSafeFootballTips', () => {
  it('filtert auf Mindest-Wahrscheinlichkeit', () => {
    const fxStrong = makeFixture('a', '2026-06-10', 'Bayern', 'Hertha', makeProb({
      homeWin: 0.78, draw: 0.15, awayWin: 0.07
    }));
    const fxWeak = makeFixture('b', '2026-06-10', 'Köln', 'Mainz', makeProb({
      homeWin: 0.40, draw: 0.30, awayWin: 0.30
    }));
    const leagues = [makeLeague('Bundesliga', [fxStrong, fxWeak])];
    const tips = rankSafeFootballTips(leagues, { todayIso: '2026-06-09', minProbability: 0.7 });
    expect(tips.length).toBeGreaterThan(0);
    for (const t of tips) {
      expect(t.market.probability).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('absteigend sortiert nach Wahrscheinlichkeit + Qualität', () => {
    const fxA = makeFixture('a', '2026-06-10', 'Bayern', 'Hertha', makeProb({
      homeWin: 0.78, draw: 0.15, awayWin: 0.07, over15: 0.92
    }));
    const fxB = makeFixture('b', '2026-06-10', 'Dortmund', 'Augsburg', makeProb({
      homeWin: 0.72, draw: 0.18, awayWin: 0.10, over15: 0.88
    }));
    const leagues = [makeLeague('Bundesliga', [fxA, fxB])];
    const tips = rankSafeFootballTips(leagues, { todayIso: '2026-06-09', minProbability: 0.7, limit: 50 });
    expect(tips.length).toBeGreaterThan(1);
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i - 1].market.probability + 1e-6).toBeGreaterThanOrEqual(tips[i].market.probability);
    }
  });

  it('überspringt Spiele ohne probabilities', () => {
    const fx = makeFixture('a', '2026-06-10', 'X', 'Y', null);
    const tips = rankSafeFootballTips([makeLeague('Bundesliga', [fx])], { todayIso: '2026-06-09', minProbability: 0.6 });
    expect(tips).toHaveLength(0);
  });

  it('filtert auf Mindest-Datenqualität', () => {
    const fxWeakData = makeFixture('a', '2026-06-10', 'Bayern', 'Hertha', makeProb({
      homeWin: 0.85, draw: 0.10, awayWin: 0.05, dataQuality: 'weak'
    }));
    const tips = rankSafeFootballTips([makeLeague('Bundesliga', [fxWeakData])], {
      todayIso: '2026-06-09', minProbability: 0.7, minQuality: 'medium'
    });
    expect(tips).toHaveLength(0);
  });

  it('respektiert Horizont', () => {
    const fxLate = makeFixture('a', '2026-07-01', 'Bayern', 'Hertha', makeProb({
      homeWin: 0.85, draw: 0.10, awayWin: 0.05
    }));
    const tips = rankSafeFootballTips([makeLeague('Bundesliga', [fxLate])], {
      todayIso: '2026-06-09', minProbability: 0.5, horizonDays: 7
    });
    expect(tips).toHaveLength(0);
  });

  it('vergibt pro Spiel maximal einen Tipp pro Markt-Kategorie', () => {
    // Über 1,5 (0.92) UND Über 2,5 (0.66) würden beide passen, aber nur einer
    // (der mit der höheren Wahrscheinlichkeit) bleibt nach dem Filter.
    const fx = makeFixture('a', '2026-06-10', 'Bayern', 'Hertha', makeProb({
      homeWin: 0.78, draw: 0.15, awayWin: 0.07, over15: 0.92, over25: 0.66
    }));
    const tips = rankSafeFootballTips([makeLeague('Bundesliga', [fx])], { todayIso: '2026-06-09', minProbability: 0.6 });
    const overTips = tips.filter((t) => t.market.market.includes('Über'));
    expect(overTips.length).toBeLessThanOrEqual(1);
  });

  it('respektiert das Limit', () => {
    // Generate 5 strong fixtures.
    const fxs = Array.from({ length: 5 }, (_, i) =>
      makeFixture(`fx-${i}`, '2026-06-10', `Heim${i}`, `Auswärts${i}`, makeProb({
        homeWin: 0.80, draw: 0.13, awayWin: 0.07, over15: 0.90
      }))
    );
    const tips = rankSafeFootballTips([makeLeague('Bundesliga', fxs)], {
      todayIso: '2026-06-09', minProbability: 0.7, limit: 3
    });
    expect(tips.length).toBeLessThanOrEqual(3);
  });

  it('„maximal"-Tier nur wenn ≥85 % UND Daten-Qualität good', () => {
    const fx = makeFixture('a', '2026-06-10', 'Bayern', 'Hertha', makeProb({
      homeWin: 0.86, draw: 0.10, awayWin: 0.04, over15: 0.93,
      dataQuality: 'good'
    }));
    const tips = rankSafeFootballTips([makeLeague('Bundesliga', [fx])], { todayIso: '2026-06-09', minProbability: 0.7 });
    for (const t of tips) {
      if (t.tier === 'maximal') {
        expect(t.market.probability).toBeGreaterThanOrEqual(0.85);
        expect(t.fixture.probabilities?.dataQuality).toBe('good');
      }
    }
  });

  it('unrealistische Schwelle → leere Liste statt Schummel-Tipps', () => {
    const fx = makeFixture('a', '2026-06-10', 'Bayern', 'Hertha', makeProb({
      homeWin: 0.80, draw: 0.15, awayWin: 0.05
    }));
    const tips = rankSafeFootballTips([makeLeague('Bundesliga', [fx])], { todayIso: '2026-06-09', minProbability: 0.99 });
    expect(tips).toHaveLength(0);
  });
});
