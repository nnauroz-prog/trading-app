import { describe, expect, it } from 'vitest';
import { daysUntil, nextSeasonStarts, SEASON_STARTS_2026_27 } from '@/lib/sport/season-starts';

describe('daysUntil', () => {
  it('rechnet positive Tage für Zukunfts-Datum', () => {
    expect(daysUntil('2026-06-03', '2026-08-14')).toBe(72);
  });

  it('liefert 0 für heute', () => {
    expect(daysUntil('2026-06-03', '2026-06-03')).toBe(0);
  });

  it('liefert negative Tage für Vergangenheit', () => {
    expect(daysUntil('2026-06-03', '2026-05-31')).toBe(-3);
  });
});

describe('nextSeasonStarts', () => {
  it('liefert alle 5 Top-Ligen sortiert nach Datum am 3. Juni', () => {
    const list = nextSeasonStarts('2026-06-03');
    expect(list.length).toBe(5);
    expect(list[0].iso).toBe('2026-08-14');
    expect(list[0].league).toBe('Premier League');
  });

  it('filtert Ligen aus, deren Start in der Vergangenheit liegt', () => {
    const list = nextSeasonStarts('2026-08-25');
    expect(list.length).toBe(0); // alle Top-5 starten vor 25. Aug.
  });

  it('Premier League ist die erste in der 2026/27-Saison', () => {
    const sorted = [...SEASON_STARTS_2026_27].sort((a, b) => a.iso.localeCompare(b.iso));
    expect(sorted[0].league).toBe('Premier League');
  });
});
