import { Position, PositionStatus } from '@/lib/types/positions';

const STORAGE_KEY = 'trading-app.positions';
export const POSITIONS_CHANGED_EVENT = 'trading-app:positions-changed';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadPositions(): Position[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p): p is Position => typeof p === 'object' && p !== null && typeof p.id === 'string');
  } catch {
    return [];
  }
}

export function savePositions(positions: Position[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  window.dispatchEvent(new CustomEvent(POSITIONS_CHANGED_EVENT));
}

export function addPosition(input: Omit<Position, 'id' | 'status' | 'entryDate'> & Partial<Pick<Position, 'status' | 'entryDate'>>): Position {
  const position: Position = {
    id: generateId(),
    status: input.status ?? 'open',
    entryDate: input.entryDate ?? Date.now(),
    ...input
  } as Position;
  const all = loadPositions();
  all.push(position);
  savePositions(all);
  return position;
}

export function closePosition(id: string, closePrice: number, status: PositionStatus = 'closed_win'): Position | null {
  const all = loadPositions();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const p = all[idx];
  const pnl = (closePrice - p.entryPrice) * p.positionSize;
  const pnlPct = ((closePrice - p.entryPrice) / p.entryPrice) * 100;
  const finalStatus: PositionStatus = pnl > 0 ? 'closed_win' : pnl < 0 ? 'closed_loss' : 'closed_breakeven';
  all[idx] = {
    ...p,
    status: status === 'reduced' ? 'reduced' : finalStatus,
    closeDate: Date.now(),
    closePrice,
    realizedPnl: pnl,
    realizedPnlPct: pnlPct
  };
  savePositions(all);
  return all[idx];
}

export function deletePosition(id: string): void {
  const all = loadPositions().filter((p) => p.id !== id);
  savePositions(all);
}

export function updatePositionNotes(id: string, notes: string): void {
  const all = loadPositions();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], notes };
  savePositions(all);
}

export interface PositionStats {
  total: number;
  open: number;
  closed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  realizedByCurrency: Record<string, number>;
  unrealizedByCurrency: Record<string, number>;
  exposureByBroker: Record<string, number>;
}

export function computePositionStats(positions: Position[], latestPrices: Record<string, number>): PositionStats {
  const open = positions.filter((p) => p.status === 'open');
  const closed = positions.filter((p) => p.status === 'closed_win' || p.status === 'closed_loss' || p.status === 'closed_breakeven');
  const wins = closed.filter((p) => (p.realizedPnl ?? 0) > 0).length;
  const losses = closed.filter((p) => (p.realizedPnl ?? 0) <= 0).length;
  const winRate = closed.length > 0 ? wins / closed.length : null;

  const realizedByCurrency: Record<string, number> = {};
  for (const p of closed) {
    realizedByCurrency[p.currency] = (realizedByCurrency[p.currency] ?? 0) + (p.realizedPnl ?? 0);
  }

  const unrealizedByCurrency: Record<string, number> = {};
  for (const p of open) {
    const latest = latestPrices[p.ticker?.toLowerCase() ?? p.underlying.toLowerCase()];
    if (typeof latest !== 'number') continue;
    const unrealized = (latest - p.entryPrice) * p.positionSize;
    unrealizedByCurrency[p.currency] = (unrealizedByCurrency[p.currency] ?? 0) + unrealized;
  }

  const exposureByBroker: Record<string, number> = {};
  for (const p of open) {
    exposureByBroker[p.broker] = (exposureByBroker[p.broker] ?? 0) + p.investmentQuote;
  }

  return {
    total: positions.length,
    open: open.length,
    closed: closed.length,
    wins,
    losses,
    winRate,
    realizedByCurrency,
    unrealizedByCurrency,
    exposureByBroker
  };
}

export function findPositionsByUnderlying(underlying: string): Position[] {
  const norm = underlying.toUpperCase().trim();
  return loadPositions().filter((p) => p.underlying.toUpperCase().trim() === norm || p.ticker?.toUpperCase() === norm);
}
