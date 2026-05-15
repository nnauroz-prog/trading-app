import { TopPlay, TopPlayReport } from '@/lib/analysis/top-play-engine';

export type EventKind =
  | 'volume_spike'
  | 'rsi_oversold'
  | 'rsi_overbought'
  | 'macd_cross'
  | 'macd_approaching'
  | 'breakout_up'
  | 'breakdown'
  | 'higher_lows'
  | 'top_mover';

export interface FeedEvent {
  id: string;
  kind: EventKind;
  symbol: string;
  title: string;
  detail: string;
  timestamp: string;
  severity: 'info' | 'note' | 'alert';
  changePct?: number;
}

function fmtPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function buildEventFeed(report: TopPlayReport): FeedEvent[] {
  const events: FeedEvent[] = [];
  const now = new Date();
  const tIso = now.toISOString();

  const topMovers = [...report.tickers].sort((a, b) => Math.abs(b.priceChangePct) - Math.abs(a.priceChangePct)).slice(0, 3);
  for (const t of topMovers) {
    events.push({
      id: `mover-${t.symbol}`,
      kind: 'top_mover',
      symbol: t.symbol.replace('USDT', ''),
      title: `${t.symbol.replace('USDT', '')} bewegt sich stark`,
      detail: `${fmtPct(t.priceChangePct)} in 24h · Quote-Volume $${(t.quoteVolume / 1_000_000).toFixed(1)}M`,
      timestamp: tIso,
      severity: Math.abs(t.priceChangePct) > 10 ? 'alert' : 'note',
      changePct: t.priceChangePct
    });
  }

  const considered = [report.topPlay, ...report.alternates].filter((p): p is TopPlay => p !== null);
  for (const play of considered) {
    if (play.indicators.volumeRatio >= 2) {
      events.push({
        id: `vol-${play.coin.id}`,
        kind: 'volume_spike',
        symbol: play.coin.symbol,
        title: `${play.coin.symbol} Volume-Spike`,
        detail: `+${((play.indicators.volumeRatio - 1) * 100).toFixed(0)}% über 20-Bar-Average — frisches Interesse`,
        timestamp: tIso,
        severity: 'alert'
      });
    }
    if (play.indicators.macdState === 'bullish_cross') {
      events.push({
        id: `macd-${play.coin.id}`,
        kind: 'macd_cross',
        symbol: play.coin.symbol,
        title: `${play.coin.symbol} MACD bullish cross`,
        detail: `1h-Histogramm gerade von negativ auf positiv gedreht — Momentum-Wechsel`,
        timestamp: tIso,
        severity: 'alert'
      });
    } else if (play.indicators.macdHist !== 0 && Math.abs(play.indicators.macdHist) < 0.0001 * play.entry) {
      events.push({
        id: `macda-${play.coin.id}`,
        kind: 'macd_approaching',
        symbol: play.coin.symbol,
        title: `${play.coin.symbol} MACD nähert sich Cross`,
        detail: `Histogramm sehr nah an Zero-Line — möglicher Trigger im nächsten Bar`,
        timestamp: tIso,
        severity: 'note'
      });
    }
    if (play.indicators.rsi < 30) {
      events.push({
        id: `rsi-os-${play.coin.id}`,
        kind: 'rsi_oversold',
        symbol: play.coin.symbol,
        title: `${play.coin.symbol} RSI oversold`,
        detail: `RSI(1h) bei ${play.indicators.rsi.toFixed(0)} — historisch häufig Bounce-Zone, aber Vorsicht in starken Down-Trends`,
        timestamp: tIso,
        severity: 'note'
      });
    }
    if (play.indicators.rsi > 75) {
      events.push({
        id: `rsi-ob-${play.coin.id}`,
        kind: 'rsi_overbought',
        symbol: play.coin.symbol,
        title: `${play.coin.symbol} RSI overbought`,
        detail: `RSI(1h) bei ${play.indicators.rsi.toFixed(0)} — riskant für neue Long-Einstiege, eher Profit-Taking-Zone`,
        timestamp: tIso,
        severity: 'note'
      });
    }
    if (play.indicators.higherLows && play.indicators.trend4hUp) {
      events.push({
        id: `hl-${play.coin.id}`,
        kind: 'higher_lows',
        symbol: play.coin.symbol,
        title: `${play.coin.symbol} bildet Higher Lows`,
        detail: `1h-Tiefs steigen + 4h-Trend up — strukturell bullisch`,
        timestamp: tIso,
        severity: 'info'
      });
    }
  }

  return events
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .sort((a, b) => {
      const sev = { alert: 0, note: 1, info: 2 } as const;
      return sev[a.severity] - sev[b.severity];
    })
    .slice(0, 10);
}
