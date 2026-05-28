import Link from 'next/link';
import { WatchlistPanel } from '@/components/watchlist-panel';
import { PriceAlertsPanel } from '@/components/price-alerts-panel';
import { fetchAllTickers } from '@/lib/providers/binance-tickers';
import { TOP_50 } from '@/lib/coin-universe';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const tickers = await fetchAllTickers();
  const prices: Record<string, number | null> = {};
  const changes: Record<string, number | null> = {};
  if (tickers) {
    for (const coin of TOP_50) {
      const t = tickers.get(coin.binanceSymbol);
      prices[coin.id] = t ? t.price : null;
      changes[coin.id] = t ? t.priceChangePct : null;
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-6 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Watchlist
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Beobachtete Coins</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Deine kuratierte Liste mit Live-Kursen und Notizen. Lokal gespeichert. Tippen öffnet die Chart-Detailseite mit voller Indikator-Analyse.
        </p>
      </header>

      <WatchlistPanel prices={prices} changes={changes} />

      <PriceAlertsPanel prices={prices} />
    </main>
  );
}
