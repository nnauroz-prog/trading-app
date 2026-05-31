import { describe, expect, it } from 'vitest';
import { computeStandings } from '@/lib/sport/standings';
import { Fixture } from '@/lib/sport/fetcher';

function g(home: string, away: string, hs: number, as: number, date = '2026-05-01'): Fixture {
  return {
    id: home + away + date,
    homeTeam: home,
    awayTeam: away,
    league: 'L',
    date,
    time: '15:00',
    venue: null,
    homeScore: hs,
    awayScore: as,
    status: 'finished'
  };
}

describe('computeStandings', () => {
  it('returns empty for no games', () => {
    expect(computeStandings([])).toEqual([]);
  });

  it('awards 3 points for a win, 1 for a draw', () => {
    const s = computeStandings([
      g('A', 'B', 2, 0),
      g('B', 'C', 1, 1),
      g('A', 'C', 0, 1)
    ]);
    const a = s.find((x) => x.team === 'A')!;
    const b = s.find((x) => x.team === 'B')!;
    const c = s.find((x) => x.team === 'C')!;
    expect(a.points).toBe(3); // 1W (vs B), 1L (vs C)
    expect(b.points).toBe(1); // 1L, 1D
    expect(c.points).toBe(4); // 1D, 1W
  });

  it('sorts by points, then goal diff', () => {
    const s = computeStandings([
      g('A', 'B', 5, 0),   // A +5, B -5
      g('C', 'D', 1, 0),   // C +1, D -1
      g('A', 'C', 0, 1),   // A loses, C wins
      g('B', 'D', 3, 0)    // B wins big
    ]);
    expect(s[0].team).toBe('C'); // 6 pts, +2
    expect(s[1].team).toBe('A'); // 3 pts, +4 diff
    expect(s[2].team).toBe('B'); // 3 pts, -2 diff
    expect(s[3].team).toBe('D'); // 0 pts
  });

  it('aggregates goal stats per team', () => {
    const s = computeStandings([
      g('A', 'B', 2, 1),
      g('A', 'B', 0, 3)
    ]);
    const a = s.find((x) => x.team === 'A')!;
    expect(a.games).toBe(2);
    expect(a.goalsFor).toBe(2);
    expect(a.goalsAgainst).toBe(4);
    expect(a.goalDiff).toBe(-2);
  });
});
