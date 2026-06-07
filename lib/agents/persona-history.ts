// Tägliche Verdict-Historie für die Vorstands-Persönlichkeiten.
// Wird im Browser-localStorage gespeichert (kein Backend). Pure Funktionen,
// damit testbar und SSR-sicher.

export interface HistoryEntry {
  dateIso: string;           // YYYY-MM-DD
  klass: string;             // 'Krypto' | 'Aktien' | ...
  personaId: string;         // 'conservative' | 'balanced' | 'aggressive'
  verdict: string;           // 'KAUFEN' | 'WARTEN' | ...
  targetLabel: string | null;
}

const STORAGE_KEY = 'trading-app.persona-history-v1';
const MAX_ENTRIES = 1000;
export const PERSONA_HISTORY_CHANGED_EVENT = 'trading-app:persona-history-changed';

export function loadPersonaHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is HistoryEntry =>
      typeof e?.dateIso === 'string'
      && typeof e?.klass === 'string'
      && typeof e?.personaId === 'string'
      && typeof e?.verdict === 'string'
    );
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent(PERSONA_HISTORY_CHANGED_EVENT));
}

// Idempotent: speichert für (date, klass, persona) maximal einen Eintrag.
// Wenn schon vorhanden, wird er nicht überschrieben — wir wollen das ehrliche
// erste Verdict des Tages.
export function recordVerdict(entry: HistoryEntry): void {
  const list = loadPersonaHistory();
  const exists = list.some((e) =>
    e.dateIso === entry.dateIso
    && e.klass === entry.klass
    && e.personaId === entry.personaId
  );
  if (exists) return;
  save([...list, entry]);
}

export function clearPersonaHistory(): void {
  save([]);
}

export interface VerdictStreak {
  // Letztes (jüngstes) Verdict in der Reihe.
  currentVerdict: string;
  // Wie viele Tage hintereinander wurde dasselbe Verdict abgegeben?
  length: number;
}

// Berechnet die aktuelle Streak in einer chronologisch sortierten
// (oder unsortierten) Liste von Einträgen.
export function computeStreak(entries: HistoryEntry[]): VerdictStreak | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  const last = sorted[sorted.length - 1];
  let length = 1;
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sorted[i].verdict === last.verdict) length++;
    else break;
  }
  return { currentVerdict: last.verdict, length };
}

export interface PersonaSlice {
  klass: string;
  personaId: string;
  entries: HistoryEntry[];
}

// Filtert die History auf ein N-Tage-Fenster und gruppiert nach Persona-Identität.
export function sliceLastDays(history: HistoryEntry[], days: number, todayIso: string): PersonaSlice[] {
  const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
  const minMs = todayMs - days * 24 * 60 * 60 * 1000;
  const map = new Map<string, PersonaSlice>();
  for (const e of history) {
    const eMs = new Date(`${e.dateIso}T00:00:00`).getTime();
    if (Number.isNaN(eMs) || eMs < minMs || eMs > todayMs) continue;
    const key = `${e.klass}::${e.personaId}`;
    const slice = map.get(key);
    if (slice) {
      slice.entries.push(e);
    } else {
      map.set(key, { klass: e.klass, personaId: e.personaId, entries: [e] });
    }
  }
  // Sortiere die Entries pro Slice nach Datum aufsteigend.
  for (const slice of map.values()) {
    slice.entries.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  }
  return [...map.values()];
}

// Liefert das jüngste Datum, an dem eine bestimmte Persona ein „Buy/Tipp"-Verdict
// abgegeben hat. Null wenn keine Buy-Einträge in der Historie.
function isBuyVerdict(verdict: string): boolean {
  return verdict === 'KAUFEN' || verdict === 'BUY' || verdict === 'TIPPEN';
}

export function lastBuyDateFor(history: HistoryEntry[], klass: string, personaId: string): string | null {
  let best: string | null = null;
  for (const e of history) {
    if (e.klass !== klass || e.personaId !== personaId) continue;
    if (!isBuyVerdict(e.verdict)) continue;
    if (best === null || e.dateIso > best) best = e.dateIso;
  }
  return best;
}

// Liefert die aktuelle Streak pro Persona-ID für eine bestimmte Asset-Klasse.
// Reine Funktion — kombiniert sliceLastDays + computeStreak. Wenn keine Einträge,
// ist der Wert null.
export function getStreaksForPersonas(
  history: HistoryEntry[],
  klass: string,
  personaIds: string[],
  todayIso: string,
  windowDays = 30
): Record<string, VerdictStreak | null> {
  const slices = sliceLastDays(history, windowDays, todayIso);
  const out: Record<string, VerdictStreak | null> = {};
  for (const id of personaIds) {
    const slice = slices.find((s) => s.klass === klass && s.personaId === id);
    out[id] = slice ? computeStreak(slice.entries) : null;
  }
  return out;
}
