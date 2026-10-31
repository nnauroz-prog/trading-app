import { evaluateQuickMoneyPlan, type QuickMoneyPlanInput } from '@/lib/finance/money-plan';

/** One parser for the form and its result, including restored custom horizons. */
export function parseSavedMoneyPlan(raw: string | null): QuickMoneyPlanInput | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const stored = value as QuickMoneyPlanInput;
    const input: QuickMoneyPlanInput = {
      amount: stored.amount, horizonYears: stored.horizonYears, riskLevel: stored.riskLevel,
      reserveReady: stored.reserveReady === true, debtFree: stored.debtFree === true
    };
    return evaluateQuickMoneyPlan(input).status === 'missing' ? null : input;
  } catch { return null; }
}
