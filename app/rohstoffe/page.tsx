// Rohstoff-Hauptseite. Live-Futures-Quotes via Yahoo Finance Chart API.
// Edelmetalle (Gold, Silber, Platin, Palladium), Energie, Industriemetalle, Agrar.

import Link from 'next/link';
import { QuoteRow } from '@/components/quote-row';
import { SectorHeatmap, aggregateBuckets } from '@/components/sector-heatmap';
import { commoditiesByGroup, COMMODITY_UNIVERSE, type CommoditySymbol } from '@/lib/market/commodities';
import { fetchManyQuotes } from '@/lib/market/yahoo-quote';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const GROUP_ORDER: CommoditySymbol['group'][] = ['Edelmetalle', 'Energie', 'Industriemetalle', 'Agrar'];

const GROUP_HEADLINE: Record<CommoditySymbol['group'], string> = {
  Edelmetalle: 'Edelmetalle',
  Energie: 'Energie',
  Industriemetalle: 'Industriemetalle',
  Agrar: 'Agrarrohstoffe'
};

export default async function RohstoffePage() {
  const groups = commoditiesByGroup();
  // Alle in einem Rutsch holen, damit nur ein Promise.all wartet.
  const allItems: CommoditySymbol[] = GROUP_ORDER.flatMap((g) => groups[g]);
  const quotes = await fetchManyQuotes(allItems.map((c) => ({ symbol: c.symbol, name: c.name })));
  const quoteMap = new Map(allItems.map((c, i) => [c.symbol, quotes[i]]));
  const liveCount = quotes.filter((q) => q !== null).length;

  // Tages-Mover für die Schnellsicht: Top-3 hoch, Top-3 runter.
  // „Stärkste" nur wenn wirklich positiv — sonst irreführend wenn der
  // ganze Markt rot ist (z. B. „+-0,14 %" für eine Zucker-Position).
  const liveCommodities = allItems
    .map((c) => ({ c, q: quoteMap.get(c.symbol) ?? null }))
    .filter((x): x is { c: CommoditySymbol; q: NonNullable<typeof x.q> } => x.q !== null);
  const moversUp = [...liveCommodities]
    .filter((x) => x.q.changePct > 0)
    .sort((a, b) => b.q.changePct - a.q.changePct)
    .slice(0, 3);
  const moversDown = [...liveCommodities]
    .filter((x) => x.q.changePct < 0)
    .sort((a, b) => a.q.changePct - b.q.changePct)
    .slice(0, 3);

  // Sektor-Heatmap pro Gruppe.
  const sectorBuckets = aggregateBuckets(
    COMMODITY_UNIVERSE.map((c) => ({ group: c.group, quote: quoteMap.get(c.symbol) ?? null })),
    GROUP_ORDER
  );

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Übersicht
      </Link>

      <header className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">🛢️ Rohstoffe</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Rohstoff-Übersicht</h1>
        <p className="text-sm text-slate-400">
          Continuous-Front-Month-Futures für Edelmetalle, Energie, Industriemetalle und Agrar.
          Daten von Yahoo Finance, 5 Min Cache.
          {liveCount > 0 && <span> · <span className="text-emerald-300">{liveCount} Live-Quotes</span></span>}
        </p>
      </header>

      <SectorHeatmap buckets={sectorBuckets} title="Sektor-Heatmap (Rohstoffe)" />

      {liveCommodities.length >= 6 && (moversUp.length > 0 || moversDown.length > 0) && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {moversUp.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-emerald-400/30 bg-slate-900/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Stärkste heute</h2>
              <ul className="space-y-1">
                {moversUp.map(({ c, q }) => (
                  <li key={c.symbol} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                    {c.emoji && <span className="text-base leading-none">{c.emoji}</span>}
                    <span className="min-w-0 truncate text-slate-100">{c.name}</span>
                    <span className="font-mono font-bold text-emerald-300">+{q.changePct.toFixed(2)} %</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stärkste heute</h2>
              <p className="mt-2 text-[10.5px] leading-snug text-slate-500">Heute kein Rohstoff im Plus — gesamter Markt rot.</p>
            </div>
          )}
          {moversDown.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-rose-400/30 bg-slate-900/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-rose-300">Schwächste heute</h2>
              <ul className="space-y-1">
                {moversDown.map(({ c, q }) => (
                  <li key={c.symbol} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                    {c.emoji && <span className="text-base leading-none">{c.emoji}</span>}
                    <span className="min-w-0 truncate text-slate-100">{c.name}</span>
                    <span className="font-mono font-bold text-rose-300">{q.changePct.toFixed(2)} %</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Schwächste heute</h2>
              <p className="mt-2 text-[10.5px] leading-snug text-slate-500">Heute kein Rohstoff im Minus.</p>
            </div>
          )}
        </section>
      )}

      {GROUP_ORDER.map((group) => {
        const items = groups[group];
        if (items.length === 0) return null;
        const groupLive = items.filter((c) => quoteMap.get(c.symbol) !== null).length;
        return (
          <section key={group} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{GROUP_HEADLINE[group]}</h2>
              <span className="text-[10px] text-slate-500">{groupLive}/{items.length} live</span>
            </div>
            <ul className="space-y-1">
              {items.map((c) => (
                <QuoteRow
                  key={c.symbol}
                  quote={quoteMap.get(c.symbol) ?? null}
                  fallbackName={c.name}
                  fallbackSymbol={c.symbol}
                  unit={c.unit}
                  emoji={c.emoji}
                  href={`/rohstoffe/${encodeURIComponent(c.symbol)}`}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Datenquelle: Yahoo Finance v8 Chart API (Continuous Front-Month Futures).
        Cache: 5 Min · Spot vs. Futures kann leicht abweichen (Roll-Effekt).
        Bei API-Ausfall werden Zeilen klar als „gerade nicht verfügbar“ markiert.
        Keine Anlageberatung.
      </footer>
    </main>
  );
}
