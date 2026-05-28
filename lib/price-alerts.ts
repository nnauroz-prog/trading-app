export type AlertDirection = 'above' | 'below';

export interface PriceAlert {
  id: string;
  coinId: string;
  symbol: string;
  direction: AlertDirection;
  targetPrice: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  note?: string;
}

const STORAGE_KEY = 'trading-app.price-alerts';
export const ALERTS_CHANGED_EVENT = 'trading-app:price-alerts-changed';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadAlerts(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((a): a is PriceAlert => typeof a === 'object' && a !== null && typeof a.id === 'string');
  } catch {
    return [];
  }
}

function save(alerts: PriceAlert[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent(ALERTS_CHANGED_EVENT));
}

export function addAlert(coinId: string, symbol: string, direction: AlertDirection, targetPrice: number, note?: string): PriceAlert {
  const alert: PriceAlert = { id: generateId(), coinId, symbol, direction, targetPrice, createdAt: Date.now(), triggered: false, note };
  save([...loadAlerts(), alert]);
  return alert;
}

export function deleteAlert(id: string): void {
  save(loadAlerts().filter((a) => a.id !== id));
}

export function resetAlert(id: string): void {
  const alerts = loadAlerts();
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx < 0) return;
  alerts[idx] = { ...alerts[idx], triggered: false, triggeredAt: undefined };
  save(alerts);
}

/**
 * Checks all alerts against current prices, marks newly-triggered ones.
 * Returns the alerts that flipped to triggered in THIS check.
 */
export function evaluateAlerts(prices: Record<string, number | null>): PriceAlert[] {
  const alerts = loadAlerts();
  const newlyTriggered: PriceAlert[] = [];
  let changed = false;
  for (let i = 0; i < alerts.length; i++) {
    const a = alerts[i];
    if (a.triggered) continue;
    const price = prices[a.coinId];
    if (typeof price !== 'number') continue;
    const hit = a.direction === 'above' ? price >= a.targetPrice : price <= a.targetPrice;
    if (hit) {
      alerts[i] = { ...a, triggered: true, triggeredAt: Date.now() };
      newlyTriggered.push(alerts[i]);
      changed = true;
    }
  }
  if (changed) save(alerts);
  return newlyTriggered;
}
