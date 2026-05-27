export interface Trendline {
  id: string;
  assetId: string;
  start: { time: number; price: number };
  end: { time: number; price: number };
  color: string;
  createdAt: number;
}

const STORAGE_KEY = 'trading-app.chart-drawings';
export const DRAWINGS_CHANGED_EVENT = 'trading-app:drawings-changed';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadDrawings(assetId: string): Trendline[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const all = JSON.parse(raw);
    if (!Array.isArray(all)) return [];
    return all.filter((d): d is Trendline => typeof d === 'object' && d !== null && d.assetId === assetId);
  } catch {
    return [];
  }
}

function loadAll(): Trendline[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAll(drawings: Trendline[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings));
  window.dispatchEvent(new CustomEvent(DRAWINGS_CHANGED_EVENT));
}

export function addTrendline(input: Omit<Trendline, 'id' | 'createdAt'>): Trendline {
  const line: Trendline = { id: generateId(), createdAt: Date.now(), ...input };
  saveAll([...loadAll(), line]);
  return line;
}

export function deleteTrendline(id: string): void {
  saveAll(loadAll().filter((d) => d.id !== id));
}

export function clearAssetDrawings(assetId: string): void {
  saveAll(loadAll().filter((d) => d.assetId !== assetId));
}
