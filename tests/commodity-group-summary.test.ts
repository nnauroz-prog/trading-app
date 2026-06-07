import { describe, expect, it } from 'vitest';
import { summarizeCommodityGroups, detectHotCommodityGroups } from '@/lib/market/commodity-group-summary';
import type { CommoditySafetyEntry } from '@/lib/market/commodity-safety-scan';
import type { InstrumentSafetyAssessment } from '@/lib/market/instrument-safety';

function entry(symbol: string, group: string, grade: 'A' | 'B' | 'C' | 'D'): CommoditySafetyEntry {
  return {
    symbol, name: symbol, group, price: 100,
    assessment: {
      grade, score: grade === 'A' ? 100 : grade === 'B' ? 87 : grade === 'C' ? 62 : 40,
      maxSafety: grade === 'A',
      passedHard: grade === 'A' ? 8 : grade === 'B' ? 7 : grade === 'C' ? 5 : 3,
      totalHard: 8,
      criteria: [],
      verdict: grade === 'A' ? 'KAUFEN' : grade === 'B' || grade === 'C' ? 'BEOBACHTEN' : 'NICHT KAUFEN',
      residualRiskNote: 'note'
    } as InstrumentSafetyAssessment
  };
}

describe('summarizeCommodityGroups', () => {
  it('zählt Grades pro Gruppe', () => {
    const rows = summarizeCommodityGroups([
      entry('GC=F', 'Edelmetalle', 'A'),
      entry('SI=F', 'Edelmetalle', 'B'),
      entry('CL=F', 'Energie', 'D')
    ]);
    expect(rows.find((r) => r.group === 'Edelmetalle')).toMatchObject({ total: 2, a: 1, b: 1 });
    expect(rows.find((r) => r.group === 'Energie')).toMatchObject({ total: 1, d: 1 });
  });

  it('Sortierung Grade-A absteigend, dann alphabetisch', () => {
    const rows = summarizeCommodityGroups([
      entry('a', 'Beta', 'A'),
      entry('b', 'Alpha', 'A')
    ]);
    expect(rows[0].group).toBe('Alpha');
    expect(rows[1].group).toBe('Beta');
  });
});

describe('detectHotCommodityGroups', () => {
  it('erkennt Gruppen mit ≥40 % Grade-A', () => {
    const hot = detectHotCommodityGroups([
      entry('a', 'Edelmetalle', 'A'),
      entry('b', 'Edelmetalle', 'A'),
      entry('c', 'Edelmetalle', 'B'),
      entry('d', 'Energie', 'C')
    ], 0.4);
    expect(hot).toHaveLength(1);
    expect(hot[0].group).toBe('Edelmetalle');
  });

  it('Schwelle respektiert', () => {
    const entries = [entry('a', 'X', 'A'), entry('b', 'X', 'B')];
    expect(detectHotCommodityGroups(entries, 0.4)).toHaveLength(1);
    expect(detectHotCommodityGroups(entries, 0.6)).toHaveLength(0);
  });

  it('leere Eingabe → leeres Array', () => {
    expect(detectHotCommodityGroups([])).toEqual([]);
  });
});
