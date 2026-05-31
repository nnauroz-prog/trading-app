import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockAssets, binanceSymbolByAssetId } from '@/lib/data/mock';
import { TOP_50, getCoinBySymbol } from '@/lib/coin-universe';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { getSnapshots } from '@/lib/providers';
import { fetchAssetHeadlines } from '@/lib/providers/sentiment';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';
import { fetchAllTickers } from '@/lib/providers/binance-tickers';
import { buildMasterSignal } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { getCryptoNews } from '@/lib/news/news-agent';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { evaluatePersonas } from '@/lib/agents/personas';
import { computeSetupSimilarity } from '@/lib/analysis/setup-similarity';
import { detectChaseSignals, detectOpportunitySignals, PriceContext } from '@/lib/analysis/chase-detector';
import { Asset, PriceSnapshot } from '@/lib/types/domain';
import { HeadlinesList } from '@/components/headlines-list';
import { InteractiveChart } from '@/components/interactive-chart';
import { WatchlistToggle } from '@/components/watchlist-toggle';
import { DataQualityBadge } from '@/components/data-quality-badge';
import { QuickPositionButton } from '@/components/quick-position-button';
import { CoinAlertForm } from '@/components/coin-alert-form';

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
  const lower = ticker.toLowerCase();

  const mockAsset = mockAssets.find((a) => a.ticker.toLowerCase() === lower || a.id === lower);
  const universeCoin = mockAsset ? undefined : getCoinBySymbol(lower) ?? TOP_50.find((c) => c.id === lower);

  if (!mockAsset && !universeCoin) notFound();

  const asset: Asset = mockAsset ?? {
    id: universeCoin!.id,
    name: universeCoin!.name,
    ticker: universeCoin!.symbol,
    category: 'crypto',
    venueAvailability: ['Binance Spot']
  };

  const hasBinance = !!(mockAsset ? binanceSymbolByAssetId[asset.id] : universeCoin);
  const binanceSymbol = mockAsset ? binanceSymbolByAssetId[asset.id] : universeCoin?.binanceSymbol;

  const [snapshots, analysis, headlines, candles, dailyCandles, tickers, masterSignal, backtestSummary, newsItems] = await Promise.all([
    mockAsset ? getSnapshots() : Promise.resolve({} as Record<string, PriceSnapshot>),
    mockAsset ? runDailyAnalysis() : Promise.resolve({ recommendations: [] }),
    mockAsset ? fetchAssetHeadlines(asset.id) : Promise.resolve([]),
    hasBinance && binanceSymbol ? fetchKlinesBySymbol(binanceSymbol, '1h', 200) : Promise.resolve(null),
    hasBinance && binanceSymbol ? fetchKlinesBySymbol(binanceSymbol, '1d', 35) : Promise.resolve(null),
    !mockAsset ? fetchAllTickers() : Promise.resolve(null),
    universeCoin ? buildMasterSignal('swing') : Promise.resolve(null),
    universeCoin ? getBacktestSummary() : Promise.resolve(null),
    universeCoin ? getCryptoNews() : Promise.resolve([])
  ]);

  const signalForThisAsset = masterSignal?.candidates.find((c) => c.coinId === asset.id);
  const signalLevels = signalForThisAsset
    ? {
        entry: signalForThisAsset.entry,
        stopLoss: signalForThisAsset.stopLoss,
        takeProfit1: signalForThisAsset.takeProfit1,
        takeProfit2: signalForThisAsset.takeProfit2
      }
    : undefined;

  let snapshot: PriceSnapshot | undefined = snapshots[asset.id];
  if (!snapshot && tickers && binanceSymbol) {
    const tk = tickers.get(binanceSymbol);
    if (tk) {
      // Compute real 7d / 30d returns from daily candles.
      let change7d = 0;
      let change30d = 0;
      if (dailyCandles && dailyCandles.length >= 8) {
        const last = dailyCandles[dailyCandles.length - 1].close;
        const seven = dailyCandles[dailyCandles.length - 8]?.close;
        if (seven) change7d = ((last - seven) / seven) * 100;
        if (dailyCandles.length >= 31) {
          const thirty = dailyCandles[dailyCandles.length - 31].close;
          change30d = ((last - thirty) / thirty) * 100;
        }
      }
      snapshot = {
        assetId: asset.id,
        price: tk.price,
        change24h: tk.priceChangePct,
        change7d,
        change30d,
        volume: tk.quoteVolume,
        source: 'binance'
      };
    }
  }
  const recommendation = ('recommendations' in analysis ? analysis.recommendations : []).find((r) => r.assetId === asset.id);

  // Cross-app intelligence for crypto coins.
  const candidate = masterSignal?.candidates.find((c) => c.coinId === asset.id) ?? null;
  const spaeher = newsItems.length > 0 ? runSpaeher(newsItems) : null;
  const personas = (masterSignal && backtestSummary)
    ? evaluatePersonas(masterSignal, backtestSummary, spaeher)
    : [];
  const personaTakesOnThisCoin = personas.map((p) => ({
    persona: p,
    isMyTarget: p.target?.coinId === asset.id
  }));
  const coinSentiment = spaeher?.perCoin.find((c) => c.coin.toUpperCase() === asset.ticker.toUpperCase()) ?? null;
  const setupSimilarity = (candidate && backtestSummary)
    ? computeSetupSimilarity(backtestSummary.safeTrades, {
        coinId: candidate.coinId, ticker: candidate.symbol, passedCount: candidate.passedCount
      })
    : null;
  const coinNews = newsItems.filter((n) => {
    const t = n.title.toUpperCase();
    return t.includes(asset.ticker.toUpperCase()) || t.includes(asset.name.toUpperCase());
  }).slice(0, 5);

  // Chase / Opportunity status specific to this coin.
  let chaseStatus: { kind: 'chase' | 'opportunity' | 'clean'; reason: string } = { kind: 'clean', reason: '' };
  if (spaeher && snapshot) {
    const prices: PriceContext[] = [{ symbol: asset.ticker, priceChangePct24h: snapshot.change24h }];
    const chases = detectChaseSignals(spaeher.perCoin, prices);
    const opps = detectOpportunitySignals(spaeher.perCoin, prices);
    if (chases.length > 0) chaseStatus = { kind: 'chase', reason: chases[0].reason };
    else if (opps.length > 0) chaseStatus = { kind: 'opportunity', reason: opps[0].reason };
  }

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
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {asset.name} <span className="font-mono text-slate-500">({asset.ticker})</span>
          </h1>
          <div className="flex flex-wrap items-baseline gap-2">
            <WatchlistToggle coinId={asset.id} symbol={asset.ticker} />
            {candidate && (
              <QuickPositionButton
                ticker={candidate.symbol}
                underlying={asset.name}
                entry={candidate.entry}
                stopLoss={candidate.stopLoss}
                takeProfit={candidate.takeProfit1}
                brokers={candidate.brokers}
              />
            )}
          </div>
        </div>
      </header>

      {snapshot ? (
        <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 to-slate-900/40 p-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Aktuell</div>
              <div className="mt-1 font-mono text-4xl font-bold text-white">${fmtPrice(snapshot.price)}</div>
            </div>
            <div className="text-right">
              <DataQualityBadge source={snapshot.source} verified={snapshot.source !== 'mock'} fetchedAt={Date.now()} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-lg border p-3 ${pctBg(snapshot.change24h)}`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">24h</div>
              <div className={`mt-1 font-mono text-lg font-bold ${pctColor(snapshot.change24h)}`}>{fmtPct(snapshot.change24h)}</div>
            </div>
            <div className={`rounded-lg border p-3 ${snapshot.change7d !== 0 ? pctBg(snapshot.change7d) : 'border-slate-700 bg-slate-900/40'}`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">7 Tage</div>
              <div className={`mt-1 font-mono text-lg font-bold ${snapshot.change7d !== 0 ? pctColor(snapshot.change7d) : 'text-slate-500'}`}>
                {snapshot.change7d !== 0 ? fmtPct(snapshot.change7d) : '—'}
              </div>
            </div>
            <div className={`rounded-lg border p-3 ${snapshot.change30d !== 0 ? pctBg(snapshot.change30d) : 'border-slate-700 bg-slate-900/40'}`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">30 Tage</div>
              <div className={`mt-1 font-mono text-lg font-bold ${snapshot.change30d !== 0 ? pctColor(snapshot.change30d) : 'text-slate-500'}`}>
                {snapshot.change30d !== 0 ? fmtPct(snapshot.change30d) : '—'}
              </div>
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

      {snapshot && (
        <CoinAlertForm coinId={asset.id} symbol={asset.ticker} currentPrice={snapshot.price} />
      )}

      {chaseStatus.kind === 'chase' && (
        <section className="rounded-2xl border-2 border-amber-400/50 bg-amber-950/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Schon gelaufen — nicht hinterherjagen</div>
          <p className="mt-1 text-[12px] text-amber-100/90">{chaseStatus.reason}</p>
        </section>
      )}
      {chaseStatus.kind === 'opportunity' && (
        <section className="rounded-2xl border-2 border-sky-400/50 bg-sky-950/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Angst war übertrieben — Setup wird besser</div>
          <p className="mt-1 text-[12px] text-sky-100/90">{chaseStatus.reason}</p>
        </section>
      )}

      {hasBinance && candles && candles.length >= 50 && (
        <InteractiveChart
          assetId={asset.id}
          initialCandles={candles}
          initialInterval="1h"
          title={`${asset.ticker}/USDT · Technical View`}
          signalLevels={signalLevels}
        />
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

      {/* Was die drei Firmen zu diesem Coin sagen */}
      {personas.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Was die drei Firmen sagen</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {candidate
                ? `${asset.ticker} hat aktuell ${candidate.passedCount} von 12 Häkchen, Struktur ${candidate.structure === 'uptrend' ? 'aufwärts' : candidate.structure === 'downtrend' ? 'abwärts' : 'seitwärts'}${candidate.nearSupport ? ', nahe Unterstützung' : ''}.`
                : `${asset.ticker} steht aktuell auf keiner Firma-Liste — kein erfülltes Mindest-Setup.`}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {personaTakesOnThisCoin.map(({ persona: p, isMyTarget }) => {
              const isBuyOnThis = p.verdict === 'BUY' && isMyTarget;
              const tone = isBuyOnThis ? 'border-emerald-400/50 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/40';
              const status = isBuyOnThis
                ? `kauft ${asset.ticker} heute`
                : isMyTarget
                ? `hat ${asset.ticker} im Visier, wartet aber`
                : `schaut auf ${p.target?.symbol ?? '—'}, nicht auf ${asset.ticker}`;
              return (
                <div key={p.persona} className={`rounded-lg border-2 p-3 ${tone}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white">{p.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isBuyOnThis ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {isBuyOnThis ? 'KAUFEN' : 'WARTEN'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">{status}.</p>
                  {isMyTarget && (
                    <p className="mt-1 text-[10px] text-slate-500">{p.rationale}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Späher-Sentiment für diesen Coin */}
      {coinSentiment && (
        <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Späher-Sentiment für {asset.ticker}</h2>
          <div className="flex flex-wrap items-baseline gap-2 text-[12px]">
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              coinSentiment.tilt === 'bullisch' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' :
              coinSentiment.tilt === 'bärisch' ? 'border-rose-400/50 bg-rose-500/15 text-rose-200' :
              'border-slate-700 bg-slate-900 text-slate-300'
            }`}>
              {coinSentiment.tilt}
            </span>
            <span className="text-slate-200">
              {coinSentiment.bullishCount} bullische vs {coinSentiment.bearishCount} bärische Headlines heute
            </span>
            {coinSentiment.topItem && (
              <Link href={`/news/${coinSentiment.topItem.id}`} className="text-[11px] text-sky-300 hover:text-sky-200">
                Top-News lesen →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Setup-Ähnlichkeit aus dem Backtest */}
      {setupSimilarity && (
        <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vergleichbare {asset.ticker}-Setups historisch</h2>
          <p className="text-[12px] text-slate-200">{setupSimilarity.oneLineVerdict}</p>
          {setupSimilarity.matchCount > 0 && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Matches</div>
                <div className="font-mono text-sm font-bold text-slate-100">{setupSimilarity.matchCount}</div>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Trefferquote</div>
                <div className={`font-mono text-sm font-bold ${(setupSimilarity.hitRatePct ?? 0) >= 50 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {setupSimilarity.hitRatePct?.toFixed(0) ?? '—'}%
                </div>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Ø Gewinn</div>
                <div className="font-mono text-sm font-bold text-emerald-300">
                  +{setupSimilarity.avgWinPct?.toFixed(1) ?? '—'}%
                </div>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Ø Verlust</div>
                <div className="font-mono text-sm font-bold text-rose-300">
                  {setupSimilarity.avgLossPct?.toFixed(1) ?? '—'}%
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Deutsche News, gefiltert auf diesen Coin */}
      {coinNews.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{asset.ticker} in den deutschen News</h2>
          <ul className="space-y-1.5">
            {coinNews.map((n) => (
              <li key={n.id}>
                <Link href={`/news/${n.id}`} className="block rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 transition hover:border-emerald-500/40">
                  <p className="text-[13px] font-semibold leading-snug text-slate-100">{n.title}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    <span className="text-slate-400">{n.source}</span> · {new Date(n.publishedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <HeadlinesList headlines={headlines} />
    </main>
  );
}
