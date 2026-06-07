import { describe, expect, it } from 'vitest';
import { evaluateCommodityPersonas } from '@/lib/agents/commodity-personas';
import type { CommoditySafetyEntry } from '@/lib/market/commodity-safety-scan';
import type { InstrumentSafetyAssessment, InstrumentSafetyCriterion } from '@/lib/market/instrument-safety';

function criterion(id: string, passed: boolean): InstrumentSafetyCriterion {
  return { id, label: id, passed, detail: 'test' };
}

function entry(symbol: string, group: string, grade: 'A' | 'B' | 'C' | 'D', passedHard: number, criteriaOverride: Partial<Record<string, boolean>> = {}): CommoditySafetyEntry {
  const idsAndDefaults: Array<[string, boolean]> = [
    ['above-ma200', grade === 'A' || grade === 'B'],
    ['above-ma50', grade !== 'D'],
    ['ma-stack', grade === 'A'],
    ['rsi-not-overbought', true],
    ['rsi-not-falling-knife', true],
    ['52w-position', grade !== 'D'],
    ['volume-alive', grade !== 'D'],
    ['momentum-1m', grade === 'A' || grade === 'B']
  ];
  const criteria = idsAndDefaults.map(([id, def]) => criterion(id, criteriaOverride[id] ?? def));
  return {
    symbol, name: symbol, group, price: 100,
    assessment: {
      grade, score: grade === 'A' ? 100 : grade === 'B' ? 87 : grade === 'C' ? 62 : 40,
      maxSafety: grade === 'A',
      passedHard,
      totalHard: 8,
      criteria,
      verdict: grade === 'A' ? 'KAUFEN' : grade === 'B' || grade === 'C' ? 'BEOBACHTEN' : 'NICHT KAUFEN',
      residualRiskNote: 'note'
    } as InstrumentSafetyAssessment
  };
}

describe('evaluateCommodityPersonas', () => {
  it('liefert immer drei Personas', () => {
    const result = evaluateCommodityPersonas([]);
    expect(result.map((v) => v.persona)).toEqual(['conservative', 'balanced', 'aggressive']);
  });

  it('alle warten ohne Setup', () => {
    const result = evaluateCommodityPersonas([]);
    expect(result.every((v) => v.verdict === 'WARTEN')).toBe(true);
  });

  it('Konservativ kauft nur Grade A', () => {
    const a = entry('GC=F', 'Edelmetalle', 'A', 8);
    const c = entry('SI=F', 'Edelmetalle', 'C', 5);
    const result = evaluateCommodityPersonas([c, a]);
    const conservative = result.find((v) => v.persona === 'conservative')!;
    expect(conservative.target?.symbol).toBe('GC=F');
    expect(conservative.verdict).toBe('KAUFEN');
  });

  it('Aggressiv akzeptiert auch Grade C', () => {
    const result = evaluateCommodityPersonas([entry('PL=F', 'Edelmetalle', 'C', 5)]);
    const aggressive = result.find((v) => v.persona === 'aggressive')!;
    expect(aggressive.verdict).toBe('KAUFEN');
  });

  it('Aggressiv blockiert bei totem Volumen', () => {
    const result = evaluateCommodityPersonas([entry('XX=F', 'Misc', 'C', 5, { 'volume-alive': false })]);
    const aggressive = result.find((v) => v.persona === 'aggressive')!;
    expect(aggressive.verdict).toBe('WARTEN');
  });
});
