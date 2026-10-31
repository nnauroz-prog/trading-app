import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowUpRight, Wallet } from 'lucide-react';
import { CryptoBuySignals } from '@/components/crypto/crypto-buy-signals';
import { TradeModeToggle } from '@/components/trade-mode-toggle';
import { AutoRefresh } from '@/components/auto-refresh';
import { getMasterSignal } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { scoreCandidateSafety } from '@/lib/analysis/safety-for-candidate';
import { evaluateCryptoPrecisionPick } from '@/lib/analysis/crypto-precision-gate';
import { fetchAllTickers } from '@/lib/providers/binance-tickers';
import { getCryptoNews } from '@/lib/news/news-agent';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { detectChaseSignals } from '@/lib/analysis/chase-detector';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { listMacroEventsThisWeek } from '@/lib/calendar/macro-events';
import { TOP_50 } from '@/lib/coin-universe';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Krypto kaufen?',
  description: 'Eine verständliche Einschätzung: jetzt abwarten oder einen Coin genauer ansehen – mit Kaufpreis, Ausstieg und möglichen Zielen.'
};

const price = (value: number) => `${value.toLocaleString('de-DE', { maximumSignificantDigits: 7 })} USDT`;

export default async function CryptoPage() {
  const mode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const [report, backtest, news, tickers] = await Promise.all([
    getMasterSignal(mode), getBacktestSummary(), getCryptoNews(), fetchAllTickers()
  ]);
  const sentiment = runSpaeher(news);
  const newsBySymbol = new Map(sentiment.perCoin.map(item => [item.coin.toUpperCase(), item]));
  const chase = detectChaseSignals(sentiment.perCoin, [...(tickers?.values() ?? [])].map(ticker => ({
    symbol: ticker.symbol.replace(/USDT$/, ''), priceChangePct24h: ticker.priceChangePct
  })));
  const chased = new Set(chase.filter(item => item.kind === 'hot_news_already_run').map(item => item.coin.toUpperCase()));
  const picks = report.candidates.map(candidate => {
    const coinNews = newsBySymbol.get(candidate.symbol.toUpperCase());
    return evaluateCryptoPrecisionPick({
      coinId: candidate.coinId,
      symbol: candidate.symbol,
      passedCount: candidate.passedCount,
      totalCount: candidate.totalCount,
      marketMood: report.marketMood,
      btcRegime: report.btcRegime,
      structure: candidate.structure,
      nearSupport: candidate.nearSupport,
      quoteVolume: candidate.quoteVolume,
      stopDistancePct: candidate.stopDistancePct,
      priceChangePct24h: candidate.priceChangePct24h,
      crowdCautious: report.crowd.cautious,
      confirmed: candidate.confirmed,
      backtestWinRatePct: backtest.perAssetEdge[candidate.coinId]?.winRatePct ?? null,
      backtestSampleSize: backtest.trades,
      safety: scoreCandidateSafety(candidate, report, backtest),
      newsTilt: coinNews?.tilt ?? null,
      newsNetScore: coinNews?.netScore ?? null,
      chaseWarning: chased.has(candidate.symbol.toUpperCase())
    });
  });
  const eventWindow = computeEventWindow(listMacroEventsThisWeek());
  const pausedReason = eventWindow.imminent
    ? 'Wichtige Wirtschaftszahlen stehen bevor. Die Kurse können dann stark schwanken. Deshalb warten wir mit neuen Käufen ab.'
    : null;
  const featured = TOP_50.filter(coin => ['btc', 'eth', 'sol'].includes(coin.id))
    .flatMap(coin => {
      const ticker = tickers?.get(coin.binanceSymbol);
      return ticker && Number.isFinite(ticker.price) && ticker.price > 0 ? [{ coin, ticker }] : [];
    });

  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <AutoRefresh intervalMs={30_000} />
    <header>
      <h1>Krypto kaufen?</h1>
      <p>Hier siehst du, ob ein Kauf gerade infrage kommt. Ein guter Grund zum Warten ist genauso wichtig.</p>
    </header>
    <CryptoBuySignals picks={picks} candidates={report.candidates} generatedAt={report.generatedAt} mode={mode} pausedReason={pausedReason} pricesAvailable={(tickers?.size ?? 0) > 0} />

    {featured.length > 0 && <section aria-label="Aktuelle Kryptopreise" className="terminal-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Die bekanntesten Coins</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">{featured.map(({ coin, ticker }) => <li key={coin.id}>
        <Link href={`/assets/${coin.symbol.toLowerCase()}`} className="group block rounded-xl border border-slate-800 p-4 transition-colors hover:border-cyan-400">
          <div className="flex items-center justify-between gap-2"><span className="font-medium text-slate-200">{coin.name}</span><ArrowUpRight size={16} className="text-slate-500 group-hover:text-cyan-300" aria-hidden /></div>
          <p className="mt-3 font-mono text-lg text-white">{price(ticker.price)}</p>
          <p className={`mt-1 text-sm ${ticker.priceChangePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{ticker.priceChangePct > 0 ? '+' : ''}{ticker.priceChangePct.toFixed(2)} % seit gestern</p>
        </Link>
      </li>)}</ul>
      <details className="mt-4 text-xs text-slate-400"><summary className="cursor-pointer py-2">Was bedeutet USDT?</summary><p className="mt-2 leading-relaxed">Die Preise stehen in USDT. Das ist eine Kryptowährung, deren Wert sich am US-Dollar orientiert. Für einen Kauf in Euro können Umrechnung und Gebühren dazukommen.</p></details>
    </section>}

    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 p-5">
      <div className="flex items-start gap-3"><Wallet size={19} className="mt-0.5 shrink-0 text-cyan-300" aria-hidden /><div><h2 className="font-semibold text-white">Wie viel passt zu deinem Geldplan?</h2><p className="mt-1 text-sm text-slate-400">Krypto sollte nur ein kleiner Teil sein, dessen Verlust du tragen kannst.</p></div></div>
      <Link href="/geldplan" className="terminal-button">Meinen Geldplan ansehen<ArrowUpRight size={15} aria-hidden /></Link>
    </section>
    <details className="rounded-xl border border-slate-800 p-4"><summary className="cursor-pointer text-sm text-slate-300">Zeitraum ändern</summary><p className="mb-3 mt-3 text-sm text-slate-400">Die Einschätzung gilt für den gewählten Zeitraum. Sehr kurze Käufe brauchen mehr Aufmerksamkeit.</p><TradeModeToggle /></details>
  </main>;
}
