import { describe, expect, it } from 'vitest';
import { vorstandMediation } from '@/lib/agents/vorstand';
import { AgentVerdict } from '@/lib/agents/personas';
import { RankedCandidate } from '@/lib/analysis/master-signal-engine';

function target(symbol: string): RankedCandidate {
  return {
    symbol,
    coinId: symbol.toLowerCase(),
    passedCount: 9,
    totalCount: 12,
    confidence: 0.8,
    entry: 100,
    stopLoss: 95,
    takeProfit1: 110,
    takeProfit2: 120,
    stopDistancePct: 5,
    rrTp1: 2,
    tier: 'strong',
    oneLineReason: '',
    brokers: ['Coinbase'],
    quoteVolume: 500_000_000,
    structure: 'uptrend',
    positionInRange: 0.3,
    nearSupport: true,
    confirmed: true,
    relStrengthVsBtc: 1,
    priceChangePct24h: 3
  };
}

function verdict(persona: 'conservative' | 'balanced' | 'aggressive', kind: 'BUY' | 'WAIT', coinSymbol: string | null): AgentVerdict {
  return {
    persona,
    name: persona === 'conservative' ? 'Konservativ' : persona === 'balanced' ? 'Balanciert' : 'Aggressiv',
    motto: '', manifest: '',
    verdict: kind,
    target: coinSymbol ? target(coinSymbol) : null,
    safety: null,
    rationale: kind === 'WAIT' ? 'Ich warte: schwaches Setup.' : 'Klar grün.',
    team: [],
    voteSummary: { total: 0, positiveVotes: 0, negativeVotes: 0, neutralVotes: 0, direction: 'mixed', confidence: 0, skillWeightedConfidence: 0 },
    ceoFinalWord: ''
  };
}

describe('vorstandMediation', () => {
  it('CASH_HALTEN when nobody wants to buy', () => {
    const r = vorstandMediation([
      verdict('conservative', 'WAIT', null),
      verdict('balanced', 'WAIT', null),
      verdict('aggressive', 'WAIT', null)
    ]);
    expect(r.verdict).toBe('CASH_HALTEN');
    expect(r.consensusCoin).toBeNull();
  });

  it('KLARER_KAUF when all three agree on the same coin', () => {
    const r = vorstandMediation([
      verdict('conservative', 'BUY', 'ETH'),
      verdict('balanced', 'BUY', 'ETH'),
      verdict('aggressive', 'BUY', 'ETH')
    ]);
    expect(r.verdict).toBe('KLARER_KAUF');
    expect(r.consensusCoin).toBe('ETH');
  });

  it('KAUFEN_VORSICHTIG when 2 of 3 agree on a coin', () => {
    const r = vorstandMediation([
      verdict('conservative', 'BUY', 'ETH'),
      verdict('balanced', 'BUY', 'ETH'),
      verdict('aggressive', 'WAIT', null)
    ]);
    expect(r.verdict).toBe('KAUFEN_VORSICHTIG');
    expect(r.consensusCoin).toBe('ETH');
  });

  it('WATCHLIST when buyers disagree on coins', () => {
    const r = vorstandMediation([
      verdict('conservative', 'WAIT', null),
      verdict('balanced', 'BUY', 'ETH'),
      verdict('aggressive', 'BUY', 'SOL')
    ]);
    expect(r.verdict).toBe('WATCHLIST');
    expect(r.consensusCoin).toBeNull();
  });

  it('flags konservativ-in supporters for warmer KAUFEN_VORSICHTIG copy', () => {
    const withCons = vorstandMediation([
      verdict('conservative', 'BUY', 'ETH'),
      verdict('balanced', 'BUY', 'ETH'),
      verdict('aggressive', 'WAIT', null)
    ]);
    expect(withCons.body.toLowerCase()).toContain('solide');
  });

  it('captures coin-conflict notes when supporters split', () => {
    const r = vorstandMediation([
      verdict('conservative', 'BUY', 'ETH'),
      verdict('balanced', 'BUY', 'ETH'),
      verdict('aggressive', 'BUY', 'SOL')
    ]);
    expect(r.conflictNotes.some((n) => n.includes('SOL'))).toBe(true);
  });

  it('ohne Skill-Map: skillWeightedConfidence ist null (kein Lern-Effekt vorgetäuscht)', () => {
    const r = vorstandMediation([
      verdict('conservative', 'BUY', 'ETH'),
      verdict('balanced', 'WAIT', null),
      verdict('aggressive', 'WAIT', null)
    ]);
    expect(r.skillWeightedConfidence).toBeNull();
    expect(r.skillNote).toBeNull();
  });

  it('Skill-Map hebt vertrauenswürdige BUY-Stimme hervor', () => {
    // Konservativ historisch 70 % (Gewicht 1.8), Balanciert 50 % (1.0), Aggressiv 30 % (0.2).
    const skill = new Map<'conservative' | 'balanced' | 'aggressive', number>([
      ['conservative', 1.8],
      ['balanced', 1.0],
      ['aggressive', 0.2]
    ]);
    const r = vorstandMediation([
      verdict('conservative', 'BUY', 'ETH'),
      verdict('balanced', 'BUY', 'ETH'),
      verdict('aggressive', 'WAIT', null)
    ], skill);
    expect(r.verdict).toBe('KAUFEN_VORSICHTIG');
    expect(r.skillWeightedConfidence).not.toBeNull();
    // (1.8 + 1.0) / (1.8 + 1.0 + 0.2) = 2.8/3.0 ≈ 0.933
    expect(r.skillWeightedConfidence!).toBeGreaterThan(0.85);
    expect(r.skillNote).toContain('Track-Record');
  });

  it('Skill-Map warnt, wenn nur Aggressiv kauft und historisch schwach ist', () => {
    const skill = new Map<'conservative' | 'balanced' | 'aggressive', number>([
      ['conservative', 1.8],
      ['balanced', 1.6],
      ['aggressive', 0.3]
    ]);
    const r = vorstandMediation([
      verdict('conservative', 'WAIT', null),
      verdict('balanced', 'WAIT', null),
      verdict('aggressive', 'BUY', 'DOGE')
    ], skill);
    expect(r.verdict).toBe('WATCHLIST');
    expect(r.skillWeightedConfidence).not.toBeNull();
    // Aggressiv-only BUY mit Gewicht 0.3 vs Gesamt 3.7 ≈ 0.08
    expect(r.skillWeightedConfidence!).toBeLessThan(0.15);
  });

  it('Skill-Map: Cash-Halten mit allen historisch starken Firmen → note bestätigt', () => {
    const skill = new Map<'conservative' | 'balanced' | 'aggressive', number>([
      ['conservative', 1.6],
      ['balanced', 1.4],
      ['aggressive', 1.5]
    ]);
    const r = vorstandMediation([
      verdict('conservative', 'WAIT', null),
      verdict('balanced', 'WAIT', null),
      verdict('aggressive', 'WAIT', null)
    ], skill);
    expect(r.verdict).toBe('CASH_HALTEN');
    expect(r.skillNote).toContain('Cash-Halten');
  });
});
