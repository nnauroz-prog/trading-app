import { describe, expect, it } from 'vitest';
import { evaluateTradeTier90 } from '@/lib/agents/trade-tier-90';
import type { AgentVerdict } from '@/lib/agents/personas';

function verdict(persona: 'conservative' | 'balanced' | 'aggressive', kind: 'BUY' | 'WAIT', grade: 'A' | 'B' | null, direction: 'kaufen' | 'warten' | 'mixed', confidence = 0.7): AgentVerdict {
  return {
    persona,
    name: persona === 'conservative' ? 'Konservativ' : persona === 'balanced' ? 'Balanciert' : 'Aggressiv',
    motto: '', manifest: '',
    verdict: kind,
    target: null,
    safety: grade ? { score: 80, maxSafety: grade === 'A', grade, criteria: [], passedHard: 8, totalHard: 8, residualRiskNote: '' } : null,
    rationale: '',
    team: [],
    voteSummary: { total: 7, positiveVotes: 5, negativeVotes: 1, neutralVotes: 1, direction, confidence, skillWeightedConfidence: confidence },
    ceoFinalWord: ''
  };
}

describe('evaluateTradeTier90', () => {
  it('qualifies only when all 5 pillars are green', () => {
    const v = [
      verdict('conservative', 'BUY', 'A', 'kaufen', 0.75),
      verdict('balanced', 'BUY', 'A', 'kaufen', 0.70),
      verdict('aggressive', 'BUY', 'A', 'kaufen', 0.80)
    ];
    const r = evaluateTradeTier90(v);
    expect(r.qualified).toBe(true);
    expect(r.pillarsHit).toBe(5);
  });

  it('fails when one firma is not buying', () => {
    const v = [
      verdict('conservative', 'BUY', 'A', 'kaufen', 0.75),
      verdict('balanced', 'WAIT', 'B', 'warten', 0.6),
      verdict('aggressive', 'BUY', 'A', 'kaufen', 0.80)
    ];
    expect(evaluateTradeTier90(v).qualified).toBe(false);
  });

  it('fails when grade is not A', () => {
    const v = [
      verdict('conservative', 'BUY', 'B', 'kaufen', 0.70),
      verdict('balanced', 'BUY', 'A', 'kaufen', 0.70),
      verdict('aggressive', 'BUY', 'A', 'kaufen', 0.80)
    ];
    expect(evaluateTradeTier90(v).qualified).toBe(false);
  });

  it('fails when internal consensus is below 65 %', () => {
    const v = [
      verdict('conservative', 'BUY', 'A', 'kaufen', 0.55),
      verdict('balanced', 'BUY', 'A', 'kaufen', 0.70),
      verdict('aggressive', 'BUY', 'A', 'kaufen', 0.80)
    ];
    expect(evaluateTradeTier90(v).qualified).toBe(false);
  });
});
