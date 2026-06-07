// Walk-Forward-Backtest: testet auf historischen Tageskerzen, wie oft das
// 8-Punkt-Sicherheits-Gate auf „Grade A" ging und welche Performance ein
// Einstieg an dem Tag gebracht hätte. Reine Funktion, keine Fetches.
//
// Strategie:
//   • Iteriere ab Tag 200 (genug Historie für MA200) über alle Tage.
//   • Bewerte Grade an jedem Tag mit der dann verfügbaren Historie.
//   • Wenn Wechsel von Nicht-A → A: virtueller Einstieg zum Closing-Preis.
//   • Halten so lange Grade A hält; Exit am ersten Tag mit Grade != A.
//   • PnL = (Exit-Preis − Entry-Preis) / Entry-Preis × 100.

import type { PriceCandle } from '@/lib/market/yahoo-history';
import { evaluateInstrumentSafety } from '@/lib/market/instrument-safety';

export interface SafetyTrade {
  entryTime: number;
  exitTime: number;
  entry: number;
  exit: number;
  holdDays: number;
  pnlPct: number;
}

export interface SafetyBacktestResult {
  trades: SafetyTrade[];
  totalTrades: number;
  winRatePct: number | null; // % Trefferquote (PnL ≥ 0)
  avgPnlPct: number;
  medianHoldDays: number | null;
  totalReturnPct: number;     // kumulierter Return aller Trades
  bestTradePct: number | null;
  worstTradePct: number | null;
  buyAndHoldReturnPct: number; // Vergleichs-Benchmark: 1J einfach halten
}

const EMPTY_RESULT: SafetyBacktestResult = {
  trades: [],
  totalTrades: 0,
  winRatePct: null,
  avgPnlPct: 0,
  medianHoldDays: null,
  totalReturnPct: 0,
  bestTradePct: null,
  worstTradePct: null,
  buyAndHoldReturnPct: 0
};

export function backtestSafetyStrategy(candles: PriceCandle[]): SafetyBacktestResult {
  if (candles.length < 220) return EMPTY_RESULT;

  const trades: SafetyTrade[] = [];
  let inPosition = false;
  let entryIndex = -1;

  // Brauche mindestens 200 Tage Historie pro Bewertung für MA200.
  for (let i = 200; i < candles.length; i++) {
    const window = candles.slice(0, i + 1);
    const today = window[window.length - 1];
    const safety = evaluateInstrumentSafety({ price: today.close, candles: window });

    if (!inPosition && safety.grade === 'A') {
      inPosition = true;
      entryIndex = i;
    } else if (inPosition && safety.grade !== 'A') {
      // Exit am Tag, an dem Grade A bricht.
      const entry = candles[entryIndex];
      const exit = today;
      const pnlPct = entry.close > 0 ? ((exit.close - entry.close) / entry.close) * 100 : 0;
      trades.push({
        entryTime: entry.time,
        exitTime: exit.time,
        entry: entry.close,
        exit: exit.close,
        holdDays: i - entryIndex,
        pnlPct
      });
      inPosition = false;
      entryIndex = -1;
    }
  }

  // Offener Trade am letzten Tag wird zum Marktpreis geschlossen.
  if (inPosition && entryIndex >= 0) {
    const entry = candles[entryIndex];
    const exit = candles[candles.length - 1];
    const pnlPct = entry.close > 0 ? ((exit.close - entry.close) / entry.close) * 100 : 0;
    trades.push({
      entryTime: entry.time,
      exitTime: exit.time,
      entry: entry.close,
      exit: exit.close,
      holdDays: candles.length - 1 - entryIndex,
      pnlPct
    });
  }

  if (trades.length === 0) {
    const first = candles[0].close;
    const last = candles[candles.length - 1].close;
    return {
      ...EMPTY_RESULT,
      buyAndHoldReturnPct: first > 0 ? ((last - first) / first) * 100 : 0
    };
  }

  const wins = trades.filter((t) => t.pnlPct >= 0).length;
  const sumPnl = trades.reduce((s, t) => s + t.pnlPct, 0);
  const avgPnl = sumPnl / trades.length;
  const holdSorted = [...trades.map((t) => t.holdDays)].sort((a, b) => a - b);
  const medianHold = holdSorted[Math.floor(holdSorted.length / 2)] ?? null;
  const pnlValues = trades.map((t) => t.pnlPct);
  const bestPnl = Math.max(...pnlValues);
  const worstPnl = Math.min(...pnlValues);

  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  const buyAndHold = first > 0 ? ((last - first) / first) * 100 : 0;

  return {
    trades,
    totalTrades: trades.length,
    winRatePct: Math.round((wins / trades.length) * 100),
    avgPnlPct: avgPnl,
    medianHoldDays: medianHold,
    totalReturnPct: sumPnl,
    bestTradePct: bestPnl,
    worstTradePct: worstPnl,
    buyAndHoldReturnPct: buyAndHold
  };
}
