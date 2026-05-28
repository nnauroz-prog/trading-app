import Link from 'next/link';
import { TickerSnapshot } from '@/lib/providers/binance-tickers';
import { TOP_50 } from '@/lib/coin-universe';

function colorForPct(pct: number): { bg: string; text: string } {
  if (pct >= 10) return { bg: 'bg-emerald-600', text: 'text-white' };
  if (pct >= 5) return { bg: 'bg-emerald-700/80', text: 'text-emerald-50' };
  if (pct >= 2) return { bg: 'bg-emerald-800/70', text: 'text-emerald-100' };
  if (pct >= 0) return { bg: 'bg-emerald-900/50', text: 'text-emerald-200' };
  if (pct >= -2) return { bg: 'bg-rose-900/50', text: 'text-rose-200' };
  if (pct >= -5) return { bg: 'bg-rose-800/70', text: 'text-rose-100' };
  if (pct >= -10) return { bg: 'bg-rose-700/80', text: 'text-rose-50' };
  return { bg: 'bg-rose-600', text: 'text-white' };
}

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}

function sizeForVolume(quoteVolume: number, maxVolume: number): 'lg' | 'md' | 'sm' {
  const rel = quoteVolume / maxVolume;
  if (rel >= 0.5) return 'lg';
  if (rel >= 0.1) return 'md';
  return 'sm';
}

export function Heatmap({ tickers }: { tickers: TickerSnapshot[] }) {
  if (tickers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
        Keine Ticker-Daten verfügbar. Provider gerade nicht erreichbar.
      </div>
    );
  }

  const enriched = TOP_50.map((coin) => {
    const ticker = tickers.find((t) => t.binanceSymbol === coin.binanceSymbol);
    return { coin, ticker };
  }).filter((x): x is { coin: typeof TOP_50[0]; ticker: TickerSnapshot } => !!x.ticker);

  const maxVolume = Math.max(...enriched.map((x) => x.ticker.quoteVolume), 1);
  const sorted = [...enriched].sort((a, b) => b.ticker.quoteVolume - a.ticker.quoteVolume);

  const movers = [...enriched].sort((a, b) => Math.abs(b.ticker.priceChangePct) - Math.abs(a.ticker.priceChangePct)).slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {movers.map((m) => {
          const c = colorForPct(m.ticker.priceChangePct);
          return (
            <Link
              key={m.coin.id}
              href={`/assets/${m.coin.symbol.toLowerCase()}`}
              className={`rounded-lg border border-slate-700/40 ${c.bg} p-2.5 transition hover:scale-[1.02]`}
            >
              <div className={`font-mono text-xs font-bold ${c.text}`}>{m.coin.symbol}</div>
              <div className={`font-mono text-lg font-bold ${c.text}`}>
                {m.ticker.priceChangePct > 0 ? '+' : ''}{m.ticker.priceChangePct.toFixed(1)}%
              </div>
              <div className={`font-mono text-[10px] ${c.text} opacity-80`}>${fmtPrice(m.ticker.price)}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10">
        {sorted.map((x) => {
          const c = colorForPct(x.ticker.priceChangePct);
          const size = sizeForVolume(x.ticker.quoteVolume, maxVolume);
          const minH = size === 'lg' ? 'min-h-[68px]' : size === 'md' ? 'min-h-[56px]' : 'min-h-[44px]';
          return (
            <Link
              key={x.coin.id}
              href={`/assets/${x.coin.symbol.toLowerCase()}`}
              className={`flex flex-col justify-center rounded-md border border-slate-800/40 ${c.bg} ${minH} p-1.5 transition hover:border-slate-600/60 hover:scale-[1.03]`}
            >
              <div className={`font-mono text-[10px] font-bold ${c.text} truncate`}>{x.coin.symbol}</div>
              <div className={`font-mono text-xs font-bold ${c.text}`}>
                {x.ticker.priceChangePct > 0 ? '+' : ''}{x.ticker.priceChangePct.toFixed(1)}%
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[9px]">
        <span className="text-slate-500">Skala:</span>
        {[-10, -5, -2, 0, 2, 5, 10].map((v) => {
          const c = colorForPct(v);
          return (
            <span key={v} className={`rounded ${c.bg} ${c.text} px-1.5 py-0.5 font-mono`}>
              {v > 0 ? `+${v}%` : `${v}%`}
            </span>
          );
        })}
        <span className="ml-auto font-mono text-slate-500">Größe ∝ Volumen · {enriched.length} Coins</span>
      </div>
    </div>
  );
}
