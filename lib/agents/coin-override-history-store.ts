// localStorage-Wrapper fuer die User-Override-Historie. Separater Store vom
// aktiven coin-overrides-v1, weil wir hier ein APPEND-only Log fuehren —
// die User-Aktion an sich, mit Preis zum Set-Zeitpunkt, fuer spaetere
// Bewertung.

import type { CoinOverrideHistoryEntry } from '@/lib/agents/coin-override-history';
import type { CoinOverrideFactor } from '@/lib/agents/coin-override';

const STORAGE_KEY = 'trading-app.coin-override-history-v1';
export const COIN_OVERRIDE_HISTORY_CHANGED_EVENT = 'trading-app:coin-override-history-changed';
const MAX_ENTRIES = 200;

export function loadCoinOverrideHistory(): CoinOverrideHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is CoinOverrideHistoryEntry =>
      typeof e?.id === 'string'
      && typeof e?.coinId === 'string'
      && Array.isArray(e?.factors)
      && typeof e?.priceAtSet === 'number'
      && typeof e?.setAt === 'number'
    );
  } catch {
    return [];
  }
}

function save(entries: CoinOverrideHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  const trimmed = entries.slice(-MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(COIN_OVERRIDE_HISTORY_CHANGED_EVENT));
}

// Append einen neuen Eintrag — aufgerufen beim setSquadOverride-Wrapper.
// Idempotenz pro (coin, set-Tag): wir wollen pro Tag pro Coin nur eine
// History-Zeile, damit der User nicht durch Mehrfach-Klicks unsere Statistik
// versaut.
export function appendCoinOverrideHistory(
  coinId: string,
  factors: CoinOverrideFactor[],
  priceAtSet: number
): void {
  if (typeof window === 'undefined') return;
  if (factors.length === 0) return; // leere Sets nicht loggen
  if (!Number.isFinite(priceAtSet) || priceAtSet <= 0) return;
  const log = loadCoinOverrideHistory();
  const todayIso = new Date().toISOString().slice(0, 10);
  // Filter: gleicher Coin, gleicher Tag → ueberschreiben.
  const filtered = log.filter((e) => !(e.coinId === coinId.toLowerCase() && new Date(e.setAt).toISOString().slice(0, 10) === todayIso));
  filtered.push({
    id: `${coinId.toLowerCase()}-${Date.now()}`,
    coinId: coinId.toLowerCase(),
    factors,
    priceAtSet,
    setAt: Date.now()
  });
  save(filtered);
}

export function clearCoinOverrideHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(COIN_OVERRIDE_HISTORY_CHANGED_EVENT));
}
