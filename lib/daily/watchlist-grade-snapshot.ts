// Snapshot der letzten Grades pro Watchlist-Symbol. Nur localStorage, kein
// Server. Erlaubt der Daily-Page, „Verbesserung" und „Verschlechterung" auf
// gewatchten Werten zu zeigen.

export interface WatchlistGradeSnapshot {
  symbol: string;
  klass: 'Aktien' | 'Rohstoffe' | 'Krypto';
  grade: 'A' | 'B' | 'C' | 'D';
  recordedAt: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'trading-app.watchlist-grade-snapshot-v1';

export function loadGradeSnapshot(): WatchlistGradeSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is WatchlistGradeSnapshot =>
      typeof s?.symbol === 'string'
      && (s?.klass === 'Aktien' || s?.klass === 'Rohstoffe' || s?.klass === 'Krypto')
      && (s?.grade === 'A' || s?.grade === 'B' || s?.grade === 'C' || s?.grade === 'D')
      && typeof s?.recordedAt === 'string'
    );
  } catch {
    return [];
  }
}

// Schreibt für (symbol, klass) den aktuellen Grade. Idempotent pro Tag:
// dasselbe Tagesdatum wird nicht überschrieben, damit die "Verbesserung"-
// Anzeige stabil bleibt — wir wollen den jeweils ersten Wert des Tages.
export function recordGradeSnapshot(entry: WatchlistGradeSnapshot): void {
  if (typeof window === 'undefined') return;
  const list = loadGradeSnapshot();
  const existing = list.find((s) =>
    s.symbol === entry.symbol && s.klass === entry.klass && s.recordedAt === entry.recordedAt
  );
  if (existing) return;
  // Wenn ein älterer Eintrag für (symbol, klass) existiert: behalten als
  // "Vorgängerwert", aktuellen anhängen. Wir cappen bei den letzten 2 pro
  // (symbol, klass), damit der Storage nicht explodiert.
  const sameKey = list.filter((s) => s.symbol === entry.symbol && s.klass === entry.klass).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const others = list.filter((s) => !(s.symbol === entry.symbol && s.klass === entry.klass));
  const keep = [...sameKey.slice(-1), entry];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...keep]));
}

// Pure: liefert den vorherigen Grade für (symbol, klass) — also den nicht-
// heutigen, falls vorhanden.
export function previousGradeFor(snapshots: WatchlistGradeSnapshot[], symbol: string, klass: WatchlistGradeSnapshot['klass'], todayIso: string): 'A' | 'B' | 'C' | 'D' | null {
  const matching = snapshots
    .filter((s) => s.symbol === symbol && s.klass === klass && s.recordedAt !== todayIso)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  return matching.length > 0 ? matching[matching.length - 1].grade : null;
}
