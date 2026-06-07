import { describe, expect, it } from 'vitest';
import { dayBucketFor, groupByDayBucket } from '@/lib/sport/day-bucket';

describe('dayBucketFor', () => {
  it('heute = selber Tag', () => {
    expect(dayBucketFor('2026-06-10', '2026-06-10')).toBe('heute');
  });
  it('Termin in der Vergangenheit zählt als heute (Verspätung)', () => {
    expect(dayBucketFor('2026-06-09', '2026-06-10')).toBe('heute');
  });
  it('morgen', () => {
    expect(dayBucketFor('2026-06-11', '2026-06-10')).toBe('morgen');
  });
  it('übermorgen', () => {
    expect(dayBucketFor('2026-06-12', '2026-06-10')).toBe('uebermorgen');
  });
  it('diese Woche (3–7 Tage)', () => {
    expect(dayBucketFor('2026-06-13', '2026-06-10')).toBe('woche');
    expect(dayBucketFor('2026-06-17', '2026-06-10')).toBe('woche');
  });
  it('später (>7 Tage)', () => {
    expect(dayBucketFor('2026-06-30', '2026-06-10')).toBe('spaeter');
  });
});

describe('groupByDayBucket', () => {
  it('sortiert in der richtigen Reihenfolge', () => {
    const items = [
      { id: 'd', date: '2026-06-30' },
      { id: 'a', date: '2026-06-10' },
      { id: 'b', date: '2026-06-11' },
      { id: 'c', date: '2026-06-14' }
    ];
    const groups = groupByDayBucket(items, (i) => i.date, '2026-06-10');
    expect(groups.map((g) => g.key)).toEqual(['heute', 'morgen', 'woche', 'spaeter']);
  });

  it('leere Gruppen werden weggelassen', () => {
    const items = [{ id: 'a', date: '2026-06-10' }];
    const groups = groupByDayBucket(items, (i) => i.date, '2026-06-10');
    expect(groups.map((g) => g.key)).toEqual(['heute']);
  });

  it('komplett leere Liste → leeres Array', () => {
    const groups = groupByDayBucket<{ date: string }>([], (i) => i.date, '2026-06-10');
    expect(groups).toEqual([]);
  });
});
