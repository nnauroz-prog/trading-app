import type { Metadata } from 'next';
import Link from 'next/link';
import { getMasterSignal } from '@/lib/analysis/master-signal-engine';

export const metadata: Metadata = {
  title: 'Risk-Guardian',
  description: 'Was an deinem Portfolio gerade gefaehrlich werden kann — Live-Pruefung mit Klartext-Verdict.'
};
import { fetchBothTickerSources } from '@/lib/providers/binance-tickers';
import { checkCrossExchangePrices } from '@/lib/analysis/cross-exchange-check';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { getCryptoNews } from '@/lib/news/news-agent';
import { detectChaseSignals, PriceContext } from '@/lib/analysis/chase-detector';
import { listMacroEventsThisWeek } from '@/lib/calendar/macro-events';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { CrossExchangeWarning } from '@/components/cross-exchange-warning';
import { KapitalSchutz } from '@/components/kapital-schutz';
import { TriggeredAlertsStrip } from '@/components/triggered-alerts-strip';
import { ChaseWarning } from '@/components/chase-warning';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiskPage() {
  const [masterSignal, newsItems, exchangeSources] = await Promise.all([
    getMasterSignal('swing'),
    getCryptoNews(),
    fetchBothTickerSources()
  ]);
  const spaeherReport = runSpaeher(newsItems);
  const crossExchange = checkCrossExchangePrices(exchangeSources.binance, exchangeSources.bybit);
  const eventWindow = computeEventWindow(listMacroEventsThisWeek());

  const priceCtx: PriceContext[] = masterSignal.candidates.map((c) => ({
    symbol: c.symbol,
    priceChangePct24h: c.priceChangePct24h
  }));
  const chaseSignals = detectChaseSignals(spaeherReport.perCoin, priceCtx);

  const latestPrices: Record<string, number | null> = {};
  for (const c of masterSignal.candidates) {
    latestPrices[c.coinId] = c.entry;
  }

  const macroBlock = eventWindow.imminent ? (
    <section className={`space-y-2 rounded-2xl border-2 p-4 ${eventWindow.veryImminent ? 'border-rose-400/60 bg-rose-950/30' : 'border-amber-400/50 bg-amber-950/20'}`}>
      <h2 className={`text-xs font-bold uppercase tracking-wider ${eventWindow.veryImminent ? 'text-rose-200' : 'text-amber-200'}`}>
        {eventWindow.veryImminent ? 'Termin sehr nah — Vola erwartet' : 'Termin in Sicht'}
      </h2>
      <p className="text-[12px] text-slate-100">{eventWindow.plainSummary}</p>
    </section>
  ) : null;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400">Risiko-Übersicht</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Was gerade gefährlich werden kann</h1>
        <p className="text-sm text-slate-400">
          Alle Risiko-Quellen auf einer Seite — bestehende Positionen, ausgelöste Preis-Alerts, Daten-Konflikte, Pump-Verdacht und anstehende Makro-Termine. Wenn hier alles still ist, ist die Welt heute relativ ruhig.
        </p>
      </header>

      <TriggeredAlertsStrip latestPrices={latestPrices} />

      <KapitalSchutz latestPrices={latestPrices} />

      {macroBlock}

      <ChaseWarning chase={chaseSignals} opportunity={[]} />

      <CrossExchangeWarning report={crossExchange} />

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Risikoanalyse ist immer Heuristik. Black-Swan-Events sind per Definition nicht vorhersehbar — Stop respektieren und nie mehr riskieren als du verlieren kannst.
      </p>
    </main>
  );
}
