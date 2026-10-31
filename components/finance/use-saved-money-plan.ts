'use client';
import { useEffect, useState } from 'react';
import { evaluateQuickMoneyPlan, MONEY_PLAN_CHANGED_EVENT, MONEY_PLAN_STORAGE_KEY, type MoneyPlan, type QuickMoneyPlanInput } from '@/lib/finance/money-plan';
import { parseSavedMoneyPlan } from '@/lib/finance/saved-money-plan';

export function useSavedMoneyPlan() {
  const [saved, setSaved] = useState<{ input: QuickMoneyPlanInput | null; plan: MoneyPlan | null; loaded: boolean }>({ input: null, plan: null, loaded: false });
  useEffect(() => {
    const read = () => {
      let input: QuickMoneyPlanInput | null = null;
      try { input = parseSavedMoneyPlan(window.localStorage.getItem(MONEY_PLAN_STORAGE_KEY)); } catch { /* The form also works when storage is unavailable. */ }
      setSaved({ input, plan: input ? evaluateQuickMoneyPlan(input) : null, loaded: true });
    };
    const fromOtherTab = (event: StorageEvent) => { if (event.key === MONEY_PLAN_STORAGE_KEY || event.key === null) read(); };
    read();
    window.addEventListener(MONEY_PLAN_CHANGED_EVENT, read);
    window.addEventListener('storage', fromOtherTab);
    return () => { window.removeEventListener(MONEY_PLAN_CHANGED_EVENT, read); window.removeEventListener('storage', fromOtherTab); };
  }, []);
  return saved;
}
export function saveMoneyPlan(input: QuickMoneyPlanInput): boolean {
  try { window.localStorage.setItem(MONEY_PLAN_STORAGE_KEY, JSON.stringify(input)); window.dispatchEvent(new CustomEvent(MONEY_PLAN_CHANGED_EVENT)); return true; } catch { return false; }
}
export function clearMoneyPlan(): void {
  try { window.localStorage.removeItem(MONEY_PLAN_STORAGE_KEY); window.dispatchEvent(new CustomEvent(MONEY_PLAN_CHANGED_EVENT)); } catch { /* Clearing the visible form remains possible. */ }
}
