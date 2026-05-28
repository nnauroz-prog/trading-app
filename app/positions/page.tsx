import Link from 'next/link';
import { PositionsPanel } from '@/components/positions-panel';
import { fetchAllTickers } from '@/lib/providers/binance-tickers';

export const dynamic = 'force-dynamic';

export default async function PositionsPage() {
  const tickers = await fetchAllTickers();
  const latestPrices: Record<string, number | null> = {};
  if (tickers) {
    for (const [symbol, t] of tickers.entries()) {
      const key = symbol.replace('USDT', '').toLowerCase();
      latestPrices[key] = t.price;
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
          My Positions
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Positionen verwalten</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Erfasse hier alle echten Käufe — Crypto auf Coinbase, Aktien/Optionsscheine auf Scalable oder Trade Republic. Live-PnL für Crypto via Bybit Spot. Für Aktien/Hebelprodukte den Exit-Preis manuell setzen, dann wird der realisierte Gewinn/Verlust berechnet.
        </p>
      </header>

      <PositionsPanel latestPrices={latestPrices} />
    </main>
  );
}
