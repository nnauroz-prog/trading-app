import { describe, expect, it } from 'vitest';
import { detectChaseSignals, detectOpportunitySignals, PriceContext } from '@/lib/analysis/chase-detector';
import { CoinSentiment } from '@/lib/akademie/spaeher';

function sentiment(over: Partial<CoinSentiment>): CoinSentiment {
  return {
    coin: 'BTC',
    bullishCount: 0,
    bearishCount: 0,
    neutralCount: 0,
    netScore: 0,
    tilt: 'neutral',
    topItem: null,
    ...over
  };
}

function px(symbol: string, change: number): PriceContext {
  return { symbol, priceChangePct24h: change };
}

describe('detectChaseSignals (Schon gelaufen)', () => {
  it('flags coins with bullish news already up > 5%', () => {
    const out = detectChaseSignals(
      [sentiment({ coin: 'BNB', tilt: 'bullisch', bullishCount: 3 })],
      [px('BNB', 11)]
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('hot_news_already_run');
    expect(out[0].reason.toLowerCase()).toContain('eingepreist');
  });

  it('ignores bullish news when price did not move', () => {
    const out = detectChaseSignals(
      [sentiment({ coin: 'ETH', tilt: 'bullisch', bullishCount: 3 })],
      [px('ETH', 1.5)]
    );
    expect(out).toHaveLength(0);
  });

  it('flags bearish news already down > 5%', () => {
    const out = detectChaseSignals(
      [sentiment({ coin: 'XRP', tilt: 'bärisch', bearishCount: 3 })],
      [px('XRP', -8)]
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('cold_news_already_down');
  });

  it('sorts strongest moves first', () => {
    const out = detectChaseSignals(
      [
        sentiment({ coin: 'BNB', tilt: 'bullisch', bullishCount: 1 }),
        sentiment({ coin: 'SOL', tilt: 'bullisch', bullishCount: 1 })
      ],
      [px('BNB', 8), px('SOL', 15)]
    );
    expect(out[0].coin).toBe('SOL');
    expect(out[1].coin).toBe('BNB');
  });
});

describe('detectOpportunitySignals (Angst war übertrieben)', () => {
  it('flags coins down ≥5% whose news is not eindeutig bärisch', () => {
    const out = detectOpportunitySignals(
      [sentiment({ coin: 'ETH', tilt: 'neutral', bullishCount: 1, bearishCount: 1 })],
      [px('ETH', -6)]
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('fear_overdone');
  });

  it('ignores coins down but news is purely bearish (falling knife)', () => {
    const out = detectOpportunitySignals(
      [sentiment({ coin: 'XRP', tilt: 'bärisch', bullishCount: 0, bearishCount: 3 })],
      [px('XRP', -7)]
    );
    expect(out).toHaveLength(0);
  });

  it('flags bärisch tilt if at least one bullish headline emerged', () => {
    const out = detectOpportunitySignals(
      [sentiment({ coin: 'BTC', tilt: 'bärisch', bullishCount: 1, bearishCount: 2 })],
      [px('BTC', -6)]
    );
    expect(out).toHaveLength(1);
  });

  it('ignores coins that have not dropped enough', () => {
    const out = detectOpportunitySignals(
      [sentiment({ coin: 'SOL', tilt: 'neutral', bullishCount: 1 })],
      [px('SOL', -2)]
    );
    expect(out).toHaveLength(0);
  });
});
