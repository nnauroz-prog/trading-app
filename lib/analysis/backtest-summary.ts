import { unstable_cache } from 'next/cache';
import { runStrategyBacktest } from '@/lib/analysis/strategy-backtest';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';

export interface AssetEdge {
  winRatePct: number | null;
  expectancyPct: number;
  safeEquityCurve: number[]; // cumulative net % of this coin's safe-tier trades
}

export type StrategyHealth = 'good' | 'ok' | 'poor';

export interface TierStat {
  trades: number;
  winRatePct: number;
  netReturnPct: number;
  medianHoldHours: number | null;
  equityCurve: number[]; // cumulative net % return after each safe trade
  maxDrawdownPct: number; // largest peak-to-trough drop in the curve (<=0)
  tradeSharpe: number | null; // per-trade mean/stdev of net returns
  profitFactor: number | null; // gross wins / gross losses (>=0)
  avgWinPct: number | null; // average % return of winning trades
  avgLossPct: number | null; // average % return of losing trades (<=0)
  bestTradePct: number | null;
  worstTradePct: number | null;
  health: StrategyHealth;
  currentStreak: { kind: 'win' | 'loss' | null; count: number };
}

export interface BacktestSummary {
  available: boolean;
  trades: number;
  winRatePct: number | null;
  netReturnPct: number;
  periodDays: number;
  perAssetEdge: Record<string, AssetEdge>;
  safeTier: TierStat | null;
  btcHodlReturnPct: number | null; // BTC buy-and-hold return over the period (benchmark)
}

const UNAVAILABLE: BacktestSummary = { available: false, trades: 0, winRatePct: null, netReturnPct: 0, periodDays: 0, perAssetEdge: {}, safeTier: null, btcHodlReturnPct: null };

// Confluence threshold (within the backtest's own 12-check grid) that mirrors
// the "safe" tier shown live (>=9/12).
const SAFE_TIER_CONFLUENCE = 9;

