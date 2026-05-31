import { TickerSnapshot } from '@/lib/providers/binance-tickers';

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}

function fmtPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function pctColor(value: number): string {
  if (value > 0) return 'text-emerald-300';
  if (value < 0) return 'text-rose-300';
  return 'text-slate-300';
}

function pctArrow(value: number): string {
  if (value > 0) return '↗';
  if (value < 0) return '↘';
  return '→';
}

export function TickerBar({ tickers }: { tickers: TickerSnapshot[] }) {
  if (tickers.length === 0) return null;

  const featured = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  const featuredTickers = featured
    .map((s) => tickers.find((t) => t.binanceSymbol === s))
    .filter((t): t is TickerSnapshot => !!t);

  const movers = [...tickers]
    .filter((t) => !featured.includes(t.binanceSymbol))
    .sort((a, b) => Math.abs(b.priceChangePct) - Math.abs(a.priceChangePct))
    .slice(0, 4);

  const display = [...featuredTickers, ...movers];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3">
      <div className="flex items-center gap-1.5 pb-2 text-[10px] uppercase tracking-widest text-slate-500">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
        Live · {new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })}
        {display[0]?.source && <span className="ml-2 normal-case text-slate-600">· Quelle: {display[0].source === 'binance' ? 'Binance Spot' : 'Bybit Spot'}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {display.map((t) => {
          const symbol = t.symbol.replace('USDT', '');
          const isFeatured = featured.includes(t.binanceSymbol);
          return (
            <div
              key={t.symbol}
              className={`rounded-lg border px-2 py-1.5 ${isFeatured ? 'border-slate-700/60 bg-slate-900/60' : 'border-slate-800/60 bg-slate-950/40'}`}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="font-mono text-[11px] font-bold text-slate-200">{symbol}</span>
                <span className={`font-mono text-[10px] ${pctColor(t.priceChangePct)}`}>{pctArrow(t.priceChangePct)}</span>
              </div>
              <div className="font-mono text-xs font-semibold text-white">${fmtPrice(t.price)}</div>
              <div className={`font-mono text-[10px] ${pctColor(t.priceChangePct)}`}>{fmtPct(t.priceChangePct)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
