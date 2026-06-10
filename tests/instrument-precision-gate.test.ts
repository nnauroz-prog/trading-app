import { describe, expect, it } from 'vitest';
import { evaluateInstrumentPrecisionPick, type InstrumentPrecisionInput } from '@/lib/analysis/instrument-precision-gate';
import type { InstrumentSafetyAssessment } from '@/lib/market/instrument-safety';

function safety(over: Partial<InstrumentSafetyAssessment> = {}): InstrumentSafetyAssessment {
  return {
    score: 90,
    grade: 'A',
    maxSafety: true,
    passedHard: 8,
    totalHard: 8,
    criteria: [],
    verdict: 'KAUFEN',
    residualRiskNote: 'Marktrisiko bleibt.',
    ...over
  };
}

function input(over: Partial<InstrumentPrecisionInput> = {}): InstrumentPrecisionInput {
  return {
    symbol: 'AAPL',
    name: 'Apple',
    group: 'Big Tech',
    kind: 'stock',
    price: 200,
    safety: safety(),
    marketTrendPct: 1,
    backtestHitRatePct: 60,
    backtestSampleSize: 30,
    ...over
  };
}

describe('evaluateInstrumentPrecisionPick — FREIGABE', () => {
  it('Voller Stack → FREIGABE', () => {
    const r = evaluateInstrumentPrecisionPick(input());
    expect(r.verdict).toBe('FREIGABE');
    expect(r.riskLabel).toBe('LOW');
  });
});

describe('BEOBACHTEN', () => {
  it('Grade B → BEOBACHTEN', () => {
    const r = evaluateInstrumentPrecisionPick(input({ safety: safety({ grade: 'B', maxSafety: false, passedHard: 7 }) }));
    expect(r.verdict).toBe('BEOBACHTEN');
  });
  it('Safety-Score 70 (zwischen 60-75) → BEOBACHTEN', () => {
    const r = evaluateInstrumentPrecisionPick(input({ safety: safety({ score: 70, maxSafety: false, passedHard: 7 }) }));
    expect(r.verdict).toBe('BEOBACHTEN');
  });
});

describe('NICHT_VERWENDEN', () => {
  it('Grade D → blockiert', () => {
    const r = evaluateInstrumentPrecisionPick(input({ safety: safety({ grade: 'D', maxSafety: false, passedHard: 3, score: 40 }) }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Marktbreite -3 % bei Aktie → blockiert', () => {
    const r = evaluateInstrumentPrecisionPick(input({ marketTrendPct: -3 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Marktbreite -3 % bei Rohstoff → kein Markt-Veto', () => {
    const r = evaluateInstrumentPrecisionPick(input({ kind: 'commodity', marketTrendPct: -3 }));
    expect(r.verdict).toBe('FREIGABE');
  });
  it('Safety-Score 50 → blockiert', () => {
    const r = evaluateInstrumentPrecisionPick(input({ safety: safety({ score: 50, maxSafety: false, passedHard: 4 }) }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Backtest-Hit 40 % bei n>=10 → blockiert', () => {
    const r = evaluateInstrumentPrecisionPick(input({ backtestHitRatePct: 40, backtestSampleSize: 30 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
});

describe('Wording — keine verbotenen Begriffe', () => {
  const FORBIDDEN = ['sicher', 'maximal sicher', 'sehr sicher', 'garantiert', 'bank', 'todsicher', 'risikolos', 'free money', 'muss kommen'];
  it('Reasons / Blockers / Warnings frei', () => {
    const cases = [input(), input({ marketTrendPct: -3 }), input({ safety: safety({ grade: 'D', maxSafety: false, score: 35, passedHard: 2 }) })];
    for (const c of cases) {
      const r = evaluateInstrumentPrecisionPick(c);
      for (const text of [...r.reasons, ...r.blockers, ...r.warnings]) {
        const lower = text.toLowerCase();
        for (const f of FORBIDDEN) expect(lower.includes(f), `Verbotenes "${f}" in: ${text}`).toBe(false);
      }
    }
  });
});
