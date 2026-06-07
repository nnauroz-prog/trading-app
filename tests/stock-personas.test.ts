import { describe, expect, it } from 'vitest';
import { evaluateStockPersonas } from '@/lib/agents/stock-personas';
import type { StockSafetyEntry } from '@/lib/market/stock-safety-scan';
import type { InstrumentSafetyAssessment, InstrumentSafetyCriterion } from '@/lib/market/instrument-safety';

function criterion(id: string, passed: boolean): InstrumentSafetyCriterion {
  return { id, label: id, passed, detail: 'test' };
}

function entry(symbol: string, group: string, grade: 'A' | 'B' | 'C' | 'D', passedHard: number, criteriaOverride: Partial<Record<string, boolean>> = {}): StockSafetyEntry {
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

describe('evaluateStockPersonas', () => {
  it('liefert immer drei Personas', () => {
    const result = evaluateStockPersonas([]);
    expect(result.map((v) => v.persona)).toEqual(['conservative', 'balanced', 'aggressive']);
  });

  it('alle drei warten, wenn kein Setup da ist', () => {
    const result = evaluateStockPersonas([]);
    expect(result.every((v) => v.verdict === 'WARTEN')).toBe(true);
    expect(result.every((v) => v.target === null)).toBe(true);
  });

  it('Konservativ kauft nur bei Grade A', () => {
    const entries = [entry('AAPL', 'Tech', 'B', 7)];
    const result = evaluateStockPersonas(entries);
    const conservative = result.find((v) => v.persona === 'conservative')!;
    expect(conservative.verdict).not.toBe('KAUFEN');
  });

  it('Konservativ kauft Grade A wenn Team ohne Negativ-Stimme', () => {
    const entries = [entry('AAPL', 'Tech', 'A', 8)];
    const result = evaluateStockPersonas(entries);
    const conservative = result.find((v) => v.persona === 'conservative')!;
    expect(conservative.verdict).toBe('KAUFEN');
    expect(conservative.target?.symbol).toBe('AAPL');
  });

  it('Balanciert kauft Grade A und Grade B mit max. 1 negative Stimme', () => {
    const entries = [entry('MSFT', 'Tech', 'B', 7)];
    const result = evaluateStockPersonas(entries);
    const balanced = result.find((v) => v.persona === 'balanced')!;
    expect(['KAUFEN', 'BEOBACHTEN']).toContain(balanced.verdict);
    expect(balanced.target?.symbol).toBe('MSFT');
  });

  it('Aggressiv nimmt Grade C wenn Volumen ok', () => {
    const entries = [entry('NVDA', 'Tech', 'C', 5)];
    const result = evaluateStockPersonas(entries);
    const aggressive = result.find((v) => v.persona === 'aggressive')!;
    expect(aggressive.target?.symbol).toBe('NVDA');
    expect(aggressive.verdict).toBe('KAUFEN');
  });

  it('Aggressiv lehnt Grade D ab', () => {
    const entries = [entry('XYZ', 'Misc', 'D', 2)];
    const result = evaluateStockPersonas(entries);
    const aggressive = result.find((v) => v.persona === 'aggressive')!;
    expect(aggressive.target).toBeNull();
    expect(aggressive.verdict).toBe('WARTEN');
  });

  it('Sub-Agenten reflektieren die Kriterien der Aktie', () => {
    const entries = [entry('AAPL', 'Tech', 'A', 8, { 'volume-alive': false })];
    const result = evaluateStockPersonas(entries);
    const aggressive = result.find((v) => v.persona === 'aggressive')!;
    const liquidity = aggressive.team.find((t) => t.name.includes('Liquid'));
    expect(liquidity?.vote).toBe('NEGATIV');
    // Liquidity NEG = aggressive blockt
    expect(aggressive.verdict).toBe('WARTEN');
  });
});
