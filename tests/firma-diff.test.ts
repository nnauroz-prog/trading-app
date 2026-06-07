import { describe, expect, it } from 'vitest';
import { compareFirmaVerdicts } from '@/lib/agents/firma-diff';
import type { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import type { RankedCandidate } from '@/lib/analysis/master-signal-engine';

function target(symbol: string): RankedCandidate {
  return {
    symbol, coinId: symbol.toLowerCase(),
    passedCount: 8, totalCount: 12,
    confidence: 70,
    entry: 50000, stopLoss: 48000, takeProfit1: 54000, takeProfit2: 60000,
    stopDistancePct: 4, rrTp1: 2,
    tier: 'standard',
    oneLineReason: 'Test',
    brokers: ['Coinbase'],
    quoteVolume: 100_000_000,
    structure: 'uptrend',
    positionInRange: 0.5,
    nearSupport: true,
    confirmed: true,
    relStrengthVsBtc: 1,
    priceChangePct24h: 1
  };
}

function verdict(persona: PersonaId, v: 'BUY' | 'WAIT', sym: string | null): AgentVerdict {
  return {
    persona,
    name: persona,
    motto: '',
    manifest: '',
    verdict: v,
    target: sym ? target(sym) : null,
    safety: null,
    rationale: '',
    team: [],
    voteSummary: {
      total: 0,
      positiveVotes: 0,
      negativeVotes: 0,
      neutralVotes: 0,
      direction: 'mixed',
      confidence: 0,
      skillWeightedConfidence: 0
    },
    ceoFinalWord: ''
  };
}

describe('compareFirmaVerdicts', () => {
  it('leere Liste → kein Konsens', () => {
    const d = compareFirmaVerdicts([]);
    expect(d.unanimous).toBe(false);
    expect(d.majorityVerdict).toBeNull();
    expect(d.observation).toContain('Keine Firmen');
  });

  it('alle BUY auf denselben Coin → unanimous + observation erwähnt Coin', () => {
    const d = compareFirmaVerdicts([
      verdict('conservative', 'BUY', 'BTC'),
      verdict('balanced',     'BUY', 'BTC'),
      verdict('aggressive',   'BUY', 'BTC')
    ]);
    expect(d.unanimous).toBe(true);
    expect(d.majorityVerdict).toBe('BUY');
    expect(d.dissentingFirma).toBeNull();
    expect(d.observation).toContain('BTC');
    expect(d.uniqueTargets).toBe(1);
  });

  it('alle BUY, verschiedene Coins → unanimous + observation erwähnt verschiedene Targets', () => {
    const d = compareFirmaVerdicts([
      verdict('conservative', 'BUY', 'BTC'),
      verdict('balanced',     'BUY', 'ETH'),
      verdict('aggressive',   'BUY', 'SOL')
    ]);
    expect(d.unanimous).toBe(true);
    expect(d.majorityVerdict).toBe('BUY');
    expect(d.uniqueTargets).toBe(3);
    expect(d.observation).toContain('unterschiedliche');
  });

  it('alle WAIT → Cash-Day', () => {
    const d = compareFirmaVerdicts([
      verdict('conservative', 'WAIT', null),
      verdict('balanced',     'WAIT', null),
      verdict('aggressive',   'WAIT', null)
    ]);
    expect(d.unanimous).toBe(true);
    expect(d.majorityVerdict).toBe('WAIT');
    expect(d.observation).toContain('warten');
  });

  it('2:1 BUY → dissentingFirma ist der Abweichler', () => {
    const d = compareFirmaVerdicts([
      verdict('conservative', 'WAIT', null),
      verdict('balanced',     'BUY', 'ETH'),
      verdict('aggressive',   'BUY', 'BTC')
    ]);
    expect(d.unanimous).toBe(false);
    expect(d.majorityVerdict).toBe('BUY');
    expect(d.dissentingFirma).toBe('conservative');
    expect(d.observation).toContain('Konservativ');
  });

  it('1:2 BUY → dissentingFirma ist die einzige Buy-Stimme', () => {
    const d = compareFirmaVerdicts([
      verdict('conservative', 'WAIT', null),
      verdict('balanced',     'WAIT', null),
      verdict('aggressive',   'BUY', 'BTC')
    ]);
    expect(d.unanimous).toBe(false);
    expect(d.majorityVerdict).toBe('WAIT');
    expect(d.dissentingFirma).toBe('aggressive');
  });

  it('targetsByFirma korrekt befüllt', () => {
    const d = compareFirmaVerdicts([
      verdict('conservative', 'BUY', 'BTC'),
      verdict('balanced',     'WAIT', null),
      verdict('aggressive',   'BUY', 'SOL')
    ]);
    expect(d.targetsByFirma.conservative).toBe('BTC');
    expect(d.targetsByFirma.balanced).toBeNull();
    expect(d.targetsByFirma.aggressive).toBe('SOL');
    expect(d.uniqueTargets).toBe(2);
  });
});
