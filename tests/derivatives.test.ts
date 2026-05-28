import { describe, expect, it } from 'vitest';
import { classifyMoneyness } from '@/lib/derivatives/classify-moneyness';
import { analyzeOptionsschein } from '@/lib/derivatives/optionsschein-risk';
import { ParsedInstrument } from '@/lib/types/ideas';

describe('classifyMoneyness — call', () => {
  it('classifies deep out-of-the-money for far strike', () => {
    const m = classifyMoneyness(75, 100, 'call');
    expect(m.classification).toBe('deep_otm');
    expect(m.distancePct).toBeLessThan(0);
  });
  it('classifies in-the-money when price above strike', () => {
    const m = classifyMoneyness(110, 100, 'call');
    expect(m.classification).toBe('itm');
  });
  it('classifies at-the-money when close', () => {
    const m = classifyMoneyness(100.5, 100, 'call');
    expect(m.classification).toBe('atm');
  });
});

function makeOS(strike: number, expiry: string): ParsedInstrument {
  return {
    broker: 'Trade Republic',
    wkn: 'XX0000',
    instrumentType: 'optionsschein',
    strike,
    expiry,
    direction: 'call',
    userIntent: 'none'
  };
}

describe('analyzeOptionsschein — BMW at 75', () => {
  it('rates a strike-100 OS as very high risk', () => {
    const a = analyzeOptionsschein(makeOS(100, '2027-12'), 75);
    expect(a).not.toBeNull();
    expect(a!.riskClass).toBe('Sehr hohes Risiko');
    expect(a!.preferEquity).toBe(true);
    expect(a!.beginnerSuitable).toBe(false);
  });

  it('computes breakeven above strike for a call', () => {
    const a = analyzeOptionsschein(makeOS(100, '2027-12'), 75);
    expect(a!.approxBreakeven).toBeGreaterThan(100);
  });

  it('estimates leverage as a positive number', () => {
    const a = analyzeOptionsschein(makeOS(84, '2027-12'), 75);
    expect(a!.estimatedLeverage).toBeGreaterThan(1);
  });

  it('flags short expiry with high theta urgency', () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const expiry = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    const a = analyzeOptionsschein(makeOS(80, expiry), 75);
    expect(['critical', 'high']).toContain(a!.thetaUrgency);
  });

  it('returns null for non-derivative', () => {
    const stock: ParsedInstrument = {
      broker: 'Scalable',
      wkn: '519000',
      instrumentType: 'stock',
      userIntent: 'none'
    };
    expect(analyzeOptionsschein(stock, 75)).toBeNull();
  });
});
