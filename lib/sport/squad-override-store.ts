// localStorage-Wrapper fuer SquadOverride pro Fixture. Separat von der
// puren squad-override.ts, damit jene SSR-sicher bleibt.

import type { SquadOverride, SquadFactor } from '@/lib/sport/squad-override';

const STORAGE_KEY = 'trading-app.squad-overrides-v1';
export const SQUAD_OVERRIDES_CHANGED_EVENT = 'trading-app:squad-overrides-changed';

interface OverrideStore {
  [fixtureId: string]: SquadOverride;
}

function load(): OverrideStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as OverrideStore;
  } catch {
    return {};
  }
}

function save(store: OverrideStore): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(SQUAD_OVERRIDES_CHANGED_EVENT));
}

export function loadAllSquadOverrides(): OverrideStore {
  return load();
}

export function loadSquadOverride(fixtureId: string): SquadOverride | null {
  const store = load();
  return store[fixtureId] ?? null;
}

export function setSquadOverride(fixtureId: string, homeFactors: SquadFactor[], awayFactors: SquadFactor[]): void {
  const store = load();
  if (homeFactors.length === 0 && awayFactors.length === 0) {
    // Empty override → just clear it.
    delete store[fixtureId];
  } else {
    store[fixtureId] = {
      fixtureId,
      homeFactors,
      awayFactors,
      updatedAt: Date.now()
    };
  }
  save(store);
}

export function clearSquadOverride(fixtureId: string): void {
  const store = load();
  delete store[fixtureId];
  save(store);
}
