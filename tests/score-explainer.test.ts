import { describe, expect, it } from 'vitest';
import { explainScore } from '@/lib/sport/score-explainer';
import type { QualityScoreResult } from '@/lib/sport/prediction-quality-score';

function result(over: Partial<QualityScoreResult> = {}): QualityScoreResult {
  return {
    score: 80,
    band: 'stark',
    bandLabel: 'starke Prognose',
    recommendation: {
      market: '1X', probability: 0.7, label: 'Doppelchance 1X', rationale: '', isStableMarket: true
    },
    parts: { probability: 35, confidence: 20, dataQuality: 15, marketRisk: 10, actuality: 5 },
    warnings: [],
    ...over
  };
}

describe('explainScore', () => {
  it('liefert Reasoning für hohen Score', () => {
    const e = explainScore(result());
    expect(e.reasoning.length).toBe(4); // ohne beendet
    expect(e.reasoning.join(' ')).toContain('Hohe Modell-Wahrscheinlichkeit');
    expect(e.reasoning.join(' ')).toContain('klar');
    expect(e.reasoning.join(' ')).toContain('Stabiler Markt');
  });

  it('weist schwache Datenlage explizit aus', () => {
    const e = explainScore(result({
      parts: { probability: 35, confidence: 20, dataQuality: 4, marketRisk: 10, actuality: 5 }
    }));
    expect(e.reasoning.join(' ')).toContain('Datenlage schwach');
  });

  it('exakter Score wird erwähnt', () => {
    const e = explainScore(result({
      parts: { probability: 35, confidence: 20, dataQuality: 15, marketRisk: 0, actuality: 5 }
    }));
    expect(e.reasoning.join(' ')).toContain('Exakter Score');
  });

  it('beendetes Spiel wird hinzugefügt', () => {
    const e = explainScore(result({
      parts: { probability: 35, confidence: 20, dataQuality: 15, marketRisk: 10, actuality: 0 }
    }));
    expect(e.reasoning.some((r) => r.includes('beendet'))).toBe(true);
  });
});
