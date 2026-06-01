import { describe, expect, it } from 'vitest';
import { computeHeadToHead } from '@/lib/sport/h2h';
import type { Fixture } from '@/lib/sport/fetcher';

function finished(home: string, away: string, hs: number, as: number, date: string): Fixture {
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

describe('computeHeadToHead', () => {
  it('counts wins/draws/losses from the upcoming home team perspective', () => {
    const past = [
      finished('A', 'B', 2, 1, '2026-01-15'), // A wins
      finished('B', 'A', 0, 0, '2025-09-10'), // draw
      finished('B', 'A', 1, 3, '2025-04-22'), // A wins (away)
      finished('A', 'B', 0, 2, '2024-11-05')  // A loses
    ];
    const h2h = computeHeadToHead('A', 'B', past);
    expect(h2h.meetings).toBe(4);
    expect(h2h.winsForHome).toBe(2);
    expect(h2h.draws).toBe(1);
    expect(h2h.winsForAway).toBe(1);
    expect(h2h.goalsForHome).toBe(5);
    // 1 (A 2-1 B) + 0 (B 0-0 A) + 1 (B 1-3 A) + 2 (A 0-2 B) = 4
    expect(h2h.goalsForAway).toBe(4);
  });

  it('returns the most recent meeting as lastMeeting', () => {
    const past = [
      finished('A', 'B', 2, 1, '2024-11-05'),
      finished('B', 'A', 3, 0, '2026-02-10')
    ];
    const h2h = computeHeadToHead('A', 'B', past);
    expect(h2h.lastMeeting?.date).toBe('2026-02-10');
    expect(h2h.lastMeeting?.homeTeam).toBe('B');
    expect(h2h.lastMeeting?.homeScore).toBe(3);
  });

  it('ignores unrelated fixtures and unfinished matches', () => {
    const past: Fixture[] = [
      finished('A', 'C', 2, 0, '2026-01-01'),
      {
        id: 'unf',
        homeTeam: 'A',
        awayTeam: 'B',
        league: 'L1',
        date: '2026-06-01',
        time: '20:00',
        venue: null,
        homeScore: null,
        awayScore: null,
        status: 'finished'
      }
    ];
    const h2h = computeHeadToHead('A', 'B', past);
    expect(h2h.meetings).toBe(0);
    expect(h2h.lastMeeting).toBeNull();
  });

  it('handles teams that have never met', () => {
    const h2h = computeHeadToHead('X', 'Y', []);
    expect(h2h.meetings).toBe(0);
    expect(h2h.winsForHome + h2h.draws + h2h.winsForAway).toBe(0);
    expect(h2h.lastMeeting).toBeNull();
  });
});
