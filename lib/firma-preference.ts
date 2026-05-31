import { PersonaId } from '@/lib/agents/personas';

const STORAGE_KEY = 'trading-app.firma-preference-v1';
export const FIRMA_PREFERENCE_CHANGED_EVENT = 'trading-app:firma-preference-changed';

export function loadFirmaPreference(): PersonaId | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'conservative' || v === 'balanced' || v === 'aggressive') return v;
  return null;
}

export function saveFirmaPreference(firma: PersonaId | null): void {
  if (typeof window === 'undefined') return;
  if (firma === null) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, firma);
  window.dispatchEvent(new CustomEvent(FIRMA_PREFERENCE_CHANGED_EVENT));
}
