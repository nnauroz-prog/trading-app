import { describe, expect, it } from 'vitest';
import { summarizeStockSectors } from '@/lib/market/sector-safety-summary';
import type { StockSafetyEntry } from '@/lib/market/stock-safety-scan';
import type { InstrumentSafetyAssessment } from '@/lib/market/instrument-safety';

function entry(symbol: string, group: string, grade: 'A' | 'B' | 'C' | 'D'): StockSafetyEntry {
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

describe('summarizeStockSectors', () => {
  it('zählt Grades pro Gruppe korrekt', () => {
    const entries = [
      entry('AAPL', 'US Tech', 'A'),
      entry('MSFT', 'US Tech', 'B'),
      entry('NVDA', 'US Tech', 'A'),
      entry('JNJ', 'US Health', 'C')
    ];
    const rows = summarizeStockSectors(entries);
    const tech = rows.find((r) => r.group === 'US Tech');
    expect(tech).toMatchObject({ total: 3, a: 2, b: 1, c: 0, d: 0 });
    const health = rows.find((r) => r.group === 'US Health');
    expect(health).toMatchObject({ total: 1, a: 0, b: 0, c: 1, d: 0 });
  });

  it('Sektoren mit den meisten Grade-A zuerst', () => {
    const entries = [
      entry('AAPL', 'US Tech', 'A'),
      entry('NVDA', 'US Tech', 'A'),
      entry('JNJ', 'US Health', 'A'),
      entry('JPM', 'US Finanz', 'C')
    ];
    const rows = summarizeStockSectors(entries);
    expect(rows[0].group).toBe('US Tech');
    expect(rows[1].group).toBe('US Health');
    expect(rows[2].group).toBe('US Finanz');
  });

  it('alphabetisches Tiebreaking bei gleichem Grade-A-Count', () => {
    const entries = [
      entry('A1', 'Beta', 'A'),
      entry('A2', 'Alpha', 'A')
    ];
    const rows = summarizeStockSectors(entries);
    expect(rows[0].group).toBe('Alpha');
    expect(rows[1].group).toBe('Beta');
  });

  it('leere Eingabe → leere Liste', () => {
    expect(summarizeStockSectors([])).toEqual([]);
  });

  it('einzelner Sektor wird korrekt zusammengefasst', () => {
    const rows = summarizeStockSectors([entry('AAPL', 'US Tech', 'D')]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ group: 'US Tech', total: 1, a: 0, b: 0, c: 0, d: 1 });
  });
});
