import { describe, expect, it } from 'vitest';
import {
  computeVenueSplit,
  computeRestDays,
  computeFormTrend,
  computeDefensiveStability,
  computeOffensiveConsistency
} from '@/lib/sport/firma/advanced-signals';
import type { Fixture } from '@/lib/sport/fetcher';

function fin(home: string, away: string, hs: number, as: number, date: string): Fixture {
  return {
    id: `${home}-${away}-${date}`,
    homeTeam: home, awayTeam: away, league: 'L',
    date, time: '15:30', venue: null,
    homeScore: hs, awayScore: as, status: 'finished'
  };
}

describe('computeVenueSplit', () => {
  it('separates home vs away record for a team', () => {
    const pool = [
      fin('A', 'X', 3, 0, '2025-08-01'), // home win
      fin('A', 'Y', 2, 1, '2025-08-08'), // home win
      fin('A', 'Z', 1, 1, '2025-08-15'), // home draw
      fin('X', 'A', 0, 2, '2025-09-01'), // away win
      fin('Y', 'A', 3, 0, '2025-09-08')  // away loss
    ];
    const split = computeVenueSplit('A', pool);
    expect(split.homeGames).toBe(3);
    expect(split.homeOnlyWinPct).toBeCloseTo(2 / 3, 5);
    expect(split.awayGames).toBe(2);
    expect(split.awayOnlyWinPct).toBe(0.5);
  });
});

describe('computeRestDays', () => {
  it('returns days since the previous match', () => {
    const pool = [
      fin('A', 'X', 1, 0, '2026-05-25'),
      fin('A', 'Y', 0, 0, '2026-05-15')
    ];
    const r = computeRestDays('A', '2026-06-01', pool);
    expect(r.daysSinceLastGame).toBe(7);
    expect(r.restCategory).toBe('long');
  });

  it('flags short rest as risky', () => {
    const pool = [fin('A', 'X', 1, 0, '2026-05-30')];
    const r = computeRestDays('A', '2026-06-01', pool);
    expect(r.daysSinceLastGame).toBe(2);
    expect(r.restCategory).toBe('short');
  });
});

describe('computeFormTrend', () => {
  it('detects an upward trend (recent better than earlier)', () => {
    const pool = [
      fin('A', 'X', 0, 2, '2025-12-01'), // L
      fin('A', 'Y', 0, 1, '2025-12-08'), // L
      fin('A', 'Z', 1, 1, '2025-12-15'), // D
      fin('A', 'W', 2, 0, '2026-01-01'), // W
      fin('A', 'V', 3, 0, '2026-01-08'), // W
      fin('A', 'U', 1, 0, '2026-01-15')  // W
    ];
    const t = computeFormTrend('A', pool);
    expect(t.direction).toBe('up');
  });
});

describe('computeDefensiveStability', () => {
  it('measures clean sheet rate and concession variance', () => {
    const pool = [
      fin('A', 'X', 1, 0, '2026-01-01'), // CS
      fin('A', 'Y', 2, 0, '2026-01-08'), // CS
      fin('Z', 'A', 0, 1, '2026-01-15'), // CS (A is away)
      fin('A', 'W', 1, 2, '2026-01-22')  // 2 conceded
    ];
    const d = computeDefensiveStability('A', pool);
    expect(d.cleanSheetPct).toBe(0.75);
    expect(d.goalsConcededPerGame).toBeCloseTo(0.5, 5);
  });
});

describe('computeOffensiveConsistency', () => {
  it('measures scoring rate and games-with-goal share', () => {
    const pool = [
      fin('A', 'X', 2, 0, '2026-01-01'),
      fin('A', 'Y', 0, 1, '2026-01-08'), // no goal
      fin('Z', 'A', 1, 1, '2026-01-15'),
      fin('A', 'W', 3, 2, '2026-01-22')
    ];
    const o = computeOffensiveConsistency('A', pool);
    expect(o.scoringRate).toBe(1.5); // 2+0+1+3 = 6 / 4
    expect(o.scoreInEveryGamePct).toBe(0.75);
  });
});
