// localStorage-Wrapper fuer den Signal-Modus.
//
// Default = PRECISION (strenger Modus). Wechsel auf BALANCED oder
// HIGH_RISK bleibt lokal gespeichert. SSR-sicher.

import type { SportRiskMode } from '@/lib/sport/sport-odds-value';

const STORAGE_KEY = 'trading-app.sport-signal-mode-v1';
export const SPORT_SIGNAL_MODE_CHANGED_EVENT = 'trading-app:sport-signal-mode-changed';

const ALLOWED: SportRiskMode[] = ['PRECISION', 'BALANCED', 'HIGH_RISK'];

export function loadSignalMode(): SportRiskMode {
  if (typeof window === 'undefined') return 'PRECISION';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'PRECISION';
    if ((ALLOWED as string[]).includes(raw)) return raw as SportRiskMode;
    return 'PRECISION';
  } catch {
    return 'PRECISION';
  }
}

export function saveSignalMode(mode: SportRiskMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(SPORT_SIGNAL_MODE_CHANGED_EVENT));
}
