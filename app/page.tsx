import Link from 'next/link';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { ReportCard } from '@/components/report-card';

export default function HomePage() {
  const report = runDailyAnalysis();
  const crypto = report.recommendations.filter((r) => ['btc', 'eth', 'sol'].includes(r.assetId));
  const stocks = report.recommendations.filter((r) => ['nvda', 'sap', 'msft'].includes(r.assetId));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold">MARKTBERICHT – {report.date}</h1>
        <p className="mt-2 text-slate-300">{report.marketMood}</p>
        <p className="mt-2 text-xs text-slate-400">Analyse- und Entscheidungsunterstützungssystem. Keine Finanzberatung, keine Gewinn-Garantie.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <ReportCard title="Top-Krypto" rows={crypto} />
        <ReportCard title="Top-Aktien" rows={stocks} />
      </div>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">Watchlist</h2>
        <div className="flex flex-wrap gap-2">
          {['BTC', 'ETH', 'SOL', 'XRP', 'NVDA', 'AAPL', 'MSFT', 'SAP', 'SIE', 'ALV'].map((ticker) => (
            <Link key={ticker} href={`/assets/${ticker.toLowerCase()}`} className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700">
              {ticker}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
