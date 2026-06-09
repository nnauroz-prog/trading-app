// localStorage-Wrapper fuer CoinOverride pro Coin. Separat von der reinen
// coin-override.ts, damit jene SSR-sicher bleibt.

import type { CoinOverride, CoinOverrideFactor } from '@/lib/agents/coin-override';

const STORAGE_KEY = 'trading-app.coin-overrides-v1';
export const COIN_OVERRIDES_CHANGED_EVENT = 'trading-app:coin-overrides-changed';

interface Store {
  [coinId: string]: CoinOverride;
}

function load(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Store;
  } catch {
    return {};
  }
}

function save(s: Store): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(COIN_OVERRIDES_CHANGED_EVENT));
}

export function loadAllCoinOverrides(): Store {
  return load();
}

export function loadCoinOverride(coinId: string): CoinOverride | null {
  const s = load();
  return s[coinId.toLowerCase()] ?? null;
}

export function setCoinOverride(coinId: string, factors: CoinOverrideFactor[]): void {
  const s = load();
  const key = coinId.toLowerCase();
  if (factors.length === 0) {
    delete s[key];
  } else {
    s[key] = {
      coinId: key,
      factors,
      updatedAt: Date.now()
    };
  }
  save(s);
}

export function clearCoinOverride(coinId: string): void {
  const s = load();
  delete s[coinId.toLowerCase()];
  save(s);
}
