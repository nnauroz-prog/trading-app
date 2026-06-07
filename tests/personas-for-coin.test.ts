import { describe, expect, it } from 'vitest';
import { evaluatePersonas, evaluatePersonasForCoin } from '@/lib/agents/personas';
import type { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';
import type { BacktestSummary } from '@/lib/analysis/backtest-summary';

function candidate(over: Partial<RankedCandidate>): RankedCandidate {
  return {
    symbol: 'BTC',
    coinId: 'btc',
    passedCount: 10,
    totalCount: 12,
    confidence: 80,
    entry: 60000,
    stopLoss: 57600,
    takeProfit1: 64800,
    takeProfit2: 72000,
    stopDistancePct: 4,
    rrTp1: 2,
    tier: 'strong',
    oneLineReason: 'Trend + Momentum',
    brokers: ['Coinbase', 'Bybit Spot'],
    quoteVolume: 800_000_000,
    structure: 'uptrend',
    positionInRange: 0.2,
    nearSupport: true,
    confirmed: true,
    relStrengthVsBtc: 0,
    priceChangePct24h: 2,
    ...over
  };
}

function report(candidates: RankedCandidate[]): MasterSignalReport {
  return {
    kind: 'no_trade',
    bestCandidate: null,
    marketRegime: 'bull',
    btcRegime: 'bull',
    marketStructure: 'uptrend',
    crowd: { state: 'neutral', cautious: false, detail: 'neutral' },
    marketMood: 'risk-on',
    reasons: [],
    mode: 'swing',
    candidates,
    generatedAt: new Date().toISOString()
  };
}

const EMPTY_BACKTEST: BacktestSummary = {
  available: false,
  trades: 0,
  winRatePct: null,
  netReturnPct: 0,
  periodDays: 0,
  perAssetEdge: {},
  safeTier: null,
  btcHodlReturnPct: null,
  safeTrades: []
};

describe('evaluatePersonasForCoin', () => {
  it('liefert immer 3 Personas — auch wenn der Coin nicht in der Kandidatenliste ist', () => {
    const r = report([candidate({ symbol: 'BTC', coinId: 'btc' })]);
    const verdicts = evaluatePersonasForCoin('eth', r, EMPTY_BACKTEST);
    expect(verdicts).toHaveLength(3);
    expect(verdicts.map((v) => v.persona)).toEqual(['conservative', 'balanced', 'aggressive']);
    // Coin nicht in Kandidatenliste → target ist null, alle warten
    for (const v of verdicts) {
      expect(v.target).toBeNull();
      expect(v.verdict).toBe('WAIT');
    }
  });

  it('zwingt alle Personas auf denselben Coin — nicht ihr persönlicher Pick', () => {
    const strong = candidate({ symbol: 'BTC', coinId: 'btc', passedCount: 11, stopDistancePct: 3 });
    const weak = candidate({ symbol: 'DOGE', coinId: 'doge', passedCount: 5, stopDistancePct: 4, quoteVolume: 60_000_000 });
    const r = report([strong, weak]);
    const forced = evaluatePersonasForCoin('doge', r, EMPTY_BACKTEST);
    for (const v of forced) {
      expect(v.target?.coinId).toBe('doge');
    }
    // Im Gegensatz dazu wählen die Personas in evaluatePersonas BTC.
    const natural = evaluatePersonas(r, EMPTY_BACKTEST);
    expect(natural.find((p) => p.persona === 'conservative')?.target?.coinId).toBe('btc');
  });

  it('schwacher Coin (5/12, Konfluenz unter 7) → niemand kauft', () => {
    const weak = candidate({ symbol: 'DOGE', coinId: 'doge', passedCount: 5 });
    const r = report([weak]);
    const verdicts = evaluatePersonasForCoin('doge', r, EMPTY_BACKTEST);
    for (const v of verdicts) {
      expect(v.verdict).toBe('WAIT');
    }
  });

  it('sehr starker Coin → mindestens aggressiv kauft', () => {
    const strong = candidate({
      symbol: 'BTC', coinId: 'btc',
      passedCount: 11, structure: 'uptrend', nearSupport: true,
      stopDistancePct: 3, quoteVolume: 1_000_000_000, brokers: ['Coinbase', 'Scalable Capital']
    });
    const r = report([strong]);
    const verdicts = evaluatePersonasForCoin('btc', r, EMPTY_BACKTEST);
    const aggressive = verdicts.find((v) => v.persona === 'aggressive');
    expect(aggressive?.verdict).toBe('BUY');
  });

  it('jede Persona behält ihr Manifest + Motto auch bei erzwungenem Target', () => {
    const r = report([candidate({})]);
    const verdicts = evaluatePersonasForCoin('btc', r, EMPTY_BACKTEST);
    const conservative = verdicts.find((v) => v.persona === 'conservative')!;
    expect(conservative.name).toBe('Konservativ');
    expect(conservative.motto).toContain('Lieber gar nichts kaufen');
    expect(conservative.manifest).toContain('Erhalt des Kapitals');
  });

  it('Team aller 7 Sub-Agenten ist vorhanden — auch für nicht-empfohlene Coins', () => {
    const r = report([candidate({})]);
    const verdicts = evaluatePersonasForCoin('btc', r, EMPTY_BACKTEST);
    for (const v of verdicts) {
      expect(v.team).toHaveLength(7);
      expect(v.team.map((t) => t.role)).toEqual(['analyst', 'scout', 'risk', 'news', 'position', 'liquidity', 'backtest']);
    }
  });
});

describe('evaluatePersonas (Regression nach Refactor)', () => {
  it('liefert weiter 3 Personas mit jeweils eigenem Target', () => {
    const r = report([
      candidate({ symbol: 'BTC', coinId: 'btc', passedCount: 11 }),
      candidate({ symbol: 'ETH', coinId: 'eth', passedCount: 8 })
    ]);
    const verdicts = evaluatePersonas(r, EMPTY_BACKTEST);
    expect(verdicts).toHaveLength(3);
    expect(verdicts.every((v) => v.target !== null)).toBe(true);
    // Konservativ soll BTC bevorzugen (höhere safety score), aggressiv ebenso.
    expect(verdicts.find((v) => v.persona === 'aggressive')?.target?.coinId).toBe('btc');
  });
});
