import { expect, it } from 'vitest';
import { parseSavedMoneyPlan } from '@/lib/finance/saved-money-plan';
import { evaluateQuickMoneyPlan } from '@/lib/finance/money-plan';
it('restores the same horizon for the form and its allocation', () => {
  const input = { amount: 2500, horizonYears: 5, riskLevel: 'balanced', reserveReady: true, debtFree: true };
  const restored = parseSavedMoneyPlan(JSON.stringify(input));
  expect(restored?.horizonYears).toBe(5);
  expect(evaluateQuickMoneyPlan(restored!).allocations.find(a => a.id === 'diversified')?.percentage).toBe(50);
});
it('rejects incomplete or corrupt saved plans instead of keeping a previous allocation', () => {
  for (const raw of [null,'null','[]','{}','{"amount":2500}','bad']) expect(parseSavedMoneyPlan(raw)).toBeNull();
});
it('never turns a false or string safety answer into confirmation', () => {
  const restored = parseSavedMoneyPlan(JSON.stringify({ amount: 100, horizonYears: 8, riskLevel: 'growth', reserveReady: 'true', debtFree: true }));
  expect(restored?.reserveReady).toBe(false);
  expect(evaluateQuickMoneyPlan(restored!).allocations).toEqual([]);
});
