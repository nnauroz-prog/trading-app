// localStorage-Wrapper fuer Quoten-Vergleich-Daten.
//
// Speichert pro Pick: die 3 Anbieter-Namen (frei waehlbar, z. B. Bet365)
// und die zuletzt eingegebenen Quoten. Damit muss der User nicht jeden
// Tag dieselben Anbieter neu eintippen.
//
// SSR-sicher: alle Funktionen no-op wenn window nicht da ist.

const SLOTS_KEY = 'trading-app.wm-odds-compare-slot-names-v1';
const QUOTES_KEY = 'trading-app.wm-odds-compare-quotes-v1';
const DEFAULT_SLOTS = ['Anbieter A', 'Anbieter B', 'Anbieter C'] as const;

export const WM_ODDS_COMPARE_CHANGED_EVENT = 'trading-app:wm-odds-compare-changed';

function notify(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WM_ODDS_COMPARE_CHANGED_EVENT));
}

export function loadSlotNames(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_SLOTS];
  try {
    const raw = window.localStorage.getItem(SLOTS_KEY);
    if (!raw) return [...DEFAULT_SLOTS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_SLOTS];
    const cleaned = parsed.slice(0, 3).map((s, i) => typeof s === 'string' && s.trim().length > 0 ? s : DEFAULT_SLOTS[i]);
    while (cleaned.length < 3) cleaned.push(DEFAULT_SLOTS[cleaned.length]);
    return cleaned;
  } catch {
    return [...DEFAULT_SLOTS];
  }
}

export function saveSlotNames(names: string[]): void {
  if (typeof window === 'undefined') return;
  const sanitized = names.slice(0, 3).map((n, i) => (n.trim().length > 0 ? n.trim() : DEFAULT_SLOTS[i]));
  window.localStorage.setItem(SLOTS_KEY, JSON.stringify(sanitized));
  notify();
}

export interface PickQuotes {
  // Index 0..2 entspricht den drei Anbietern; '' wenn leer.
  drafts: [string, string, string];
}

type QuoteMap = Record<string, PickQuotes>;

export function loadAllQuotes(): QuoteMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(QUOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as QuoteMap;
  } catch {
    return {};
  }
}

export function saveQuotesForPick(pickId: string, drafts: [string, string, string]): void {
  if (typeof window === 'undefined') return;
  const all = loadAllQuotes();
  if (drafts.every((d) => d.trim() === '')) {
    delete all[pickId];
  } else {
    all[pickId] = { drafts };
  }
  window.localStorage.setItem(QUOTES_KEY, JSON.stringify(all));
  notify();
}

export const DEFAULT_SLOT_NAMES: readonly string[] = DEFAULT_SLOTS;
