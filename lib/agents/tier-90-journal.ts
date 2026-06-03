// Tagebuch für Tier-90-Trade-Picks. Wenn die Tier-90-Engine alle 5 Säulen
// auf grün hat, wird das Datum + Coin + Empfehlung lokal mitgeschrieben. So
// kann der User später sehen, wie oft Tier 90 überhaupt auftaucht und ob die
// Empfehlungen getroffen haben.

export interface Tier90JournalEntry {
  date: string; // YYYY-MM-DD (Europe/Berlin)
  recordedAt: number;
  coinSymbol: string;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  // 'pending' bis das Take-Profit oder der Stop ausgelöst hat.
  outcome: 'pending' | 'tp_hit' | 'stop_hit' | 'expired';
  outcomeRecordedAt?: number;
  // Best-and-worst-Preis-Bewegung seit dem Pick (zur Auflösung).
  highSinceEntry?: number;
  lowSinceEntry?: number;
}

const STORAGE_KEY = 'trading-app.tier-90-journal-v1';
export const TIER_90_JOURNAL_CHANGED_EVENT = 'trading-app:tier-90-journal-changed';

export function loadTier90Journal(): Tier90JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Tier90JournalEntry[];
  } catch {
    return [];
  }
}

function save(entries: Tier90JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(TIER_90_JOURNAL_CHANGED_EVENT));
}

export function recordTier90Pick(entry: Omit<Tier90JournalEntry, 'recordedAt' | 'outcome'>): void {
  const log = loadTier90Journal();
  // Nur eine Auflösung pro (Datum, Coin) — wir wollen kein Spam bei Re-Renders.
  if (log.some((e) => e.date === entry.date && e.coinSymbol === entry.coinSymbol)) return;
  log.push({ ...entry, recordedAt: Date.now(), outcome: 'pending' });
  save(log);
}

// Pure Auflösungs-Funktion: nimmt den Verlauf eines Coins und prüft, ob seit
// dem Eintrag Stop oder TP getriggert wurde. Wird gegen das echte
// Hoch/Tief-Fenster ausgewertet.
export function resolveTier90Pick(entry: Tier90JournalEntry, high: number, low: number): Tier90JournalEntry {
  if (entry.outcome !== 'pending') return entry;
  if (entry.stopLoss !== null && low <= entry.stopLoss) {
    return { ...entry, outcome: 'stop_hit', outcomeRecordedAt: Date.now(), highSinceEntry: high, lowSinceEntry: low };
  }
  if (entry.takeProfit1 !== null && high >= entry.takeProfit1) {
    return { ...entry, outcome: 'tp_hit', outcomeRecordedAt: Date.now(), highSinceEntry: high, lowSinceEntry: low };
  }
  return { ...entry, highSinceEntry: high, lowSinceEntry: low };
}

export interface Tier90Stats {
  total: number;
  pending: number;
  tpHit: number;
  stopHit: number;
  expired: number;
  hitRatePct: number | null;
}

export function summariseTier90(log: Tier90JournalEntry[]): Tier90Stats {
  const total = log.length;
  const pending = log.filter((e) => e.outcome === 'pending').length;
  const tpHit = log.filter((e) => e.outcome === 'tp_hit').length;
  const stopHit = log.filter((e) => e.outcome === 'stop_hit').length;
  const expired = log.filter((e) => e.outcome === 'expired').length;
  const resolved = tpHit + stopHit + expired;
  const hitRatePct = resolved > 0 ? Math.round((tpHit / resolved) * 1000) / 10 : null;
  return { total, pending, tpHit, stopHit, expired, hitRatePct };
}
