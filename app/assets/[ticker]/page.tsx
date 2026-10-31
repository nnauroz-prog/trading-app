import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { mockAssets, binanceSymbolByAssetId } from '@/lib/data/mock';
import { TOP_50, getCoinBySymbol } from '@/lib/coin-universe';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { getSnapshots } from '@/lib/providers';
import { fetchAssetHeadlines } from '@/lib/providers/sentiment';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';
import { fetchAllTickers } from '@/lib/providers/binance-tickers';
import { getMasterSignal } from '@/lib/analysis/master-signal-engine';
import type { Asset, Candle, PriceSnapshot, RecommendationAction } from '@/lib/types/domain';
import { DataQualityBadge } from '@/components/data-quality-badge';

export const dynamic = 'force-dynamic';

const fmtPrice = (value: number) => value.toLocaleString('de-DE', { maximumSignificantDigits: 7 });
const fmtPct = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} %`;
const pctColor = (value: number) => value > 0 ? 'text-emerald-300' : value < 0 ? 'text-rose-300' : 'text-slate-300';
const actionLabels: Record<RecommendationAction, string> = {
  BUY: 'Ein Kauf kommt infrage', HOLD: 'Vorerst halten', SELL: 'Einen Verkauf prüfen', AVOID: 'Vorerst abwarten', WATCH: 'Weiter beobachten'
};

function PriceHistory({ candles, unit }: { candles: Candle[]; unit: string }) {
  const history = candles.filter(candle => Number.isFinite(candle.close) && candle.close > 0 && Number.isFinite(candle.openTime)).slice(-30);
  if (history.length < 2) return null;
  const prices = history.map(candle => candle.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || min * 0.01;
  const points = history.map((candle, index) => `${12 + index / (history.length - 1) * 576},${140 - (candle.close - min) / span * 115}`).join(' ');
  const date = (time: number) => new Date(time).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', timeZone: 'Europe/Berlin' });

  return <section className="terminal-panel p-5 sm:p-6" aria-label="Kursverlauf">
    <h2 className="text-lg font-semibold text-white">So hat sich der Preis bewegt</h2>
    <p className="mt-1 text-sm text-slate-400">Ein Preis pro Tag, in {unit}.</p>
    <div className="mt-5 flex justify-between text-xs text-slate-400"><span>Tiefster Preis: {fmtPrice(min)}</span><span>Höchster Preis: {fmtPrice(max)}</span></div>
    <svg viewBox="0 0 600 160" role="img" aria-label={`Täglicher Preis vom ${date(history[0].openTime)} bis ${date(history[history.length - 1].openTime)}. Erster Preis ${fmtPrice(prices[0])}, letzter Preis ${fmtPrice(prices[prices.length - 1])} ${unit}.`} className="mt-2 w-full text-cyan-300">
      <path d="M12 140H588" stroke="currentColor" strokeOpacity="0.15" fill="none" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <div className="flex justify-between text-xs text-slate-500"><span>{date(history[0].openTime)}</span><span>{date(history[history.length - 1].openTime)}</span></div>
  </section>;
}

export default async function AssetDetail({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const lower = ticker.toLowerCase();
  const tradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const mockAsset = mockAssets.find(asset => asset.ticker.toLowerCase() === lower || asset.id === lower);
  const universeCoin = getCoinBySymbol(lower) ?? TOP_50.find(coin => coin.id === lower);
  if (!mockAsset && !universeCoin) notFound();

  const asset: Asset = mockAsset ?? {
    id: universeCoin!.id, name: universeCoin!.name, ticker: universeCoin!.symbol,
    category: 'crypto', venueAvailability: ['Binance Spot']
  };
  const crypto = asset.category === 'crypto';
  const binanceSymbol = universeCoin?.binanceSymbol ?? binanceSymbolByAssetId[asset.id];
  const [snapshots, analysis, headlines, dailyCandles, tickers, masterSignal] = await Promise.all([
    mockAsset ? getSnapshots() : Promise.resolve({} as Record<string, PriceSnapshot>),
    mockAsset && !universeCoin ? runDailyAnalysis() : Promise.resolve({ recommendations: [] }),
    mockAsset ? fetchAssetHeadlines(asset.id) : Promise.resolve([]),
    crypto && binanceSymbol ? fetchKlinesBySymbol(binanceSymbol, '1d', 35) : Promise.resolve(null),
    crypto && binanceSymbol ? fetchAllTickers() : Promise.resolve(null),
    universeCoin ? getMasterSignal(tradeMode) : Promise.resolve(null)
  ]);

  let snapshot: PriceSnapshot | undefined = snapshots[asset.id];
  if ((!snapshot || snapshot.source === 'mock') && tickers && binanceSymbol) {
    const quote = tickers.get(binanceSymbol);
    if (quote && Number.isFinite(quote.price) && quote.price > 0) {
      const closes = dailyCandles?.map(candle => candle.close) ?? [];
      const last = closes[closes.length - 1];
      const returnSince = (days: number) => {
        const previous = closes[closes.length - 1 - days];
        return Number.isFinite(last) && Number.isFinite(previous) && previous > 0 ? ((last - previous) / previous) * 100 : 0;
      };
      snapshot = {
        assetId: asset.id, price: quote.price, change24h: quote.priceChangePct,
        change7d: returnSince(7), change30d: returnSince(30), volume: quote.quoteVolume,
        source: quote.source ?? 'binance'
      };
    }
  }
  // Example prices must never look like current market prices when live sources fail.
  if (snapshot?.source === 'mock' || (snapshot && (!Number.isFinite(snapshot.price) || snapshot.price <= 0))) snapshot = undefined;
  const unit = snapshot && ['binance', 'bybit', 'kraken'].includes(snapshot.source) ? 'USDT' : 'USD';
  const recommendation = analysis.recommendations.find(item => item.assetId === asset.id);
  const checkedAt = masterSignal?.generatedAt ? new Date(masterSignal.generatedAt) : null;
  const validCheckedAt = checkedAt && Number.isFinite(checkedAt.getTime()) ? checkedAt : null;

  return <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
    <Link href={crypto ? '/krypto' : '/aktien'} className="inline-flex py-2 text-sm text-slate-400 hover:text-cyan-300">← {crypto ? 'Zur Krypto-Übersicht' : 'Zur Aktien-Übersicht'}</Link>
    <header>
      <p className="text-sm text-cyan-300">{crypto ? 'Krypto' : asset.category === 'etf' ? 'Fonds' : 'Aktie'}</p>
      <h1 className="mt-2">{asset.name} <span className="text-slate-500">{asset.ticker}</span></h1>
    </header>

    <section className="terminal-panel p-5 sm:p-7">
      <h2 className="text-sm font-medium text-slate-400">Aktueller Preis</h2>
      {snapshot ? <>
        <p className="mt-3 break-words font-mono text-3xl font-semibold tracking-tight text-white sm:text-4xl">{fmtPrice(snapshot.price)} <span className="text-lg text-slate-500">{unit}</span></p>
        {Number.isFinite(snapshot.change24h) && <p className={`mt-3 text-base ${pctColor(snapshot.change24h)}`}>{fmtPct(snapshot.change24h)} seit gestern</p>}
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{crypto ? `Ein ${asset.ticker} kostet ungefähr diesen Betrag. Dein Kaufpreis kann durch Kursschwankungen und Gebühren abweichen.` : 'Der Preis zeigt den Wert einer Aktie. Gebühren und Kursschwankungen können deinen Kaufpreis verändern.'}</p>
        <details className="mt-5 border-t border-slate-800 pt-4"><summary className="cursor-pointer text-sm text-slate-400">Quelle und Währung</summary><div className="mt-3"><DataQualityBadge source={snapshot.source} verified={snapshot.source !== 'mock'} fetchedAt={Date.now()} /></div><p className="mt-3 text-sm leading-relaxed text-slate-400">{unit === 'USDT' ? 'USDT ist eine Kryptowährung, deren Wert sich am US-Dollar orientiert. Für einen Kauf in Euro kommt die Umrechnung hinzu.' : 'USD steht für US-Dollar. Für einen Kauf in Euro kommt die Umrechnung hinzu.'}</p></details>
      </> : <p className="mt-3 text-base leading-relaxed text-slate-300">Der aktuelle Preis ist gerade nicht verfügbar. Schau später noch einmal vorbei.</p>}
    </section>

    {crypto ? <section className="terminal-panel border-cyan-400/20 p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-white">Ist jetzt ein guter Zeitpunkt?</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-300">Ein steigender Kurs allein reicht nicht als Kaufgrund. In der Kaufprüfung siehst du, ob gerade ein Coin infrage kommt und welche Preise dafür geplant sind.</p>
      <div className="mt-4 flex items-start gap-2 text-sm text-slate-400"><Clock3 size={17} className="mt-0.5 shrink-0 text-cyan-300" aria-hidden /><p>{tradeMode === 'daytrade' ? 'Du schaust auf Käufe für heute. Dafür musst du die Preise im Blick behalten.' : 'Du schaust auf Käufe für die nächsten Tage. Auch in dieser Zeit können die Preise stark schwanken.'}</p></div>
      <Link href="/krypto" className="terminal-button mt-5">Kaufprüfung ansehen <ArrowUpRight size={16} aria-hidden /></Link>
      {validCheckedAt && <p className="mt-3 text-xs text-slate-500">Zuletzt geprüft um {validCheckedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} Uhr (Berlin).</p>}
    </section> : recommendation ? <section className="terminal-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">{actionLabels[recommendation.action]}</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-300">{recommendation.rationale}</p>
      <Link href={`/aktien/${asset.ticker.toUpperCase()}`} className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300">Aktie genauer ansehen <ArrowUpRight size={16} aria-hidden /></Link>
    </section> : null}

    {dailyCandles && <PriceHistory candles={dailyCandles} unit="USDT" />}

    {crypto && <section className="rounded-xl border border-slate-800 p-5">
      <h2 className="font-semibold text-white">Wie viel von deinem Geld passt dazu?</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">Plane zuerst Geld für deinen Alltag und eine Reserve ein. Für Krypto kommt nur Geld infrage, dessen Verlust du tragen kannst.</p>
      <Link href="/geldplan" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-300">Meinen Geldplan ansehen <ArrowUpRight size={16} aria-hidden /></Link>
    </section>}

    {headlines.length > 0 && <details className="terminal-panel p-5"><summary className="cursor-pointer text-base font-medium text-white">Aktuelle Nachrichten</summary><ul className="mt-4 space-y-3">{headlines.slice(0, 3).map((headline, index) => <li key={`${headline.url}-${index}`} className="border-t border-slate-800 pt-3"><p className="mb-1 text-xs text-slate-500">{headline.source}</p>{headline.url ? <a href={headline.url} target="_blank" rel="noopener noreferrer" className="text-sm leading-relaxed text-slate-200 hover:text-cyan-300">{headline.headline}</a> : <p className="text-sm leading-relaxed text-slate-200">{headline.headline}</p>}</li>)}</ul></details>}
  </main>;
}
