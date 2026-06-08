import { describe, expect, it } from 'vitest';
import { applyLearnedOverridesToVerdicts, countFlips } from '@/lib/agents/learned-verdicts';
import type { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import type { FirmaAccuracy } from '@/lib/firma-accuracy';
import type { RankedCandidate } from '@/lib/analysis/master-signal-engine';

function target(symbol: string): RankedCandidate {
  return {
    symbol, coinId: symbol.toLowerCase(),
    passedCount: 9, totalCount: 12, confidence: 80,
    entry: 100, stopLoss: 95, takeProfit1: 110, takeProfit2: 120,
    stopDistancePct: 5, rrTp1: 2, tier: 'standard',
    oneLineReason: '', brokers: ['Coinbase'],
    quoteVolume: 100_000_000, structure: 'uptrend',
    positionInRange: 0.3, nearSupport: true, confirmed: true,
    relStrengthVsBtc: 0, priceChangePct24h: 1
  };
}

function verdict(persona: PersonaId, v: 'BUY' | 'WAIT', coin: string | null): AgentVerdict {
  return {
    persona,
    name: persona === 'conservative' ? 'Konservativ' : persona === 'balanced' ? 'Balanciert' : 'Aggressiv',
    motto: '', manifest: '',
    verdict: v,
    target: coin ? target(coin) : null,
    safety: null, rationale: '', team: [],
    voteSummary: { total: 0, positiveVotes: 0, negativeVotes: 0, neutralVotes: 0, direction: 'mixed', confidence: 0, skillWeightedConfidence: 0 },
    ceoFinalWord: ''
  };
}

function acc(firma: PersonaId, hitRatePct: number, recent: (boolean | null)[]): FirmaAccuracy {
  return {
    firma,
    firmaName: firma,
    evaluated: 10,
    rightCalls: Math.round((hitRatePct / 100) * 10),
    hitRatePct,
    avgGapDays: 1,
    skillWeight: 1,
    recent: recent.map((right, i) => ({
      date: `2026-05-${String(20 - i).padStart(2, '0')}`,
      verdict: 'BUY' as const,
      coin: 'BTC',
      right
    }))
  };
}

describe('applyLearnedOverridesToVerdicts', () => {
  it('leere Map → keine Aenderungen, nur Annotation', () => {
    const verdicts = [
      verdict('conservative', 'BUY', 'BTC'),
      verdict('balanced', 'WAIT', null),
      verdict('aggressive', 'BUY', 'ETH')
    ];
    const learned = applyLearnedOverridesToVerdicts(verdicts, new Map());
    expect(learned).toHaveLength(3);
    for (const v of learned) {
      expect(v.verdict).toBe(v.rawVerdict);
      expect(v.override.kind).toBe('none');
    }
  });

  it('schwache Firma mit BUY + Verlust-Streak → downgrade auf WAIT + target null', () => {
    const accuracyMap = new Map<PersonaId, FirmaAccuracy>([
      ['aggressive', acc('aggressive', 30, [false, false, false, false])]
    ]);
    const verdicts = [
      verdict('conservative', 'BUY', 'BTC'),
      verdict('balanced', 'WAIT', null),
      verdict('aggressive', 'BUY', 'DOGE')
    ];
    const learned = applyLearnedOverridesToVerdicts(verdicts, accuracyMap);
    const agg = learned.find((v) => v.persona === 'aggressive')!;
    expect(agg.verdict).toBe('WAIT');
    expect(agg.target).toBeNull();
    expect(agg.rawVerdict).toBe('BUY');
    expect(agg.override.kind).toBe('downgrade-buy');
    // Konservativ unangetastet (keine Accuracy-Daten)
    const cons = learned.find((v) => v.persona === 'conservative')!;
    expect(cons.target).not.toBeNull();
    expect(cons.verdict).toBe('BUY');
  });

  it('starke Firma mit BUY + Gewinn-Streak → reinforce-buy, kein Flip', () => {
    const accuracyMap = new Map<PersonaId, FirmaAccuracy>([
      ['conservative', acc('conservative', 72, [true, true, true, true])]
    ]);
    const verdicts = [verdict('conservative', 'BUY', 'BTC')];
    const learned = applyLearnedOverridesToVerdicts(verdicts, accuracyMap);
    expect(learned[0].verdict).toBe('BUY');
    expect(learned[0].target).not.toBeNull();
    expect(learned[0].override.kind).toBe('reinforce-buy');
  });

  it('countFlips zaehlt nur tatsaechliche Verdict-Aenderungen', () => {
    const accuracyMap = new Map<PersonaId, FirmaAccuracy>([
      ['aggressive', acc('aggressive', 30, [false, false, false])],
      ['balanced', acc('balanced', 30, [false, false, false])]
    ]);
    const verdicts = [
      verdict('conservative', 'BUY', 'BTC'),
      verdict('balanced', 'BUY', 'BTC'),
      verdict('aggressive', 'BUY', 'DOGE')
    ];
    const learned = applyLearnedOverridesToVerdicts(verdicts, accuracyMap);
    // Balanced + Aggressive werden geflipt, Konservativ nicht.
    expect(countFlips(learned)).toBe(2);
  });

  it('countFlips 0 wenn keine Override aktiv', () => {
    const verdicts = [verdict('conservative', 'BUY', 'BTC')];
    expect(countFlips(applyLearnedOverridesToVerdicts(verdicts, new Map()))).toBe(0);
  });

  it('Reinforce-Override flipt nicht das verdict, zaehlt also nicht in countFlips', () => {
    const accuracyMap = new Map<PersonaId, FirmaAccuracy>([
      ['conservative', acc('conservative', 75, [true, true, true, true])]
    ]);
    const verdicts = [verdict('conservative', 'BUY', 'BTC')];
    const learned = applyLearnedOverridesToVerdicts(verdicts, accuracyMap);
    expect(learned[0].override.kind).toBe('reinforce-buy');
    expect(countFlips(learned)).toBe(0);
  });
});
