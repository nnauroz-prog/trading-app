import { SafeTradeRecord } from '@/lib/analysis/backtest-summary';

export interface SetupSimilarity {
  coinId: string;
  ticker: string;
  currentConfluence: number;
  matchCount: number;
  tp1Hits: number;
  slHits: number;
  timeouts: number;
  hitRatePct: number | null; // share of matches that hit TP1
  avgWinPct: number | null;
  avgLossPct: number | null;
  expectancyPct: number | null;
  // Honest sample-size flag — < 5 matches is not yet a reliable read.
  sampleSize: 'too_small' | 'small' | 'ok' | 'good';
  oneLineVerdict: string;
}

// "Similar" = same coin, confluence within ±1 of the live setup. Tight enough
// to actually compare, loose enough to gather a meaningful sample.
export function computeSetupSimilarity(
  safeTrades: SafeTradeRecord[],
  target: { coinId: string; ticker: string; passedCount: number } | null
): SetupSimilarity | null {
  if (!target) return null;

  const matches = safeTrades.filter((t) =>
    t.assetId === target.coinId &&
    Math.abs(t.confluence - target.passedCount) <= 1
  );

  const tp1Hits = matches.filter((t) => t.outcome === 'TP1').length;
  const slHits = matches.filter((t) => t.outcome === 'SL').length;
  const timeouts = matches.filter((t) => t.outcome === 'TIMEOUT').length;
  const wins = matches.filter((t) => t.netPnlPct > 0);
  const losses = matches.filter((t) => t.netPnlPct <= 0);
  const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.netPnlPct, 0) / wins.length : null;
  const avgLoss = losses.length > 0 ? losses.reduce((a, t) => a + t.netPnlPct, 0) / losses.length : null;
  const hitRate = matches.length > 0 ? tp1Hits / matches.length : null;
  const expectancy = matches.length > 0
    ? matches.reduce((a, t) => a + t.netPnlPct, 0) / matches.length
    : null;

  const sampleSize: SetupSimilarity['sampleSize'] =
    matches.length === 0 ? 'too_small' :
    matches.length < 5 ? 'small' :
    matches.length < 10 ? 'ok' :
    'good';

  let oneLineVerdict: string;
  if (matches.length === 0) {
    oneLineVerdict = `Keine vergleichbaren ${target.ticker}-Setups in den letzten Backtest-Tagen gefunden.`;
  } else if (sampleSize === 'small') {
    oneLineVerdict = `Nur ${matches.length} vergleichbare ${target.ticker}-Setups (${tp1Hits} Ziel · ${slHits} Stop) — Stichprobe zu klein für eine harte Aussage.`;
  } else if (hitRate !== null && hitRate >= 0.6 && expectancy !== null && expectancy > 0) {
    oneLineVerdict = `${matches.length} vergleichbare ${target.ticker}-Setups historisch: ${tp1Hits} ins Ziel, ${slHits} ausgestoppt — ${Math.round(hitRate * 100)}% Trefferquote, Erwartungswert +${expectancy.toFixed(1)}%.`;
  } else if (hitRate !== null && hitRate >= 0.4) {
    oneLineVerdict = `${matches.length} vergleichbare ${target.ticker}-Setups: ${Math.round(hitRate * 100)}% Trefferquote, Erwartungswert ${expectancy !== null ? (expectancy >= 0 ? '+' : '') + expectancy.toFixed(1) + '%' : '?'} — gemischt.`;
  } else {
    oneLineVerdict = `${matches.length} vergleichbare ${target.ticker}-Setups: nur ${hitRate !== null ? Math.round(hitRate * 100) : 0}% gingen ins Ziel — Vorsicht, historisch eher schwach.`;
  }

  return {
    coinId: target.coinId,
    ticker: target.ticker,
    currentConfluence: target.passedCount,
    matchCount: matches.length,
    tp1Hits,
    slHits,
    timeouts,
    hitRatePct: hitRate !== null ? Math.round(hitRate * 1000) / 10 : null,
    avgWinPct: avgWin !== null ? Math.round(avgWin * 10) / 10 : null,
    avgLossPct: avgLoss !== null ? Math.round(avgLoss * 10) / 10 : null,
    expectancyPct: expectancy !== null ? Math.round(expectancy * 10) / 10 : null,
    sampleSize,
    oneLineVerdict
  };
}
