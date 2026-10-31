import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { QuoteRow } from '@/components/quote-row';
import { STOCK_INDEX_SYMBOLS, STOCK_UNIVERSE, type StockSymbol } from '@/lib/market/stocks';
import { fetchManyQuotes } from '@/lib/market/yahoo-quote';
import { marketAverageChangePct } from '@/lib/market/stock-setup-score';
import { getStockSafetyScan } from '@/lib/market/stock-safety-scan';
import { getStockSafetyBacktestSummary } from '@/lib/market/stock-safety-backtest-scan';
import { evaluateInstrumentPrecisionPick } from '@/lib/analysis/instrument-precision-gate';

export const metadata: Metadata = {
  title: 'Aktien',
  description: 'Aktuelle Aktienkurse auf einen Blick. Unternehmen ansehen und ihre Kursentwicklung vergleichen.'
};
export const dynamic = 'force-dynamic';
export const revalidate = 300;
const GROUP_ORDER: StockSymbol['group'][] = ['US Tech', 'US Finanz', 'US Health', 'US Industrie', 'US Konsum', 'US Auto/EV', 'Deutschland'];
const GROUP_LABEL: Record<StockSymbol['group'], string> = {
  'US Tech': 'Technologie', 'US Finanz': 'Banken und Finanzen', 'US Health': 'Gesundheit', 'US Industrie': 'Industrie',
  'US Konsum': 'Alltag und Konsum', 'US Auto/EV': 'Autos', Deutschland: 'Deutsche Unternehmen'
};

export default async function AktienPage() {
  const [indices, stocks, safetyScan, safetyBacktest] = await Promise.all([
    fetchManyQuotes(STOCK_INDEX_SYMBOLS.map(i => ({ symbol: i.symbol, name: i.name }))),
    fetchManyQuotes(STOCK_UNIVERSE.map(s => ({ symbol: s.symbol, name: s.name }))),
    getStockSafetyScan(), getStockSafetyBacktestSummary()
  ]);
  const marketTrend = marketAverageChangePct(stocks);
  const reviewed = safetyScan.map(e => evaluateInstrumentPrecisionPick({
    symbol: e.symbol, name: e.name, group: e.group, kind: 'stock', price: e.price, safety: e.assessment,
    marketTrendPct: marketTrend, backtestHitRatePct: safetyBacktest.combinedWinRatePct ?? null,
    backtestSampleSize: safetyBacktest.totalTrades ?? 0
  }));
  const candidates = reviewed.filter(p => p.verdict === 'FREIGABE').slice(0, 3);
  const liveCount = stocks.filter(q => q !== null).length;
  const popular = STOCK_UNIVERSE.slice(0, 7);

  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <Link href="/" className="text-sm text-slate-400 hover:text-cyan-200">← Zurück zu meinem Geld</Link>
    <header className="space-y-3">
      <h1 className="text-3xl font-semibold text-white">Aktien auf einen Blick.</h1>
      <p className="text-sm text-slate-400">Hier siehst du aktuelle Kurse. Tippe auf ein Unternehmen, um mehr darüber zu erfahren.</p>
      <Link href="/aktien/watchlist" className="terminal-button">Meine gespeicherten Aktien<ArrowUpRight size={15} /></Link>
    </header>

    <section className="terminal-panel p-5 sm:p-6" aria-label="Aktien heute">
      <h2 className="text-lg font-semibold text-white">Gibt es heute etwas Interessantes?</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{reviewed.length === 0
        ? 'Für eine Einschätzung des Kaufzeitpunkts fehlen gerade Daten. Du kannst dir die verfügbaren Kurse trotzdem ansehen.'
        : candidates.length > 0
          ? 'Diese Unternehmen sind einen genaueren Blick wert. Prüfe vor einem Kauf, ob sie zu deinem Geldplan passen.'
          : 'Heute gibt es hier keinen klaren Kaufhinweis. Du musst deshalb nichts an deinem Geldplan ändern.'}</p>
      {candidates.length > 0 && <ul className="mt-4 flex flex-wrap gap-2">{candidates.map(candidate => <li key={candidate.symbol}><Link href={`/aktien/${encodeURIComponent(candidate.symbol)}`} className="terminal-button">{candidate.name}<ArrowUpRight size={14} /></Link></li>)}</ul>}
    </section>

    <section className="terminal-panel p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-white">Bekannte Unternehmen</h2><span className="text-xs text-slate-400">Kurs und heutige Veränderung</span></div>
      {liveCount === 0 && <p className="mb-4 text-sm text-slate-400">Die Kurse werden gerade nicht geliefert. Fehlende Werte bleiben leer.</p>}
      <ul className="space-y-2">{popular.map(stock => {
        const i = STOCK_UNIVERSE.findIndex(s => s.symbol === stock.symbol);
        return <QuoteRow key={stock.symbol} quote={stocks[i]} fallbackName={stock.name} fallbackSymbol={stock.symbol} href={`/aktien/${encodeURIComponent(stock.symbol)}`} />;
      })}</ul>
    </section>

    <details className="terminal-panel p-5 sm:p-6"><summary className="cursor-pointer text-sm font-semibold text-slate-200">Alle Unternehmen ansehen</summary><div className="mt-5 space-y-6">{GROUP_ORDER.map(group => <section key={group}><h2 className="mb-3 text-base font-semibold text-slate-200">{GROUP_LABEL[group]}</h2><ul className="space-y-2">{STOCK_UNIVERSE.map((stock, i) => stock.group === group ? <QuoteRow key={stock.symbol} quote={stocks[i]} fallbackName={stock.name} fallbackSymbol={stock.symbol} href={`/aktien/${encodeURIComponent(stock.symbol)}`} /> : null)}</ul></section>)}</div></details>
    <details className="terminal-panel p-5 sm:p-6"><summary className="cursor-pointer text-sm font-semibold text-slate-200">Wie stehen die großen Börsen?</summary><p className="mt-3 text-sm leading-relaxed text-slate-400">Diese Werte fassen die Kurse vieler Unternehmen zusammen. Sie zeigen dir die allgemeine Richtung an den Börsen.</p><ul className="mt-4 space-y-2">{STOCK_INDEX_SYMBOLS.map((index, i) => <QuoteRow key={index.symbol} quote={indices[i]} fallbackName={index.name} fallbackSymbol={index.symbol} />)}</ul></details>
    <details className="text-sm text-slate-400"><summary className="cursor-pointer py-3">Woher kommen die Kurse und Hinweise?</summary><p className="pb-4 leading-relaxed">Die Kurse kommen von Yahoo Finance und werden etwa alle fünf Minuten neu abgefragt. Für einen Kaufhinweis werden zusätzlich der längere Kursverlauf, Schwankungen und verfügbare Daten geprüft. Ein steigender Tageskurs allein reicht dafür nicht aus.</p></details>
  </main>;
}
