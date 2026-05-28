export type DcaFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface DcaExecution {
  id: string;
  date: number;
  amountInvested: number;
  price: number;
  coinsBought: number;
}

export interface DcaPlan {
  id: string;
  assetId: string;
  symbol: string;
  amountPerBuy: number;
  frequency: DcaFrequency;
  currency: 'EUR' | 'USD';
  startedAt: number;
  executions: DcaExecution[];
}

const STORAGE_KEY = 'trading-app.dca-plans';
export const DCA_CHANGED_EVENT = 'trading-app:dca-changed';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadDcaPlans(): DcaPlan[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p): p is DcaPlan => typeof p === 'object' && p !== null && typeof p.id === 'string');
  } catch {
    return [];
  }
}

export function saveDcaPlans(plans: DcaPlan[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  window.dispatchEvent(new CustomEvent(DCA_CHANGED_EVENT));
}

export function addDcaPlan(input: Omit<DcaPlan, 'id' | 'startedAt' | 'executions'>): DcaPlan {
  const plan: DcaPlan = { id: generateId(), startedAt: Date.now(), executions: [], ...input };
  saveDcaPlans([...loadDcaPlans(), plan]);
  return plan;
}

export function deleteDcaPlan(id: string): void {
  saveDcaPlans(loadDcaPlans().filter((p) => p.id !== id));
}

export function recordDcaExecution(planId: string, price: number): DcaPlan | null {
  const plans = loadDcaPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) return null;
  const plan = plans[idx];
  if (price <= 0) return plan;
  const coinsBought = plan.amountPerBuy / price;
  const execution: DcaExecution = {
    id: generateId(),
    date: Date.now(),
    amountInvested: plan.amountPerBuy,
    price,
    coinsBought
  };
  plans[idx] = { ...plan, executions: [...plan.executions, execution] };
  saveDcaPlans(plans);
  return plans[idx];
}

export function deleteDcaExecution(planId: string, executionId: string): void {
  const plans = loadDcaPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) return;
  plans[idx] = { ...plans[idx], executions: plans[idx].executions.filter((e) => e.id !== executionId) };
  saveDcaPlans(plans);
}

export interface DcaStats {
  totalInvested: number;
  totalCoins: number;
  avgCostBasis: number | null;
  currentValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  executionCount: number;
  vsLumpSum: number | null;
}

const FREQUENCY_DAYS: Record<DcaFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30
};

export function computeDcaStats(plan: DcaPlan, currentPrice: number | null): DcaStats {
  const totalInvested = plan.executions.reduce((s, e) => s + e.amountInvested, 0);
  const totalCoins = plan.executions.reduce((s, e) => s + e.coinsBought, 0);
  const avgCostBasis = totalCoins > 0 ? totalInvested / totalCoins : null;
  const currentValue = currentPrice !== null && totalCoins > 0 ? totalCoins * currentPrice : null;
  const unrealizedPnl = currentValue !== null ? currentValue - totalInvested : null;
  const unrealizedPnlPct = unrealizedPnl !== null && totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : null;

  // Lump-sum comparison: if all money had been invested at the first execution's price
  let vsLumpSum: number | null = null;
  if (plan.executions.length > 0 && currentPrice !== null) {
    const firstPrice = plan.executions[0].price;
    const lumpSumCoins = totalInvested / firstPrice;
    const lumpSumValue = lumpSumCoins * currentPrice;
    if (currentValue !== null) vsLumpSum = currentValue - lumpSumValue;
  }

  return {
    totalInvested,
    totalCoins,
    avgCostBasis,
    currentValue,
    unrealizedPnl,
    unrealizedPnlPct,
    executionCount: plan.executions.length,
    vsLumpSum
  };
}

export function nextDcaDate(plan: DcaPlan): number {
  const last = plan.executions.length > 0 ? plan.executions[plan.executions.length - 1].date : plan.startedAt;
  return last + FREQUENCY_DAYS[plan.frequency] * 24 * 60 * 60 * 1000;
}

export function isDcaDue(plan: DcaPlan): boolean {
  return Date.now() >= nextDcaDate(plan);
}
