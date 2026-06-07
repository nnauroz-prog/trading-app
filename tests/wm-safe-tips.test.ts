import { describe, expect, it } from 'vitest';
import { rankSafeWmTips } from '@/lib/sport/wm-safe-tips';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';

// Take the first real WM date so tests work regardless of the system clock.
function firstWmDate(): string {
  const dates = WM_2026_FIXTURES.map((f) => f.date).sort();
  return dates[0];
}

describe('rankSafeWmTips', () => {
  it('liefert nur Tipps oberhalb der Mindest-Wahrscheinlichkeit', () => {
    const today = firstWmDate();
    const tips = rankSafeWmTips({ todayIso: today, maxDays: 60, minProbability: 0.7 });
    for (const t of tips) {
      expect(t.market.probability).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('liefert nur Tipps mit ausreichender Datenbasis', () => {
    const today = firstWmDate();
    const tips = rankSafeWmTips({ todayIso: today, maxDays: 60, minDataConfidence: 80 });
    for (const t of tips) {
      expect(t.prediction.dataConfidence).toBeGreaterThanOrEqual(80);
    }
  });

  it('absteigend sortiert nach Wahrscheinlichkeit-getriebenem Score', () => {
    const today = firstWmDate();
    const tips = rankSafeWmTips({ todayIso: today, maxDays: 60, minProbability: 0.6 });
    expect(tips.length).toBeGreaterThan(1);
    for (let i = 1; i < tips.length; i++) {
      const aScore = tips[i - 1].market.probability * 100 + tips[i - 1].prediction.dataConfidence * 0.1;
      const bScore = tips[i].market.probability * 100 + tips[i].prediction.dataConfidence * 0.1;
      expect(aScore + 1e-6).toBeGreaterThanOrEqual(bScore);
    }
  });

  it('respektiert das Limit', () => {
    const today = firstWmDate();
    const tips = rankSafeWmTips({ todayIso: today, maxDays: 60, minProbability: 0.5, limit: 7 });
    expect(tips.length).toBeLessThanOrEqual(7);
  });

  it('überspringt offene Paarungen wie „Sieger Gruppe A"', () => {
    const today = firstWmDate();
    const tips = rankSafeWmTips({ todayIso: today, maxDays: 365 });
    for (const t of tips) {
      expect(t.fixture.homeTeam.startsWith('Sieger')).toBe(false);
      expect(t.fixture.awayTeam.startsWith('Sieger')).toBe(false);
      expect(t.fixture.homeTeam.startsWith('Verlierer')).toBe(false);
      expect(t.fixture.awayTeam.startsWith('Verlierer')).toBe(false);
      expect(t.fixture.homeTeam.startsWith('Zweiter')).toBe(false);
      expect(t.fixture.awayTeam.startsWith('Zweiter')).toBe(false);
      expect(t.fixture.homeTeam.includes('TBD')).toBe(false);
      expect(t.fixture.awayTeam.includes('TBD')).toBe(false);
    }
  });

  it('vergibt pro Spiel maximal einen Tipp pro Markt-Kategorie', () => {
    const today = firstWmDate();
    const tips = rankSafeWmTips({ todayIso: today, maxDays: 60 });
    const seenPerFixture = new Map<string, Set<string>>();
    function categoryOf(label: string): string {
      if (label.includes('Über')) return 'over';
      if (label.includes('Unter')) return 'under';
      if (label.includes('BTTS') || label.includes('Beide Teams treffen')) return 'btts';
      if (label.includes('trifft nicht')) return 'no-btts';
      if (label.includes('Doppelchance')) return 'dc';
      if (label.includes('Kein Remis')) return 'no-draw';
      return '1x2';
    }
    for (const t of tips) {
      const cat = categoryOf(t.market.market);
      const set = seenPerFixture.get(t.fixture.id) ?? new Set();
      expect(set.has(cat)).toBe(false);
      set.add(cat);
      seenPerFixture.set(t.fixture.id, set);
    }
  });

  it('„maximal"-Tier nur wenn ≥85 % UND Datenbasis ≥80', () => {
    const today = firstWmDate();
    const tips = rankSafeWmTips({ todayIso: today, maxDays: 60, minProbability: 0.5 });
    for (const t of tips) {
      if (t.tier === 'maximal') {
        expect(t.market.probability).toBeGreaterThanOrEqual(0.85);
        expect(t.prediction.dataConfidence).toBeGreaterThanOrEqual(80);
      }
    }
  });

  it('Tipps liegen innerhalb des Zeitfensters', () => {
    const today = firstWmDate();
    const horizonDays = 7;
    const tips = rankSafeWmTips({ todayIso: today, maxDays: horizonDays, minProbability: 0.5 });
    const todayMs = new Date(`${today}T00:00:00`).getTime();
    const horizonMs = todayMs + horizonDays * 24 * 60 * 60 * 1000;
    for (const t of tips) {
      const fMs = new Date(`${t.fixture.date}T00:00:00`).getTime();
      expect(fMs).toBeGreaterThanOrEqual(todayMs);
      expect(fMs).toBeLessThanOrEqual(horizonMs);
    }
  });

  it('mit unrealistisch hoher Schwelle → leere Liste statt Schummel-Tipps', () => {
    const today = firstWmDate();
    const tips = rankSafeWmTips({ todayIso: today, maxDays: 60, minProbability: 0.999 });
    // Sollte sehr klein oder leer sein.
    expect(tips.length).toBeLessThan(3);
  });
});
