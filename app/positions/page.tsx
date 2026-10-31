import type { Metadata } from 'next';
import Link from 'next/link';
import { PositionsPanel } from '@/components/positions-panel';

export const metadata: Metadata = {
  title: 'Meine Käufe',
  description: 'Deine Käufe, Kaufpreise und Veränderungen im Blick behalten. Deine Angaben bleiben in diesem Browser.'
};
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
        ← zurück zu meinem Geld
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Meine Anlagen
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Meine Käufe</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Trage ein, was du gekauft hast. So behältst du Kaufpreis, Menge und spätere Verkäufe im Blick. Die App führt keine Käufe oder Verkäufe aus.
        </p>
      </header>

      <PositionsPanel latestPrices={latestPrices} quoteCurrency="USDT" />


    </main>
  );
}
