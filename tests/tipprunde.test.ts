import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeTipprundeStats } from '@/lib/sport/tipprunde';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

beforeEach(() => {
  const w = globalThis as unknown as { window: { localStorage: MemoryStorage; addEventListener: () => void; dispatchEvent: () => void } };
  w.window = {
    localStorage: new MemoryStorage(),
    addEventListener: () => {},
    dispatchEvent: () => {}
  };
});

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

function seed(log: TipJournalEntry[]): void {
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.setItem(
    'trading-app.sport-tip-journal-v1',
    JSON.stringify(log)
  );
}

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: Date.now(),
    league: 'L', date: '2026-05-01', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 60,
    outcome: 'pending',
    ...over
  };
}

describe('computeTipprundeStats', () => {
  it('liefert leere Stats wenn kein Tipp', () => {
    const s = computeTipprundeStats();
    expect(s.total).toBe(0);
    expect(s.resolved).toBe(0);
    expect(s.hitRatePct).toBe(null);
    expect(s.currentStreak).toBe(0);
    expect(s.bestBand).toBe(null);
  });

  it('berechnet Trefferquote, aktuelle und beste Streak', () => {
    seed([
      entry({ id: '1', outcome: 'win', resolvedAt: 1 }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2 }),
      entry({ id: '3', outcome: 'loss', resolvedAt: 3 }),
      entry({ id: '4', outcome: 'win', resolvedAt: 4 }),
      entry({ id: '5', outcome: 'win', resolvedAt: 5 }),
      entry({ id: '6', outcome: 'win', resolvedAt: 6 })
    ]);
    const s = computeTipprundeStats();
    expect(s.resolved).toBe(6);
    expect(s.wins).toBe(5);
    expect(s.hitRatePct).toBe(83);
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(3);
  });

  it('ignoriert Push für Trefferquote', () => {
    seed([
      entry({ id: '1', outcome: 'win', resolvedAt: 1 }),
      entry({ id: '2', outcome: 'push', resolvedAt: 2 }),
      entry({ id: '3', outcome: 'loss', resolvedAt: 3 })
    ]);
    const s = computeTipprundeStats();
    expect(s.wins).toBe(1);
    expect(s.hitRatePct).toBe(50);
  });

  it('liefert bestes Quality-Band ab 3 ausgewerteten', () => {
    seed([
      entry({ id: '1', outcome: 'win', resolvedAt: 1, qualityBand: 'sehr_stark' }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2, qualityBand: 'sehr_stark' }),
      entry({ id: '3', outcome: 'win', resolvedAt: 3, qualityBand: 'sehr_stark' }),
      entry({ id: '4', outcome: 'loss', resolvedAt: 4, qualityBand: 'orientierung' }),
      entry({ id: '5', outcome: 'loss', resolvedAt: 5, qualityBand: 'orientierung' }),
      entry({ id: '6', outcome: 'loss', resolvedAt: 6, qualityBand: 'orientierung' })
    ]);
    const s = computeTipprundeStats();
    expect(s.bestBand?.band).toBe('sehr_stark');
    expect(s.bestBand?.hitRatePct).toBe(100);
  });

  it('bestes Band ist null wenn jedes Band weniger als 3 Tipps hat', () => {
    seed([
      entry({ id: '1', outcome: 'win', resolvedAt: 1, qualityBand: 'sehr_stark' }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2, qualityBand: 'stark' })
    ]);
    const s = computeTipprundeStats();
    expect(s.bestBand).toBe(null);
  });

  it('letzte 5 Tipps neueste-zuerst', () => {
    seed([
      entry({ id: '1', outcome: 'win', resolvedAt: 1 }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2 }),
      entry({ id: '3', outcome: 'win', resolvedAt: 3 }),
      entry({ id: '4', outcome: 'win', resolvedAt: 4 }),
      entry({ id: '5', outcome: 'win', resolvedAt: 5 }),
      entry({ id: '6', outcome: 'win', resolvedAt: 6 })
    ]);
    const s = computeTipprundeStats();
    expect(s.recent.length).toBe(5);
    expect(s.recent[0].id).toBe('6');
  });
});