async function compute(): Promise<BacktestSummary> {
  try {
    const r = await runStrategyBacktest(['btc', 'eth', 'sol']);
    if (r.dataSource === 'offline' || r.combined.totalSignals === 0) return UNAVAILABLE;
    const perAssetEdge: Record<string, AssetEdge> = {};
    for (const a of r.perAsset) {
      const safeAssetTrades = a.trades
        .filter((t) => t.confluence >= SAFE_TIER_CONFLUENCE)
        .sort((x, y) => x.entryTime - y.entryTime);
      let coinEq = 0;
      const safeEquityCurve: number[] = [0];
      for (const t of safeAssetTrades) {
        coinEq += t.netPnlPct;
        safeEquityCurve.push(coinEq);
      }
      perAssetEdge[a.assetId] = {
        winRatePct: a.winRate !== null ? Math.round(a.winRate * 100) : null,
        expectancyPct: a.expectancyPct,
        safeEquityCurve
      };
    }

    const safeTrades = r.perAsset
      .flatMap((a) => a.trades)
      .filter((t) => t.confluence >= SAFE_TIER_CONFLUENCE)
      .sort((a, b) => a.entryTime - b.entryTime);
    const safeWins = safeTrades.filter((t) => t.outcome === 'TP1').length;
    const holdBarsSorted = safeTrades.map((t) => t.holdBars).sort((a, b) => a - b);
    const medianHoldHours = holdBarsSorted.length > 0 ? holdBarsSorted[Math.floor(holdBarsSorted.length / 2)] : null;
    let eq = 0;
    const equityCurve: number[] = [0];
    for (const t of safeTrades) {
      eq += t.netPnlPct;
      equityCurve.push(eq);
    }
    let peak = -Infinity;
    let maxDrawdownPct = 0;
    for (const v of equityCurve) {
      if (v > peak) peak = v;
      const dd = v - peak;
      if (dd < maxDrawdownPct) maxDrawdownPct = dd;
    }
    let tradeSharpe: number | null = null;
    if (safeTrades.length >= 2) {
      const returns = safeTrades.map((t) => t.netPnlPct);
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + (r - mean) * (r - mean), 0) / (returns.length - 1);
      const stdev = Math.sqrt(variance);
      tradeSharpe = stdev > 0 ? mean / stdev : null;
    }
    const winners = safeTrades.filter((t) => t.netPnlPct > 0);
    const losers = safeTrades.filter((t) => t.netPnlPct < 0);
    const grossWin = winners.reduce((s, t) => s + t.netPnlPct, 0);
    const grossLoss = -losers.reduce((s, t) => s + t.netPnlPct, 0);
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;
    const avgWinPct = winners.length > 0 ? grossWin / winners.length : null;
    const avgLossPct = losers.length > 0 ? -grossLoss / losers.length : null;
    const returnValues = safeTrades.map((t) => t.netPnlPct);
    const bestTradePct = returnValues.length > 0 ? Math.max(...returnValues) : null;
    const worstTradePct = returnValues.length > 0 ? Math.min(...returnValues) : null;
    // Composite health: green when Sharpe + profit-factor + net all healthy,
    // amber when at least breaking even, red otherwise. Single at-a-glance signal.
    let health: StrategyHealth;
    if ((tradeSharpe ?? 0) >= 0.5 && (profitFactor ?? 0) >= 1.5 && eq >= 0) {
      health = 'good';
    } else if ((tradeSharpe ?? 0) >= 0 && (profitFactor ?? 0) >= 1 && eq >= 0) {
      health = 'ok';
    } else {
      health = 'poor';
    }
    // Current streak: walk backwards through chronological trades, count
    // consecutive same-outcome (TP1 = win, anything else = loss).
    let streakKind: 'win' | 'loss' | null = null;
    let streakCount = 0;
    for (let i = safeTrades.length - 1; i >= 0; i--) {
      const isWin = safeTrades[i].outcome === 'TP1';
      const kind = isWin ? 'win' : 'loss';
      if (streakKind === null) {
        streakKind = kind;
        streakCount = 1;
      } else if (streakKind === kind) {
        streakCount++;
      } else {
        break;
      }
    }
    const safeTier: TierStat | null =
      safeTrades.length > 0
        ? {
            trades: safeTrades.length,
            winRatePct: Math.round((safeWins / safeTrades.length) * 100),
            netReturnPct: eq,
            medianHoldHours,
            equityCurve,
            maxDrawdownPct,
            tradeSharpe,
            profitFactor,
            avgWinPct,
            avgLossPct,
            bestTradePct,
            worstTradePct,
            health,
            currentStreak: { kind: streakKind, count: streakCount }
          }
        : null;

    // BTC buy-and-hold over (roughly) the backtest period — the honest benchmark
    // an active strategy has to beat to justify its existence.
    let btcHodlReturnPct: number | null = null;
    try {
      const btcDailies = await fetchKlinesBySymbol('BTCUSDT', '1d', Math.max(30, Math.min(300, r.periodDays || 250)));
      if (btcDailies && btcDailies.length >= 2) {
        const first = btcDailies[0].close;
        const last = btcDailies[btcDailies.length - 1].close;
        if (first > 0) btcHodlReturnPct = ((last - first) / first) * 100;
      }
    } catch {
      btcHodlReturnPct = null;
    }

    return {
      available: true,
      trades: r.combined.totalSignals,
      winRatePct: r.combined.winRate !== null ? Math.round(r.combined.winRate * 100) : null,
      netReturnPct: r.combined.netReturnPct,
      periodDays: r.periodDays,
      perAssetEdge,
      safeTier,
      btcHodlReturnPct
    };
  } catch {
    return UNAVAILABLE;
  }
}

// The backtest is heavy (thousands of candles) and only changes as new history
// accrues, so cache it for 30 minutes rather than recomputing on every render.
export const getBacktestSummary = unstable_cache(compute, ['backtest-summary-v4'], { revalidate: 1800 });
