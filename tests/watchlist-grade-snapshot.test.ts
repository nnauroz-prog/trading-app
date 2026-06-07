import { describe, expect, it } from 'vitest';
import { previousGradeFor, type WatchlistGradeSnapshot } from '@/lib/daily/watchlist-grade-snapshot';

function snap(symbol: string, klass: WatchlistGradeSnapshot['klass'], grade: 'A' | 'B' | 'C' | 'D', date: string): WatchlistGradeSnapshot {
  return { symbol, klass, grade, recordedAt: date };
}

describe('previousGradeFor', () => {
  it('leere Snapshots → null', () => {
    expect(previousGradeFor([], 'AAPL', 'Aktien', '2026-06-09')).toBeNull();
  });

  it('nur heutiger Snapshot → null (kein „vorher")', () => {
    const snaps = [snap('AAPL', 'Aktien', 'A', '2026-06-09')];
    expect(previousGradeFor(snaps, 'AAPL', 'Aktien', '2026-06-09')).toBeNull();
  });

  it('liefert jüngsten nicht-heutigen Grade', () => {
    const snaps = [
      snap('AAPL', 'Aktien', 'C', '2026-06-07'),
      snap('AAPL', 'Aktien', 'B', '2026-06-08'),
      snap('AAPL', 'Aktien', 'A', '2026-06-09')
    ];
    expect(previousGradeFor(snaps, 'AAPL', 'Aktien', '2026-06-09')).toBe('B');
  });

  it('andere Symbole werden ignoriert', () => {
    const snaps = [snap('MSFT', 'Aktien', 'A', '2026-06-08')];
    expect(previousGradeFor(snaps, 'AAPL', 'Aktien', '2026-06-09')).toBeNull();
  });

  it('andere Klasse wird ignoriert', () => {
    const snaps = [snap('AAPL', 'Rohstoffe', 'A', '2026-06-08')];
    expect(previousGradeFor(snaps, 'AAPL', 'Aktien', '2026-06-09')).toBeNull();
  });
});
