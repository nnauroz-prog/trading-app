// localStorage-Wrapper fuer die einstellbare Tagesdeckel-Schwelle.
// Pflichtbereich 4..15 %. Default 8 %.

import { DAY_CAP_PCT_DEFAULT } from '@/lib/sport/wm-day-cap';

const STORAGE_KEY = 'trading-app.wm-day-cap-pct-v1';
export const WM_DAY_CAP_CHANGED_EVENT = 'trading-app:wm-day-cap-changed';
export const MIN_CAP_PCT = 4;
export const MAX_CAP_PCT = 15;

function clamp(n: number): number {
  return Math.min(MAX_CAP_PCT, Math.max(MIN_CAP_PCT, n));
}

export function loadDayCapPct(): number {
  if (typeof window === 'undefined') return DAY_CAP_PCT_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DAY_CAP_PCT_DEFAULT;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return DAY_CAP_PCT_DEFAULT;
    return clamp(n);
  } catch {
    return DAY_CAP_PCT_DEFAULT;
  }
}

export function saveDayCapPct(pct: number): void {
  if (typeof window === 'undefined') return;
  const value = clamp(pct);
  window.localStorage.setItem(STORAGE_KEY, String(value));
  window.dispatchEvent(new CustomEvent(WM_DAY_CAP_CHANGED_EVENT));
}

export function resetDayCapPct(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(WM_DAY_CAP_CHANGED_EVENT));
}
