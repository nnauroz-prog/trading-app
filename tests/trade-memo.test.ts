import { describe, expect, it } from 'vitest';
import { generateTradeMemo } from '@/lib/agents/trade-memo';
import { AgentVerdict } from '@/lib/agents/personas';
import { RankedCandidate } from '@/lib/analysis/master-signal-engine';

function target(): RankedCandidate {
  return {
    symbol: 'ETH', coinId: 'eth',
    passedCount: 10, totalCount: 12, confidence: 0.85,
    entry: 3000, stopLoss: 2900, takeProfit1: 3200, takeProfit2: 3400,
    stopDistancePct: 3.33, rrTp1: 2,
    tier: 'strong', oneLineReason: '',
    brokers: ['Coinbase'], quoteVolume: 5e8,
    structure: 'uptrend', positionInRange: 0.3, nearSupport: true,
    confirmed: true, relStrengthVsBtc: 1, priceChangePct24h: 2
  };
}

function verdict(persona: 'conservative' | 'balanced' | 'aggressive', kind: 'BUY' | 'WAIT'): AgentVerdict {
  return {
    persona,
    name: persona === 'conservative' ? 'Konservativ' : persona === 'balanced' ? 'Balanciert' : 'Aggressiv',
    motto: '', manifest: '',
    verdict: kind,
    target: kind === 'BUY' ? target() : null,
    safety: null,
    rationale: '',
    team: [{
      role: 'position',
      title: 'Position-Manager',
      vote: 'NORMAL',
      voteTone: 'good',
      suggestedAccountRiskPct: persona === 'conservative' ? 1 : persona === 'balanced' ? 2 : 3,
      reason: ''
    }],
    voteSummary: { total: 1, positiveVotes: 0, negativeVotes: 0, neutralVotes: 1, direction: 'mixed', confidence: 0, skillWeightedConfidence: 0 },
    ceoFinalWord: ''
  };
}

describe('generateTradeMemo', () => {
  it('returns null when verdict is WAIT', () => {
    expect(generateTradeMemo(verdict('conservative', 'WAIT'))).toBeNull();
  });

  it('contains all key levels for a BUY verdict', () => {
    const m = generateTradeMemo(verdict('balanced', 'BUY'))!;
    expect(m).not.toBeNull();
    expect(m.entry).toBe(3000);
    expect(m.stop).toBe(2900);
    expect(m.target1).toBe(3200);
    expect(m.target2).toBe(3400);
    expect(m.steps.length).toBeGreaterThanOrEqual(5);
  });

  it('konservativ recommends 50% partial + stop nachziehen', () => {
    const m = generateTradeMemo(verdict('conservative', 'BUY'))!;
    expect(m.steps.some((s) => s.includes('50%'))).toBe(true);
    expect(m.steps.some((s) => s.toLowerCase().includes('einstand'))).toBe(true);
  });

  it('aggressiv goes full position to target 1 only', () => {
    const m = generateTradeMemo(verdict('aggressive', 'BUY'))!;
    expect(m.steps.some((s) => s.toLowerCase().includes('volle position'))).toBe(true);
  });

  it('position sizing reflects firma risk preference', () => {
    const cons = generateTradeMemo(verdict('conservative', 'BUY'))!;
    const agg = generateTradeMemo(verdict('aggressive', 'BUY'))!;
    // Aggressiv 3% risk → larger position than conservative 1%
    expect(cons.positionSizeAt10k).toContain('1.0% Risk');
    expect(agg.positionSizeAt10k).toContain('3.0% Risk');
  });

  it('whatKillsIt always lists stop, BTC crash, macro event', () => {
    const m = generateTradeMemo(verdict('balanced', 'BUY'))!;
    expect(m.whatKillsIt.some((w) => w.toLowerCase().includes('schließt unter'))).toBe(true);
    expect(m.whatKillsIt.some((w) => w.toLowerCase().includes('btc'))).toBe(true);
    expect(m.whatKillsIt.some((w) => w.toLowerCase().includes('fomc'))).toBe(true);
  });
});
