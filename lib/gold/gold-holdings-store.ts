// Multi-Position Gold-Holdings im localStorage. Kein Backend, kein Account.
// Pure Helper für CRUD + Migrations + ID-Erzeugung. Browser-Funktionen sind
// SSR-safe (typeof window === 'undefined' → no-op).
//
// Schema-Version v1: jede Position speichert die Eingaben des Rechners.
// Bewusst KEINE berechneten Werte (PnL, Verdict) — die werden zur Render-Zeit
// aus den Inputs + aktuellem Goldpreis neu berechnet.

import type { AmountUnit, PurchasePriceMode } from '@/lib/gold/gold-holding-calculator';

export interface GoldHolding {
  id: string;
  label: string;                 // freier User-Text, z.B. "Krügerrand 1 oz"
  createdAt: number;             // ms Epoch
  purchaseDate: string;          // YYYY-MM-DD
  amount: number;
  amountUnit: AmountUnit;
  purityPromille: number;
  purchasePriceMode: PurchasePriceMode;
  purchasePrice?: number;
  fees?: number;
  sellSpreadPct?: number;
}

const STORAGE_KEY = 'trading-app.gold-holdings-v1';
export const GOLD_HOLDINGS_CHANGED_EVENT = 'trading-app:gold-holdings-changed';
const MAX_HOLDINGS = 50;

function isValid(entry: unknown): entry is GoldHolding {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  return typeof e.id === 'string'
    && typeof e.label === 'string'
    && typeof e.createdAt === 'number'
    && typeof e.purchaseDate === 'string'
    && typeof e.amount === 'number'
    && (e.amountUnit === 'gram' || e.amountUnit === 'ounce' || e.amountUnit === 'kilogram')
    && typeof e.purityPromille === 'number'
    && (e.purchasePriceMode === 'auto' || e.purchasePriceMode === 'total' || e.purchasePriceMode === 'per-gram' || e.purchasePriceMode === 'per-ounce');
}

export function loadGoldHoldings(): GoldHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    return [];
  }
}

function save(items: GoldHolding[]): void {
  if (typeof window === 'undefined') return;
  // Neueste oben, max MAX_HOLDINGS.
  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_HOLDINGS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  window.dispatchEvent(new CustomEvent(GOLD_HOLDINGS_CHANGED_EVENT));
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addGoldHolding(entry: Omit<GoldHolding, 'id' | 'createdAt'>): GoldHolding {
  const full: GoldHolding = { ...entry, id: newId(), createdAt: Date.now() };
  save([...loadGoldHoldings(), full]);
  return full;
}

export function removeGoldHolding(id: string): void {
  save(loadGoldHoldings().filter((h) => h.id !== id));
}

export function clearGoldHoldings(): void {
  save([]);
}
