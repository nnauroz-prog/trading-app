import Link from 'next/link';
import { DcaPanel } from '@/components/dca-panel';
import { fetchAllTickers } from '@/lib/providers/binance-tickers';

export const dynamic = 'force-dynamic';

export default async function DcaPage() {
  const tickers = await fetchAllTickers();
  const latestPrices: Record<string, number | null> = {};
  if (tickers) {
    const { TOP_50 } = await import('@/lib/coin-universe');
    for (const coin of TOP_50) {
      const t = tickers.get(coin.binanceSymbol);
      if (t) latestPrices[coin.id] = t.price;
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
          DCA Sparplan
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Systematisch akkumulieren</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Der ruhige Gegenpol zum taktischen Trading: regelmäßig feste Beträge in Majors (BTC/ETH/...), egal wie der Markt steht. Über Zeit glättet das den Einstiegskurs und nimmt Timing-Stress raus. Cost-Basis, aktueller Wert und ein Vergleich gegen Einmal-Invest werden getrackt.
        </p>
      </header>

      <DcaPanel latestPrices={latestPrices} />
    </main>
  );
}
