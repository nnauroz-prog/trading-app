import { describe, expect, it } from 'vitest';
import { evaluateFootballPersonas } from '@/lib/agents/football-personas';
import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import type { FootballProbabilityModel } from '@/lib/sport/probabilities';

function prob(over: Partial<FootballProbabilityModel> = {}): FootballProbabilityModel {
  return {
    homeWin: 0.8, draw: 0.13, awayWin: 0.07,
    over05: 0.95, over15: 0.85, over25: 0.6, under25: 0.4,
    bothTeamsToScore: 0.55, bothTeamsNotToScore: 0.45,
    topScorelines: [], expectedHomeGoals: 1.6, expectedAwayGoals: 1.0,
    homeGamesUsed: 10, awayGamesUsed: 10,
    modelConfidence: 'high', dataQuality: 'good', explanation: 't',
    headToHead: { totalGames: 0, homeWins: 0, draws: 0, awayWins: 0, recentResults: [] },
    ...over
  };
}

function fx(id: string, date: string, home: string, away: string, p: FootballProbabilityModel | null): UpcomingFixture {
  return {
    id, homeTeam: home, awayTeam: away, league: 'Test', date, time: '15:30',
    venue: null, homeScore: null, awayScore: null, status: 'upcoming',
    prediction: null, probabilities: p, tips: null
  };
}

function league(name: string, fixtures: UpcomingFixture[]): LeagueFixtures {
  return { league: { id: '1', name, country: 'DE' }, next: fixtures, last: [] };
}

describe('evaluateFootballPersonas', () => {
  it('liefert immer drei Personas', () => {
    const result = evaluateFootballPersonas([], '2026-06-09');
    expect(result.map((v) => v.persona)).toEqual(['conservative', 'balanced', 'aggressive']);
  });

  it('alle warten ohne Fixtures', () => {
    const result = evaluateFootballPersonas([], '2026-06-09');
    expect(result.every((v) => v.verdict === 'WARTEN')).toBe(true);
  });

  it('Konservativ wählt nur 1X2', () => {
    const f = fx('a', '2026-06-10', 'Bayern', 'Hertha', prob({ homeWin: 0.85 }));
    const result = evaluateFootballPersonas([league('Bundesliga', [f])], '2026-06-09');
    const conservative = result.find((v) => v.persona === 'conservative')!;
    if (conservative.target) {
      const m = conservative.target.market.market;
      expect(m.includes('gewinnt') || m === 'Remis').toBe(true);
    }
  });

  it('Aggressiv akzeptiert Über 1,5 auch ohne 1X2-Klarheit', () => {
    const f = fx('a', '2026-06-10', 'Köln', 'Mainz', prob({ homeWin: 0.5, draw: 0.25, awayWin: 0.25, over15: 0.9 }));
    const result = evaluateFootballPersonas([league('Bundesliga', [f])], '2026-06-09');
    const aggressive = result.find((v) => v.persona === 'aggressive')!;
    expect(aggressive.target).not.toBeNull();
  });

  it('Verdict ist TIPPEN ab 80 %', () => {
    const f = fx('a', '2026-06-10', 'Bayern', 'Hertha', prob({ homeWin: 0.85 }));
    const result = evaluateFootballPersonas([league('Bundesliga', [f])], '2026-06-09');
    const conservative = result.find((v) => v.persona === 'conservative')!;
    if (conservative.target) {
      expect(conservative.verdict).toBe('TIPPEN');
    }
  });
});
