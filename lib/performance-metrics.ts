import { Position } from '@/lib/types/positions';
import { IdeaJournalEntry } from '@/lib/types/positions';

export interface PerformanceMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRatePct: number | null;
  totalRealizedPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  expectancyPerTrade: number | null;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio: number | null;
  maxDrawdownPct: number;
  maxDrawdownAbsolute: number;
  longestWinStreak: number;
  longestLossStreak: number;
  equityCurve: Array<{ time: number; equity: number }>;
  monthlyPnl: Array<{ month: string; pnl: number; trades: number }>;
  byUnderlying: Array<{ underlying: string; pnl: number; trades: number; winRate: number | null }>;
  byInstrumentType: Array<{ type: string; pnl: number; trades: number; winRate: number | null }>;
  byBroker: Array<{ broker: string; pnl: number; trades: number; winRate: number | null }>;
  byAppDecision: Array<{ decision: string; outcomes: { positive: number; negative: number; neutral: number; pending: number } }>;
  currency: string;
}

function computeStreak(closed: Position[]): { winStreak: number; lossStreak: number } {
  let curWin = 0;
  let curLoss = 0;
  let maxWin = 0;
  let maxLoss = 0;
  const sorted = [...closed].sort((a, b) => (a.closeDate ?? 0) - (b.closeDate ?? 0));
  for (const p of sorted) {
    const pnl = p.realizedPnl ?? 0;
    if (pnl > 0) {
      curWin++;
      curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else if (pnl < 0) {
      curLoss++;
      curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    } else {
      curWin = 0;
      curLoss = 0;
    }
  }
  return { winStreak: maxWin, lossStreak: maxLoss };
}

function computeEquityCurve(closed: Position[]): Array<{ time: number; equity: number }> {
  const sorted = [...closed].sort((a, b) => (a.closeDate ?? 0) - (b.closeDate ?? 0));
  const curve: Array<{ time: number; equity: number }> = [];
  let equity = 0;
  for (const p of sorted) {
    equity += p.realizedPnl ?? 0;
    curve.push({ time: p.closeDate ?? Date.now(), equity });
  }
  return curve;
}

function computeMaxDrawdown(curve: Array<{ time: number; equity: number }>): { pct: number; absolute: number } {
  if (curve.length === 0) return { pct: 0, absolute: 0 };
  let peak = -Infinity;
  let maxDd = 0;
  let maxDdPct = 0;
  for (const point of curve) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak - point.equity;
    if (dd > maxDd) {
      maxDd = dd;
      if (peak > 0) maxDdPct = (dd / peak) * 100;
      else if (peak < 0) maxDdPct = 0;
    }
  }
  return { pct: maxDdPct, absolute: maxDd };
}

function computeSharpe(closed: Position[]): number | null {
  if (closed.length < 5) return null;
  const returns = closed.map((p) => p.realizedPnlPct ?? 0);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const sd = Math.sqrt(variance);
  if (sd === 0) return null;
  const annualizationFactor = Math.sqrt(52);
  return (mean / sd) * annualizationFactor;
}

function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function computePerformanceMetrics(positions: Position[], journal: IdeaJournalEntry[]): PerformanceMetrics {
  const closed = positions.filter((p) => p.status === 'closed_win' || p.status === 'closed_loss' || p.status === 'closed_breakeven');
  const wins = closed.filter((p) => (p.realizedPnl ?? 0) > 0);
  const losses = closed.filter((p) => (p.realizedPnl ?? 0) < 0);
  const breakeven = closed.length - wins.length - losses.length;

  const totalPnl = closed.reduce((s, p) => s + (p.realizedPnl ?? 0), 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + (p.realizedPnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, p) => s + (p.realizedPnl ?? 0), 0) / losses.length : 0;
  const grossProfit = wins.reduce((s, p) => s + (p.realizedPnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + (p.realizedPnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
  const winRate = closed.length > 0 ? wins.length / closed.length : null;
  const expectancy = winRate !== null ? winRate * avgWin + (1 - winRate) * avgLoss : null;

  const bestTrade = closed.length > 0 ? Math.max(...closed.map((p) => p.realizedPnl ?? 0)) : 0;
  const worstTrade = closed.length > 0 ? Math.min(...closed.map((p) => p.realizedPnl ?? 0)) : 0;

  const sharpe = computeSharpe(closed);
  const equityCurve = computeEquityCurve(closed);
  const drawdown = computeMaxDrawdown(equityCurve);
  const streaks = computeStreak(closed);

  const monthlyMap = new Map<string, { pnl: number; trades: number }>();
  for (const p of closed) {
    const key = monthKey(p.closeDate ?? Date.now());
    const cur = monthlyMap.get(key) ?? { pnl: 0, trades: 0 };
    cur.pnl += p.realizedPnl ?? 0;
    cur.trades += 1;
    monthlyMap.set(key, cur);
  }
  const monthlyPnl = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const groupBy = (key: (p: Position) => string) => {
    const map = new Map<string, { pnl: number; trades: number; wins: number }>();
    for (const p of closed) {
      const k = key(p);
      const cur = map.get(k) ?? { pnl: 0, trades: 0, wins: 0 };
      cur.pnl += p.realizedPnl ?? 0;
      cur.trades += 1;
      if ((p.realizedPnl ?? 0) > 0) cur.wins += 1;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([k, data]) => ({
        key: k,
        pnl: data.pnl,
        trades: data.trades,
        winRate: data.trades > 0 ? data.wins / data.trades : null
      }))
      .sort((a, b) => b.pnl - a.pnl);
  };

  const byUnderlyingRaw = groupBy((p) => p.underlying);
  const byInstrumentTypeRaw = groupBy((p) => p.instrumentType);
  const byBrokerRaw = groupBy((p) => p.broker);

  const decisionMap = new Map<string, { positive: number; negative: number; neutral: number; pending: number }>();
  for (const e of journal) {
    const k = e.appDecision;
    const cur = decisionMap.get(k) ?? { positive: 0, negative: 0, neutral: 0, pending: 0 };
    const outcome = e.outcome7d ?? 'pending';
    if (outcome === 'positive') cur.positive++;
    else if (outcome === 'negative') cur.negative++;
    else if (outcome === 'neutral') cur.neutral++;
    else cur.pending++;
    decisionMap.set(k, cur);
  }
  const byAppDecision = Array.from(decisionMap.entries()).map(([decision, outcomes]) => ({ decision, outcomes }));

  const currency = closed[0]?.currency ?? 'EUR';

  return {
    totalTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winRatePct: winRate === null ? null : winRate * 100,
    totalRealizedPnl: totalPnl,
    avgWin,
    avgLoss,
    profitFactor,
    expectancyPerTrade: expectancy,
    bestTrade,
    worstTrade,
    sharpeRatio: sharpe,
    maxDrawdownPct: drawdown.pct,
    maxDrawdownAbsolute: drawdown.absolute,
    longestWinStreak: streaks.winStreak,
    longestLossStreak: streaks.lossStreak,
    equityCurve,
    monthlyPnl,
    byUnderlying: byUnderlyingRaw.map((r) => ({ underlying: r.key, pnl: r.pnl, trades: r.trades, winRate: r.winRate })),
    byInstrumentType: byInstrumentTypeRaw.map((r) => ({ type: r.key, pnl: r.pnl, trades: r.trades, winRate: r.winRate })),
    byBroker: byBrokerRaw.map((r) => ({ broker: r.key, pnl: r.pnl, trades: r.trades, winRate: r.winRate })),
    byAppDecision,
    currency
  };
}
