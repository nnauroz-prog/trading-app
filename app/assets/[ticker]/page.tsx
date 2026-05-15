import { notFound } from 'next/navigation';
import { mockAssets } from '@/lib/data/mock';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { getSnapshots } from '@/lib/providers';
import { fetchAssetHeadlines } from '@/lib/providers/sentiment';
import { HeadlinesList } from '@/components/headlines-list';

export default async function AssetDetail({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const asset = mockAssets.find((a) => a.ticker.toLowerCase() === ticker.toLowerCase() || a.id === ticker.toLowerCase());
  if (!asset) notFound();

  const [snapshots, analysis, headlines] = await Promise.all([
    getSnapshots(),
    runDailyAnalysis(),
    fetchAssetHeadlines(asset.id)
  ]);
  const snapshot = snapshots[asset.id];
  const recommendation = analysis.recommendations.find((r) => r.assetId === asset.id);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <h1 className="text-2xl font-bold">{asset.name} ({asset.ticker})</h1>
      <p className="text-slate-300">Kategorie: {asset.category} · Verfügbarkeit: {asset.venueAvailability.join(', ')}</p>
      {snapshot ? (
        <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-3">
          <p>Preis: {snapshot.price}</p>
          <p>24h: {snapshot.change24h.toFixed(2)}%</p>
          <p>7d: {snapshot.change7d.toFixed(2)}%</p>
          <p>30d: {snapshot.change30d.toFixed(2)}%</p>
          <p>Volumen: {snapshot.volume.toLocaleString()}</p>
          <p className="text-slate-400">Quelle: {snapshot.source}</p>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          Keine Preisdaten verfügbar.
        </p>
      )}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-semibold">Empfehlung</h2>
        <p>{recommendation?.action} · Confidence {recommendation?.confidence}/100 · Risiko {recommendation?.riskLevel}</p>
        <p className="mt-2 text-slate-300">{recommendation?.rationale}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>Einstiegszone: nur bei bestätigtem Pullback, gestaffelt.</li>
          <li>Stop-Loss-Idee: {recommendation?.stopLossIdea}</li>
          <li>Take-Profit-Zone: {recommendation?.takeProfitZone}</li>
          <li>Gegenargumente: {recommendation?.counterArguments.join(' | ')}</li>
        </ul>
      </section>
      <HeadlinesList headlines={headlines} />
    </main>
  );
}
