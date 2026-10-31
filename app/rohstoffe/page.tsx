import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { QuoteRow } from '@/components/quote-row';
import { commoditiesByGroup, type CommoditySymbol } from '@/lib/market/commodities';
import { fetchManyQuotes } from '@/lib/market/yahoo-quote';
import { getCommoditySafetyScan } from '@/lib/market/commodity-safety-scan';
import { getCommoditySafetyBacktestSummary } from '@/lib/market/commodity-safety-backtest-scan';
import { evaluateInstrumentPrecisionPick } from '@/lib/analysis/instrument-precision-gate';

export const metadata: Metadata = { title: 'Rohstoffe', description: 'Gold, Silber, Öl und weitere Rohstoffpreise einfach vergleichen.' };
export const dynamic = 'force-dynamic';
export const revalidate = 300;
const GROUP_ORDER: CommoditySymbol['group'][] = ['Edelmetalle', 'Energie', 'Industriemetalle', 'Agrar'];
const GROUP_LABEL: Record<CommoditySymbol['group'], string> = { Edelmetalle: 'Gold, Silber und andere Edelmetalle', Energie: 'Öl, Gas und Benzin', Industriemetalle: 'Metalle für die Industrie', Agrar: 'Lebensmittel und weitere Rohstoffe' };

export default async function RohstoffePage() {
  const groups = commoditiesByGroup();
  const allItems = GROUP_ORDER.flatMap(group => groups[group]);
  const [quotes, safetyScan, safetyBacktest] = await Promise.all([
    fetchManyQuotes(allItems.map(item => ({ symbol: item.symbol, name: item.name }))),
    getCommoditySafetyScan(), getCommoditySafetyBacktestSummary()
  ]);
  const quoteMap = new Map(allItems.map((item, i) => [item.symbol, quotes[i]]));
  const reviewed = safetyScan.map(e => evaluateInstrumentPrecisionPick({
    symbol: e.symbol, name: e.name, group: e.group, kind: 'commodity', price: e.price, safety: e.assessment,
    marketTrendPct: null, backtestHitRatePct: safetyBacktest.combinedWinRatePct ?? null, backtestSampleSize: safetyBacktest.totalTrades ?? 0
  }));
  const candidates = reviewed.filter(p => p.verdict === 'FREIGABE').slice(0, 3);
  const liveCount = quotes.filter(q => q !== null).length;

  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <Link href="/" className="text-sm text-slate-400 hover:text-cyan-200">← Zurück zu meinem Geld</Link>
    <header className="space-y-3"><h1 className="text-3xl font-semibold text-white">Rohstoffpreise im Überblick.</h1><p className="text-sm text-slate-400">Wie entwickeln sich Gold, Öl und andere Rohstoffe? Hier kannst du die aktuellen Börsenpreise vergleichen.</p><Link href="/gold" className="terminal-button">Meinen Goldwert berechnen<ArrowUpRight size={15} /></Link></header>
    <section className="terminal-panel p-5 sm:p-6" aria-label="Rohstoffe heute"><h2 className="text-lg font-semibold text-white">Gibt es heute etwas Interessantes?</h2><p className="mt-2 text-sm leading-relaxed text-slate-300">{reviewed.length === 0 ? 'Für eine Einschätzung des Kaufzeitpunkts fehlen gerade Daten. Die verfügbaren Preise findest du unten.' : candidates.length > 0 ? 'Diese Rohstoffe sind einen genaueren Blick wert. Prüfe vor einem Kauf, wie du tatsächlich investieren würdest und welches Risiko das mit sich bringt.' : 'Heute gibt es hier keinen klaren Kaufhinweis. Du musst deshalb nichts an deinem Geldplan ändern.'}</p>{candidates.length > 0 && <ul className="mt-4 flex flex-wrap gap-2">{candidates.map(candidate => <li key={candidate.symbol}><Link href={`/rohstoffe/${encodeURIComponent(candidate.symbol)}`} className="terminal-button">{candidate.name}<ArrowUpRight size={14} /></Link></li>)}</ul>}</section>
    {liveCount === 0 && <p className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">Die Preise werden gerade nicht geliefert. Fehlende Werte bleiben leer.</p>}
    {GROUP_ORDER.map(group => <section key={group} className="terminal-panel p-5 sm:p-6"><h2 className="mb-4 text-lg font-semibold text-white">{GROUP_LABEL[group]}</h2><ul className="space-y-2">{groups[group].map(item => <QuoteRow key={item.symbol} quote={quoteMap.get(item.symbol) ?? null} fallbackName={item.name} fallbackSymbol={item.symbol} unit={item.unit} href={`/rohstoffe/${encodeURIComponent(item.symbol)}`} />)}</ul></section>)}
    <details className="text-sm text-slate-400"><summary className="cursor-pointer py-3">Was bedeuten diese Preise?</summary><div className="space-y-3 pb-4 leading-relaxed"><p>Die Angaben beziehen sich auf unterschiedliche Mengen, zum Beispiel eine Unze Gold oder ein Fass Öl. Eine Feinunze entspricht etwa 31,1 Gramm; ein Fass Öl etwa 159 Litern. Achte deshalb auf die Einheit unter dem Namen.</p><p>Die Börsenpreise beziehen sich auf Verträge über eine spätere Lieferung. Beim Kauf von Goldbarren, Fonds oder anderen Anlageprodukten können andere Preise und zusätzliche Kosten gelten.</p><p>Die Daten kommen von Yahoo Finance und werden etwa alle fünf Minuten neu abgefragt. Für einen Kaufhinweis werden zusätzlich der Kursverlauf, Schwankungen und vorhandene Daten geprüft.</p></div></details>
  </main>;
}
