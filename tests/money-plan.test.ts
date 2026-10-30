import { describe, expect, it } from 'vitest';
import { evaluateQuickMoneyPlan } from '@/lib/finance/money-plan';
const base = { amount: 2500, horizonYears: 8, riskLevel: 'balanced' as const, reserveReady: true, debtFree: true };
describe('working money-plan agents', () => {
  it('never invents an allocation from missing or invalid input', () => {
    for (const amount of [undefined, null, NaN, Infinity, -1, 0, 1.005]) {
      const plan = evaluateQuickMoneyPlan({ ...base, amount });
      expect(plan.status).toBe('missing'); expect(plan.allocations).toEqual([]);
    }
    expect(evaluateQuickMoneyPlan({ ...base, horizonYears: NaN }).status).toBe('missing');
  });
  it('requires explicit reserve and debt checks before investing', () => {
    for (const check of [{ reserveReady: false }, { debtFree: false }, { reserveReady: undefined }]) {
      const plan = evaluateQuickMoneyPlan({ ...base, ...check });
      expect(plan.status).toBe('attention'); expect(plan.allocations).toEqual([]);
      expect(plan.agents.some(a => a.status === 'attention')).toBe(true);
    }
  });
  it('keeps short-term money liquid even for the growth profile', () => {
    const plan = evaluateQuickMoneyPlan({ ...base, horizonYears: 3, riskLevel: 'growth' });
    expect(plan.allocations).toMatchObject([{ id: 'cash', amount: 2500, percentage: 100 }]);
  });
  it('accounts for every cent without allocating more than the user supplied', () => {
    for (const amount of [1, 12.37, 2500.01, 999999.99]) for (const riskLevel of ['conservative','balanced','growth'] as const) {
      const plan = evaluateQuickMoneyPlan({ ...base, amount, riskLevel });
      expect(plan.status).toBe('ready');
      expect(Math.round(plan.allocations.reduce((s,a) => s+a.amount,0)*100)).toBe(Math.round(amount*100));
      expect(plan.allocations.reduce((s,a)=>s+a.percentage,0)).toBe(100);
    }
  });
  it('gives every role an explained result and caps optional speculation', () => {
    const plan = evaluateQuickMoneyPlan({ ...base, riskLevel: 'growth' });
    expect(new Set(plan.agents.map(a=>a.id)).size).toBe(5);
    expect(plan.agents.every(a=>a.finding.length>15)).toBe(true);
    expect(plan.allocations.find(a=>a.id==='learning')?.percentage).toBe(5);
    expect(evaluateQuickMoneyPlan(base).allocations.some(a=>a.id==='learning')).toBe(false);
  });
});
