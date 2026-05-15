import { TradeSignal } from '@/lib/types/domain';

export type PaperTradeStatus = 'open' | 'closed_tp1' | 'closed_tp2' | 'closed_sl' | 'closed_manual';

export interface PaperTrade {
  id: string;
  assetId: string;
  ticker: string;
  type: 'LONG';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  positionSizeCoins: number;
  investmentQuote: number;
  currency: 'EUR' | 'USD';
  takenAt: number;
  status: PaperTradeStatus;
  closedAt?: number;
  closePrice?: number;
  realizedPnlQuote?: number;
  realizedPnlPct?: number;
  confidence: number;
  reasoning: string[];
}

const STORAGE_KEY = 'trading-app.paper-trades';
export const TRADES_CHANGED_EVENT = 'trading-app:trades-changed';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadTrades(): PaperTrade[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((t): t is PaperTrade => typeof t === 'object' && t !== null && typeof t.id === 'string');
  } catch {
    return [];
  }
}

export function saveTrades(trades: PaperTrade[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  window.dispatchEvent(new CustomEvent(TRADES_CHANGED_EVENT));
}

export function addTradeFromSignal(signal: TradeSignal, positionSizeCoins: number, investmentQuote: number, currency: 'EUR' | 'USD'): PaperTrade {
  const trade: PaperTrade = {
    id: generateId(),
    assetId: signal.assetId,
    ticker: signal.ticker,
    type: 'LONG',
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit1: signal.takeProfit1,
    takeProfit2: signal.takeProfit2,
    positionSizeCoins,
    investmentQuote,
    currency,
    takenAt: Date.now(),
    status: 'open',
    confidence: signal.confidence,
    reasoning: signal.reasoning
  };
  const all = loadTrades();
  all.push(trade);
  saveTrades(all);
  return trade;
}

function closedFromExit(trade: PaperTrade, status: PaperTradeStatus, closePrice: number, closedAt: number): PaperTrade {
  const pnlQuote = (closePrice - trade.entry) * trade.positionSizeCoins;
  const pnlPct = ((closePrice - trade.entry) / trade.entry) * 100;
  return {
    ...trade,
    status,
    closedAt,
    closePrice,
    realizedPnlQuote: pnlQuote,
    realizedPnlPct: pnlPct
  };
}

export function closeTradeManual(id: string, currentPrice: number): PaperTrade | null {
  const all = loadTrades();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const t = all[idx];
  if (t.status !== 'open') return t;
  const closed = closedFromExit(t, 'closed_manual', currentPrice, Date.now());
  all[idx] = closed;
  saveTrades(all);
  return closed;
}

export function deleteTrade(id: string): void {
  const all = loadTrades().filter((t) => t.id !== id);
  saveTrades(all);
}

export interface CandleLite {
  openTime: number;
  high: number;
  low: number;
  close: number;
}

export function evaluateTrade(trade: PaperTrade, candles: CandleLite[]): PaperTrade {
  if (trade.status !== 'open') return trade;
  const relevant = candles.filter((c) => c.openTime > trade.takenAt - 60 * 60 * 1000);
  for (const c of relevant) {
    const hitSl = c.low <= trade.stopLoss;
    const hitTp1 = c.high >= trade.takeProfit1;
    if (hitSl) return closedFromExit(trade, 'closed_sl', trade.stopLoss, c.openTime);
    if (hitTp1) return closedFromExit(trade, 'closed_tp1', trade.takeProfit1, c.openTime);
  }
  return trade;
}

export interface PaperTradeStats {
  total: number;
  open: number;
  closed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  realizedPnlByCurrency: Record<string, number>;
  unrealizedPnlByCurrency: Record<string, number>;
}

export function computeStats(trades: PaperTrade[], latestPrices: Record<string, number>): PaperTradeStats {
  const open = trades.filter((t) => t.status === 'open');
  const closed = trades.filter((t) => t.status !== 'open');
  const wins = closed.filter((t) => (t.realizedPnlQuote ?? 0) > 0).length;
  const losses = closed.filter((t) => (t.realizedPnlQuote ?? 0) <= 0).length;
  const winRate = closed.length > 0 ? wins / closed.length : null;
  const realizedPnlByCurrency: Record<string, number> = {};
  for (const t of closed) {
    const c = t.currency;
    realizedPnlByCurrency[c] = (realizedPnlByCurrency[c] ?? 0) + (t.realizedPnlQuote ?? 0);
  }
  const unrealizedPnlByCurrency: Record<string, number> = {};
  for (const t of open) {
    const latest = latestPrices[t.assetId];
    if (typeof latest !== 'number') continue;
    const pnl = (latest - t.entry) * t.positionSizeCoins;
    unrealizedPnlByCurrency[t.currency] = (unrealizedPnlByCurrency[t.currency] ?? 0) + pnl;
  }
  return {
    total: trades.length,
    open: open.length,
    closed: closed.length,
    wins,
    losses,
    winRate,
    realizedPnlByCurrency,
    unrealizedPnlByCurrency
  };
}
