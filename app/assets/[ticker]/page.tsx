import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockAssets, binanceSymbolByAssetId } from '@/lib/data/mock';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { getSnapshots } from '@/lib/providers';
import { fetchAssetHeadlines } from '@/lib/providers/sentiment';
import { fetchCandles } from '@/lib/providers/binance';
import { HeadlinesList } from '@/components/headlines-list';
import { PriceChart } from '@/components/price-chart';

export const dynamic = 'force-dynamic';

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function fmtPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function pctColor(value: number): string {
  if (value > 0.5) return 'text-emerald-300';
  if (value < -0.5) return 'text-rose-300';
  return 'text-slate-300';
}

function pctBg(value: number): string {
  if (value > 0.5) return 'border-emerald-500/30 bg-emerald-500/5';
  if (value < -0.5) return 'border-rose-500/30 bg-rose-500/5';
  return 'border-slate-700 bg-slate-900/40';
}

const actionColor: Record<string, string> = {
  BUY: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  WATCH: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  HOLD: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  AVOID: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  SELL: 'border-rose-500/40 bg-rose-500/10 text-rose-300'
};

export default async function AssetDetail({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const asset = mockAssets.find(
    (a) => a.ticker.toLowerCase() === ticker.toLowerCase() || a.id === ticker.toLowerCase()
  );
  if (!asset) notFound();

  const hasBinance = !!binanceSymbolByAssetId[asset.id];
  const [snapshots, analysis, headlines, candles] = await Promise.all([
    getSnapshots(),
    runDailyAnalysis(),
    fetchAssetHeadlines(asset.id),
    hasBinance ? fetchCandles(asset.id, '1h', 200) : Promise.resolve(null)
  ]);
  const snapshot = snapshots[asset.id];
  const recommendation = analysis.recommendations.find((r) => r.assetId === asset.id);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
          <span>{asset.category}</span>
          <span className="text-slate-700">·</span>
          <span>{asset.venueAvailability.join(' · ')}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {asset.name} <span className="font-mono text-slate-500">({asset.ticker})</span>
        </h1>
      </header>

      {snapshot ? (
        <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 to-slate-900/40 p-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Aktuell</div>
              <div className="mt-1 font-mono text-4xl font-bold text-white">${fmtPrice(snapshot.price)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Quelle</div>
              <div className="mt-1 font-mono text-xs uppercase tracking-wider text-slate-400">{snapshot.source}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-lg border p-3 ${pctBg(snapshot.change24h)}`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">24h</div>
              <div className={`mt-1 font-mono text-lg font-bold ${pctColor(snapshot.change24h)}`}>{fmtPct(snapshot.change24h)}</div>
            </div>
            <div className={`rounded-lg border p-3 ${pctBg(snapshot.change7d)}`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">7 Tage</div>
              <div className={`mt-1 font-mono text-lg font-bold ${pctColor(snapshot.change7d)}`}>{fmtPct(snapshot.change7d)}</div>
            </div>
            <div className={`rounded-lg border p-3 ${pctBg(snapshot.change30d)}`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">30 Tage</div>
              <div className={`mt-1 font-mono text-lg font-bold ${pctColor(snapshot.change30d)}`}>{fmtPct(snapshot.change30d)}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Volume</div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-100">
                {snapshot.volume >= 1_000_000_000 ? `$${(snapshot.volume / 1_000_000_000).toFixed(1)}B` :
                 snapshot.volume >= 1_000_000 ? `$${(snapshot.volume / 1_000_000).toFixed(1)}M` :
                 `$${snapshot.volume.toLocaleString()}`}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
          Keine Preisdaten verfügbar.
        </p>
      )}

      {hasBinance && candles && candles.length >= 50 && (
        <PriceChart candles={candles} title={`${asset.ticker}/USDT · Technical View`} />
      )}

      {hasBinance && (!candles || candles.length < 50) && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm text-amber-200/80">
          Binance-Kerzendaten gerade nicht verfügbar. Chart wird beim nächsten Page-Load gerendert.
        </div>
      )}

      {recommendation && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daily Outlook</h2>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionColor[recommendation.action] ?? 'border-slate-700 bg-slate-900 text-slate-300'}`}>
              {recommendation.action}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{recommendation.rationale}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2.5 text-xs">
              <div className="font-semibold text-rose-300">Stop-Loss-Idee</div>
              <div className="mt-0.5 text-slate-300">{recommendation.stopLossIdea}</div>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2.5 text-xs">
              <div className="font-semibold text-emerald-300">Take-Profit-Zone</div>
              <div className="mt-0.5 text-slate-300">{recommendation.takeProfitZone}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <span>Risk <span className="text-slate-300">{recommendation.riskLevel}</span></span>
            <span>Hold <span className="text-slate-300">{recommendation.holdDuration}</span></span>
            <span>Conf <span className="text-slate-300">{recommendation.confidence}/100</span></span>
          </div>
          {recommendation.counterArguments.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-950/10 p-2.5 text-[11px] text-amber-200/80">
              <strong className="text-amber-300">Gegenargumente:</strong> {recommendation.counterArguments.join(' · ')}
            </div>
          )}
        </section>
      )}

      <HeadlinesList headlines={headlines} />
    </main>
  );
}
