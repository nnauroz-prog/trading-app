import Link from 'next/link';
import { Heatmap } from '@/components/heatmap';
import { fetchAllTickers } from '@/lib/providers/binance-tickers';

export const dynamic = 'force-dynamic';

export default async function HeatmapPage() {
  const tickers = await fetchAllTickers();
  const list = tickers ? Array.from(tickers.values()) : [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Market Heatmap
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Markt auf einen Blick</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          50-Coin-Universum, sortiert nach 24h-Quote-Volume. Farbe = 24h-Veränderung (grün bullish, rot bearish, Helligkeit = Stärke). Größe der Kachel ∝ Volume. Top 5 Mover separat oben hervorgehoben.
        </p>
      </header>

      <Heatmap tickers={list} />
    </main>
  );
}
