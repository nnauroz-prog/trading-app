import { describe, expect, it } from 'vitest';
import { bucketByDay, fixtureBerlinDate } from '@/lib/sport/day-buckets';
import type { UpcomingFixture } from '@/lib/sport/fetcher';

function fixture(overrides: Partial<UpcomingFixture> & { date: string; time?: string | null; id?: string }): UpcomingFixture {
  const { date, time, id, ...rest } = overrides;
  return {
    id: id ?? `${date}-${time ?? 'n'}`,
    homeTeam: 'Home',
    awayTeam: 'Away',
    league: 'L1',
    date,
    time: time ?? null,
    venue: null,
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    prediction: null,
    probabilities: null,
    tips: null,
    ...rest
  };
}

describe('fixtureBerlinDate', () => {
  it('keeps the same calendar date for an afternoon kickoff', () => {
    expect(fixtureBerlinDate('2026-06-01', '16:00')).toBe('2026-06-01');
  });

  it('rolls over to the next day for a late-night kickoff in summer', () => {
    // 23:00 UTC on 2026-06-01 is 01:00 Berlin on 2026-06-02 (CEST = UTC+2).
    expect(fixtureBerlinDate('2026-06-01', '23:00')).toBe('2026-06-02');
  });

  it('falls back to the raw date when time is missing', () => {
    expect(fixtureBerlinDate('2026-06-15', null)).toBe('2026-06-15');
  });
});

describe('bucketByDay', () => {
  const today = '2026-06-01';

  it('buckets a fixture exactly on today into today', () => {
    const fx = [fixture({ date: today, time: '15:30' })];
    const b = bucketByDay(fx, today);
    expect(b.today).toHaveLength(1);
    expect(b.tomorrow).toHaveLength(0);
  });

  it('buckets a fixture on the next Berlin day into tomorrow', () => {
    const fx = [fixture({ date: today, time: '23:00' })];
    const b = bucketByDay(fx, today);
    expect(b.today).toHaveLength(0);
    expect(b.tomorrow).toHaveLength(1);
  });

  it('drops fixtures that already happened', () => {
    const fx = [fixture({ date: '2026-05-30', time: '16:00' })];
    const b = bucketByDay(fx, today);
    expect(b.today).toHaveLength(0);
    expect(b.tomorrow).toHaveLength(0);
    expect(b.laterFirst).toHaveLength(0);
  });

  it('sorts today by kickoff time', () => {
    const fx = [
      fixture({ id: 'late', date: today, time: '20:00' }),
      fixture({ id: 'early', date: today, time: '13:00' })
    ];
    const b = bucketByDay(fx, today);
    expect(b.today.map((f) => f.id)).toEqual(['early', 'late']);
  });

  it('returns the next match day when today and tomorrow are empty', () => {
    const fx = [
      fixture({ id: 'a', date: '2026-06-05', time: '16:00' }),
      fixture({ id: 'b', date: '2026-06-05', time: '18:30' }),
      fixture({ id: 'c', date: '2026-06-07', time: '14:00' })
    ];
    const b = bucketByDay(fx, today);
    expect(b.laterFirstDate).toBe('2026-06-05');
    expect(b.laterFirst.map((f) => f.id).sort()).toEqual(['a', 'b']);
  });
});
