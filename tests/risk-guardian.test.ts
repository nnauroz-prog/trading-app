import { describe, expect, it } from 'vitest';
import { runRiskGuardian, MarketContext } from '@/lib/risk/risk-guardian';
import { Position } from '@/lib/types/positions';

const config = { accountSize: 10000, maxRiskPct: 1, currency: 'EUR' as const };
const neutralMarket: MarketContext = { marketMood: 'neutral', marketRegime: 'sideways', todaysVerdict: 'trade' };

function basePosition(overrides: Partial<Position>): Position {
  return {
    id: 'p1',
    underlying: 'BTC',
    ticker: 'BTC',
    instrumentType: 'crypto',
    broker: 'Coinbase',
    entryPrice: 100,
    entryDate: Date.now(),
    positionSize: 1,
    investmentQuote: 100,
    currency: 'EUR',
    stopLossPlanned: 95,
    takeProfitPlanned: 115,
    thesis: '',
    status: 'open',
    notes: '',
    ...overrides
  };
}

describe('runRiskGuardian', () => {
  it('flags a position with no stop-loss', () => {
    const positions = [basePosition({ stopLossPlanned: null })];
    const report = runRiskGuardian(positions, { btc: 100 }, config, 'intermediate', neutralMarket);
    expect(report.alerts.some((a) => a.id.includes('no-stop'))).toBe(true);
  });

  it('flags stop-hit when price below stop', () => {
    const positions = [basePosition({ stopLossPlanned: 95 })];
    const report = runRiskGuardian(positions, { btc: 94 }, config, 'intermediate', neutralMarket);
    const stopHit = report.alerts.find((a) => a.id.includes('stop-hit'));
    expect(stopHit).toBeDefined();
    expect(stopHit!.severity).toBe('critical');
  });

  it('flags oversized position', () => {
    const positions = [basePosition({ investmentQuote: 6000, positionSize: 60 })];
    const report = runRiskGuardian(positions, { btc: 100 }, config, 'intermediate', neutralMarket);
    expect(report.alerts.some((a) => a.id.includes('exposure'))).toBe(true);
  });

  it('warns about leveraged products with total-loss risk', () => {
    const positions = [basePosition({ instrumentType: 'knockout', underlying: 'BMW', ticker: undefined, wkn: 'AB1234' })];
    const report = runRiskGuardian(positions, {}, config, 'intermediate', neutralMarket);
    expect(report.alerts.some((a) => a.category === 'product')).toBe(true);
  });

  it('emits no-trade market alert in risk-off mode', () => {
    const riskOff: MarketContext = { marketMood: 'risk-off', marketRegime: 'bear', todaysVerdict: 'no_trade' };
    const report = runRiskGuardian([], {}, config, 'intermediate', riskOff);
    expect(report.alerts.some((a) => a.category === 'market')).toBe(true);
  });

  it('stays quiet for a clean single position', () => {
    const positions = [basePosition({ investmentQuote: 500, positionSize: 5 })];
    const report = runRiskGuardian(positions, { btc: 105 }, config, 'intermediate', neutralMarket);
    expect(report.criticalCount).toBe(0);
    expect(report.dangerCount).toBe(0);
  });
});
