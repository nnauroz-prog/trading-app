import { describe, expect, it } from 'vitest';
import { fixturesByCity } from '@/lib/sport/wm-city-filter';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';

describe('fixturesByCity', () => {
  it('aggregiert pro Venue', () => {
    const cities = fixturesByCity('2026-06-03');
    expect(cities.length).toBeGreaterThan(0);
    // Summe der matchCounts = Anzahl Fixtures.
    const total = cities.reduce((s, c) => s + c.matchCount, 0);
    expect(total).toBe(WM_2026_FIXTURES.length);
  });

  it('sortiert nach matchCount absteigend', () => {
    const cities = fixturesByCity('2026-06-03');
    for (let i = 1; i < cities.length; i++) {
      expect(cities[i - 1].matchCount).toBeGreaterThanOrEqual(cities[i].matchCount);
    }
  });

  it('upcoming-Liste enthält keine vergangenen Spiele', () => {
    const cities = fixturesByCity('2026-08-01');
    for (const c of cities) {
      for (const u of c.upcoming) {
        expect(u.date >= '2026-08-01').toBe(true);
      }
    }
  });

  it('city wird aus Venue extrahiert', () => {
    const cities = fixturesByCity('2026-06-03');
    const azteca = cities.find((c) => c.venue.includes('Azteca'));
    expect(azteca?.city).toBe('Mexico City');
  });
});
