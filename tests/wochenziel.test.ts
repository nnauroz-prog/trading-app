import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startOfIsoWeek, computeWochenzielProgress, saveWochenziel, loadWochenziel, clearWochenziel } from '@/lib/sport/wochenziel';
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
    league: 'L', date: '2026-06-04', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 60,
    outcome: 'pending',
    ...over
  };
}

describe('startOfIsoWeek', () => {
  it('Mittwoch → Montag derselben Woche, 00:00', () => {
    const wed = new Date('2026-06-03T14:23:00');
    const start = new Date(startOfIsoWeek(wed));
    expect(start.getDay()).toBe(1); // Montag
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it('Sonntag → Montag der Woche davor', () => {
    const sun = new Date('2026-06-07T22:00:00');
    const start = new Date(startOfIsoWeek(sun));
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(1); // 1. Juni
  });
});

describe('save/loadWochenziel', () => {
  it('round-trip', () => {
    saveWochenziel(5);
    expect(loadWochenziel()?.targetWins).toBe(5);
  });

  it('lehnt unsinnige Werte ab', () => {
    saveWochenziel(-3);
    expect(loadWochenziel()).toBe(null);
    saveWochenziel(99);
    expect(loadWochenziel()).toBe(null);
  });

  it('clearWochenziel', () => {
    saveWochenziel(3);
    clearWochenziel();
    expect(loadWochenziel()).toBe(null);
  });
});

describe('computeWochenzielProgress', () => {
  it('null wenn kein Ziel gesetzt', () => {
    expect(computeWochenzielProgress()).toBe(null);
  });

  it('rechnet Treffer/Pending/Resolved aus dieser Woche', () => {
    const now = new Date('2026-06-03T12:00:00'); // Mittwoch
    const weekStart = startOfIsoWeek(now);
    saveWochenziel(4);
    seed([
      entry({ id: '1', recordedAt: weekStart + 1000, outcome: 'win' }),
      entry({ id: '2', recordedAt: weekStart + 2000, outcome: 'win' }),
      entry({ id: '3', recordedAt: weekStart + 3000, outcome: 'pending' }),
      entry({ id: '4', recordedAt: weekStart - 1000 * 60 * 60 * 24, outcome: 'win' }) // letzte Woche
    ]);
    const p = computeWochenzielProgress(now)!;
    expect(p.currentWins).toBe(2);
    expect(p.pending).toBe(1);
    expect(p.resolved).toBe(2);
    expect(p.targetWins).toBe(4);
    expect(p.reached).toBe(false);
    expect(p.percent).toBe(50);
  });

  it('reached=true wenn Ziel erreicht', () => {
    const now = new Date('2026-06-03T12:00:00');
    const weekStart = startOfIsoWeek(now);
    saveWochenziel(2);
    seed([
      entry({ id: '1', recordedAt: weekStart + 1000, outcome: 'win' }),
      entry({ id: '2', recordedAt: weekStart + 2000, outcome: 'win' }),
      entry({ id: '3', recordedAt: weekStart + 3000, outcome: 'win' })
    ]);
    const p = computeWochenzielProgress(now)!;
    expect(p.reached).toBe(true);
    expect(p.percent).toBe(100);
  });
});
