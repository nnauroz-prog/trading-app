import { notFound } from 'next/navigation';
import { mockAssets, mockSnapshots } from '@/lib/data/mock';
import { runDailyAnalysis } from '@/lib/analysis/engine';

export default async function AssetDetail({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const asset = mockAssets.find((a) => a.ticker.toLowerCase() === ticker.toLowerCase() || a.id === ticker.toLowerCase());
  if (!asset) notFound();
  const snapshot = mockSnapshots[asset.id];
  const recommendation = runDailyAnalysis().recommendations.find((r) => r.assetId === asset.id);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <h1 className="text-2xl font-bold">{asset.name} ({asset.ticker})</h1>
      <p className="text-slate-300">Kategorie: {asset.category} · Verfügbarkeit: {asset.venueAvailability.join(', ')}</p>
      <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-3">
        <p>Preis: {snapshot.price}</p><p>24h: {snapshot.change24h}%</p><p>7d: {snapshot.change7d}%</p>
        <p>30d: {snapshot.change30d}%</p><p>Volumen: {snapshot.volume.toLocaleString()}</p><p>Trend: positiv-neutral</p>
      </div>
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
    </main>
  );
}
