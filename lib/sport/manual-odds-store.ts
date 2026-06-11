// localStorage-Wrapper fuer manuell eingetragene Sport-Quoten.
//
// Wichtige Ehrlichkeits-Regeln:
// * Speichern PASSIERT NUR auf explizite Aktion des Users (saveManualOdds).
// * Keine Auto-Speicherung waehrend der Eingabe.
// * Keine Fake- oder Platzhalter-Quoten — Quote <= 1 wird gar nicht erst
//   abgelegt.
// * Manuelle Quoten sind grundsaetzlich lokal. Kein Server-Sync.
//
// Key-Schema: ${matchId}__${marketType}

const STORAGE_KEY = 'trading-app.sport-manual-odds-v1';
export const SPORT_MANUAL_ODDS_CHANGED_EVENT = 'trading-app:sport-manual-odds-changed';

export interface ManualOddsEntry {
  matchId: string;
  marketType: string;
  decimalOdds: number;
  capturedAt: string;
}

type Store = Record<string, ManualOddsEntry>;

function compositeKey(matchId: string, marketType: string): string {
  return `${matchId}__${marketType}`;
}

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Store;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(SPORT_MANUAL_ODDS_CHANGED_EVENT));
}

export function loadManualOdds(matchId: string, marketType: string): ManualOddsEntry | null {
  const all = read();
  return all[compositeKey(matchId, marketType)] ?? null;
}

export function loadAllManualOdds(): ManualOddsEntry[] {
  return Object.values(read());
}

export function saveManualOdds(matchId: string, marketType: string, decimalOdds: number): ManualOddsEntry | null {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return null;
  const all = read();
  const entry: ManualOddsEntry = {
    matchId,
    marketType,
    decimalOdds,
    capturedAt: new Date().toISOString()
  };
  all[compositeKey(matchId, marketType)] = entry;
  write(all);
  return entry;
}

export function removeManualOdds(matchId: string, marketType: string): void {
  const all = read();
  delete all[compositeKey(matchId, marketType)];
  write(all);
}
