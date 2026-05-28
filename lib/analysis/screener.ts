import { buildChecks } from '@/lib/analysis/master-signal-engine';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';
import { fetchAllTickers, TickerSnapshot } from '@/lib/providers/binance-tickers';
import { TOP_50, UniverseCoin } from '@/lib/coin-universe';

const TRADE_THRESHOLD = 7;

export interface ScreenerRow {
  coinId: string;
  symbol: string;
  name: string;
  price: number;
  change24hPct: number;
  confluence: number;
  totalChecks: number;
  tradeable: boolean;
  rsi1h: string;
  macdState: string;
  trend1h: boolean;
  trend4h: boolean;
  trend1d: boolean;
  volumeOk: boolean;
  regime: 'bull' | 'bear' | 'sideways';
}

export interface ScreenerReport {
  rows: ScreenerRow[];
  analyzedCount: number;
  tradeableCount: number;
  generatedAt: string;
  dataSource: 'binance' | 'offline';
}

async function screenCoin(coin: UniverseCoin, ticker: TickerSnapshot): Promise<ScreenerRow | null> {
  const [c1h, c4h, c1d] = await Promise.all([
    fetchKlinesBySymbol(coin.binanceSymbol, '1h', 100),
    fetchKlinesBySymbol(coin.binanceSymbol, '4h', 80),
    fetchKlinesBySymbol(coin.binanceSymbol, '1d', 250)
  ]);
  if (!c1h || c1h.length < 50 || !c4h || c4h.length < 50 || !c1d || c1d.length < 30) return null;

  const { checks, marketRegime } = buildChecks(c1h, c4h, c1d);
  const passed = checks.filter((c) => c.passed).length;
  const byId = (id: string) => checks.find((c) => c.id === id);

  return {
    coinId: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    price: ticker.price,
    change24hPct: ticker.priceChangePct,
    confluence: passed,
    totalChecks: checks.length,
    tradeable: passed >= TRADE_THRESHOLD,
    rsi1h: byId('rsi_1h_recovery')?.value ?? '—',
    macdState: byId('macd_1h_bullish')?.value ?? '—',
    trend1h: byId('trend_1h')?.passed ?? false,
    trend4h: byId('trend_4h')?.passed ?? false,
    trend1d: byId('trend_1d')?.passed ?? false,
    volumeOk: byId('volume_spike')?.passed ?? false,
    regime: marketRegime
  };
}

export async function runScreener(deepAnalyzeCount = 18): Promise<ScreenerReport> {
  const tickerMap = await fetchAllTickers();
  if (!tickerMap) {
    return { rows: [], analyzedCount: 0, tradeableCount: 0, generatedAt: new Date().toISOString(), dataSource: 'offline' };
  }

  const withTickers = TOP_50
    .map((c) => ({ coin: c, ticker: tickerMap.get(c.binanceSymbol) }))
    .filter((x): x is { coin: UniverseCoin; ticker: TickerSnapshot } => !!x.ticker);

  const candidates = withTickers
    .map((x) => ({ ...x, interest: Math.abs(x.ticker.priceChangePct) + Math.log10(Math.max(x.ticker.quoteVolume, 1)) * 0.6 }))
    .sort((a, b) => b.interest - a.interest)
    .slice(0, deepAnalyzeCount);

  const rows = (await Promise.all(candidates.map((x) => screenCoin(x.coin, x.ticker))))
    .filter((r): r is ScreenerRow => r !== null)
    .sort((a, b) => b.confluence - a.confluence || b.change24hPct - a.change24hPct);

  return {
    rows,
    analyzedCount: rows.length,
    tradeableCount: rows.filter((r) => r.tradeable).length,
    generatedAt: new Date().toISOString(),
    dataSource: 'binance'
  };
}
