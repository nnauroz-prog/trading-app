import { describe, expect, it } from 'vitest';
import { computeLeagueCoverage, summarizeCoverage } from '@/lib/sport/league-coverage';
import type { LeagueFixtures, UpcomingFixture, Fixture } from '@/lib/sport/fetcher';

function fx(over: Partial<UpcomingFixture>): UpcomingFixture {
  return {
    id: 'f', homeTeam: 'A', awayTeam: 'B', league: 'L', date: '2026-06-04',
    time: '20:00', venue: null, homeScore: null, awayScore: null, status: 'upcoming',
    prediction: null, probabilities: null, tips: null,
    ...over
  };
}

function lf(name: string, next: UpcomingFixture[], last: Fixture[] = []): LeagueFixtures {
  return { league: { id: name, name, country: 'X' }, next, last };
}

describe('computeLeagueCoverage', () => {
  it('zählt heutige + nächste 7 Tage', () => {
    const rows = computeLeagueCoverage([
      lf('A', [
        fx({ id: '1', date: '2026-06-04' }),
        fx({ id: '2', date: '2026-06-08' }),
        fx({ id: '3', date: '2026-06-20' })
      ])
    ], '2026-06-04');
    expect(rows[0].todayCount).toBe(1);
    expect(rows[0].next7dCount).toBe(2);
  });

  it('hasProbabilities = false wenn alle probabilities null', () => {
    const rows = computeLeagueCoverage([
      lf('A', [fx({ id: '1', date: '2026-06-04', probabilities: null })])
    ], '2026-06-04');
    expect(rows[0].hasProbabilities).toBe(false);
  });

  it('hasFinishedPool spiegelt last-Liste', () => {
    const rows = computeLeagueCoverage([
      lf('A', [], [{ id: 'x', homeTeam: 'A', awayTeam: 'B', league: 'L', date: '2026-05-01', time: null, venue: null, homeScore: 1, awayScore: 1, status: 'finished' }])
    ], '2026-06-04');
    expect(rows[0].hasFinishedPool).toBe(true);
  });
});

describe('summarizeCoverage', () => {
  it('aggregiert über alle Ligen', () => {
    const rows = computeLeagueCoverage([
      lf('A', [fx({ id: '1', date: '2026-06-04' }), fx({ id: '2', date: '2026-06-05' })]),
      lf('B', []),
      lf('C', [fx({ id: '3', date: '2026-06-04' })])
    ], '2026-06-04');
    const s = summarizeCoverage(rows);
    expect(s.totalLeagues).toBe(3);
    expect(s.activeLeagues).toBe(2);
    expect(s.todayTotal).toBe(2);
    expect(s.next7dTotal).toBe(3);
  });
});
