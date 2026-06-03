import { describe, expect, it } from 'vitest';
import { computeLeagueSeasonStats } from '@/lib/sport/firma/season-stats';
import type { Fixture, LeagueFixtures } from '@/lib/sport/fetcher';

function fin(home: string, away: string, hs: number, as: number, date = '2025-01-01'): Fixture {
  return {
    id: `${home}-${away}-${date}`,
    homeTeam: home,
    awayTeam: away,
    league: 'L1',
    date,
    time: '15:30',
    venue: null,
    homeScore: hs,
    awayScore: as,
    status: 'finished'
  };
}

function lf(name: string, last: Fixture[]): LeagueFixtures {
  return { league: { id: name, name, country: 'X' }, next: [], last };
}

describe('computeLeagueSeasonStats', () => {
  it('returns nothing for a league with no usable past fixtures', () => {
    const result = computeLeagueSeasonStats([lf('Empty', [])]);
    expect(result).toHaveLength(0);
  });

  it('computes goals-per-match, BTTS and over 2.5 correctly', () => {
    const past = [
      fin('A', 'B', 2, 1), // BTTS, over25
      fin('C', 'D', 3, 0), // over25
      fin('E', 'F', 0, 0), // nothing
      fin('G', 'H', 1, 1)  // BTTS
    ];
    const r = computeLeagueSeasonStats([lf('L1', past)])[0];
    expect(r.played).toBe(4);
    expect(r.totalGoals).toBe(8);
    expect(r.goalsPerMatch).toBeCloseTo(2, 5);
    expect(r.bttsPct).toBe(50); // 2/4
    expect(r.over25Pct).toBe(50); // 2/4
  });

  it('classifies wins correctly from the home perspective', () => {
    const past = [
      fin('A', 'B', 2, 0), // home win
      fin('A', 'B', 0, 2), // away win
      fin('A', 'B', 1, 1)  // draw
    ];
    const r = computeLeagueSeasonStats([lf('L1', past)])[0];
    expect(r.homeWinPct).toBeCloseTo(33.3, 1);
    expect(r.awayWinPct).toBeCloseTo(33.3, 1);
    expect(r.drawPct).toBeCloseTo(33.3, 1);
  });
});
