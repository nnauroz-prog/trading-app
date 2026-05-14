import Link from 'next/link';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { ReportCard } from '@/components/report-card';
import { mockAssets } from '@/lib/data/mock';

export default async function HomePage() {
  const report = await runDailyAnalysis();
  const cryptoIds = new Set(mockAssets.filter((a) => a.category === 'crypto').map((a) => a.id));
  const stockIds = new Set(mockAssets.filter((a) => a.category === 'stock').map((a) => a.id));
  const crypto = report.recommendations.filter((r) => cryptoIds.has(r.assetId));
  const stocks = report.recommendations.filter((r) => stockIds.has(r.assetId));

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
          {mockAssets.map((asset) => (
            <Link key={asset.id} href={`/assets/${asset.ticker.toLowerCase()}`} className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700">
              {asset.ticker}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
