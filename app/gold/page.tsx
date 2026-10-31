import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';

export const metadata: Metadata = {
  title: 'Gold',
  description: 'Was ist dein Gold wert? Den letzten verfügbaren Goldkurs ansehen und mit deinem Kaufpreis vergleichen.'
};
import { ema, rsi as rsiSeries, atr as atrSeries, sma } from '@/lib/analysis/indicators';
import { fetchYahooQuote } from '@/lib/market/yahoo-quote';
import { GoldHoldingCalculator } from '@/components/gold/gold-holding-calculator';
import { GoldPortfolioPanel } from '@/components/gold/gold-portfolio-panel';
import type { MarketContext } from '@/lib/gold/gold-holding-calculator';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export default async function GoldPage({ searchParams }: { searchParams: Promise<{ date?: string; price?: string }> }) {
  const sp = await searchParams;
  // Zwei Datenquellen parallel: PAXG (Crypto-Token-Pegged) für die
  // 1-Jahres-Historie, plus Spot-Gold-Futures (Yahoo/Stooq) als Sanity-
  // Check für den aktuellen Preis.
  const [candles, spotGold] = await Promise.all([
    fetchKlinesBySymbol('PAXGUSDT', '1d', 365),
    fetchYahooQuote('GC=F', 'Gold Spot Future')
  ]);
  const hasData = !!candles && candles.length > 30;

  const currentPrice = hasData ? candles![candles!.length - 1].close : null;
  const closes = hasData ? candles!.map((c) => c.close) : [];
  const highs = hasData ? candles!.map((c) => c.high) : [];
  const lows = hasData ? candles!.map((c) => c.low) : [];
  const times = hasData ? candles!.map((c) => c.openTime) : [];
  const ema50Series = hasData && closes.length >= 50 ? ema(closes, 50) : [];
  const ema200Series = hasData && closes.length >= 200 ? ema(closes, 200) : [];
  const high52w = hasData ? Math.max(...highs.slice(-365)) : 0;
  const low52w = hasData ? Math.min(...lows.slice(-365)) : 0;

  function nDayChange(n: number): number | null {
    if (!hasData || closes.length < n + 1 || currentPrice === null) return null;
    const past = closes[closes.length - 1 - n];
    return past > 0 ? ((currentPrice - past) / past) * 100 : null;
  }
  const change30 = nDayChange(30);
  const change90 = nDayChange(90);
  const change180 = nDayChange(180);

  const todayIso = hasData ? isoFromMs(candles![candles!.length - 1].openTime) : '';
  const dateRaw = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : '';
  const priceRaw = sp.price && /^\d+(\.\d+)?$/.test(sp.price) ? parseFloat(sp.price) : null;

  let purchasePrice: number | null = null;
  let purchaseDateIso: string | null = null;
  let pnlPct: number | null = null;
  let pnlAbs: number | null = null;
  let dateOutOfRange = false;
  if (dateRaw && hasData && currentPrice !== null) {
    if (priceRaw !== null && priceRaw > 0) {
      purchasePrice = priceRaw;
      purchaseDateIso = dateRaw;
    } else {
      const target = new Date(dateRaw + 'T00:00:00').getTime();
      let nearest: { ms: number; close: number } | null = null;
      let bestDiff = Infinity;
      for (const c of candles!) {
        const diff = Math.abs(c.openTime - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          nearest = { ms: c.openTime, close: c.close };
        }
      }
      if (nearest && bestDiff <= 7 * 24 * 60 * 60 * 1000) {
        purchasePrice = nearest.close;
        purchaseDateIso = isoFromMs(nearest.ms);
      } else {
        dateOutOfRange = true;
      }
    }
    if (purchasePrice !== null && purchasePrice > 0) {
      pnlPct = ((currentPrice - purchasePrice) / purchasePrice) * 100;
      pnlAbs = currentPrice - purchasePrice;
    }
  }

  // Cross-Source-Differenz: PAXG vs. Spot-Gold-Future. Bei > 3 %
  // Abweichung Warnung anzeigen.
  let sourceDeltaPct: number | null = null;
  if (currentPrice !== null && spotGold && spotGold.last > 0) {
    sourceDeltaPct = ((currentPrice - spotGold.last) / spotGold.last) * 100;
  }

  // ===== Markt-Kontext + History für den Gold-Holding-Rechner =====
  const sma50Series = hasData && closes.length >= 50 ? sma(closes, 50) : [];
  const ma50Raw = sma50Series.length > 0 ? sma50Series[sma50Series.length - 1] ?? null : null;
  const sma200Series = hasData && closes.length >= 200 ? sma(closes, 200) : [];
  const ma200Raw = sma200Series.length > 0 ? sma200Series[sma200Series.length - 1] ?? null : null;
  const rsi14Series = hasData && closes.length >= 15 ? rsiSeries(closes, 14) : [];
  const rsi14 = rsi14Series.length > 0 ? rsi14Series[rsi14Series.length - 1] ?? null : null;
  const atr14Series = hasData && candles && candles.length >= 15
    ? atrSeries(candles.map((c) => ({ high: c.high, low: c.low, close: c.close })), 14)
    : [];
  const atr14 = atr14Series.length > 0 ? atr14Series[atr14Series.length - 1] ?? null : null;
  const pos52w = hasData && currentPrice !== null && high52w > low52w
    ? ((currentPrice - low52w) / (high52w - low52w)) * 100
    : null;
  const goldMarketContext: MarketContext = {
    ma50: ma50Raw,
    ma200: ma200Raw,
    rsi: rsi14,
    atr: atr14,
    performance30d: change30,
    performance90d: change90,
    fiftyTwoWeekPosition: pos52w,
    priceAboveMa50: currentPrice !== null && ma50Raw !== null ? currentPrice > ma50Raw : null,
    priceAboveMa200: currentPrice !== null && ma200Raw !== null ? currentPrice > ma200Raw : null,
    ma50AboveMa200: ma50Raw !== null && ma200Raw !== null ? ma50Raw > ma200Raw : null
  };
  const history = hasData
    ? candles!.map((c) => ({ dateIso: isoFromMs(c.openTime), closeUsd: c.close }))
    : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href="/" className="text-sm text-slate-400 hover:text-cyan-200">← Zurück zu meinem Geld</Link>
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Was ist dein Gold wert?</h1>
        <p className="text-sm leading-relaxed text-slate-400">Sieh dir den letzten verfügbaren Kurs an und vergleiche ihn mit deinem Kaufpreis. Alle Beträge hier sind in US-Dollar.</p>
      </header>

      {hasData && currentPrice !== null ? (
        <section className="terminal-panel p-5 sm:p-6">
          <h2 className="text-sm text-slate-400">Eine Feinunze Gold · etwa 31,1 Gramm</h2>
          <p className="mt-2 font-mono text-3xl font-bold text-white">{currentPrice.toLocaleString('de-DE', { style: 'currency', currency: 'USD' })}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">Richtwert vom {fmtDate(todayIso)}. Der Preis beim Händler kann davon abweichen.</p>
          {change30 !== null && <p className={`mt-3 text-sm ${change30 >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{change30 >= 0 ? '+' : ''}{change30.toFixed(1)} % in den letzten 30 Tagen</p>}
        </section>
      ) : <p className="terminal-panel p-5 text-sm text-slate-400">Der aktuelle Goldkurs fehlt gerade. Der Rechner kann deshalb noch keinen Wert anzeigen. Versuche es in ein paar Minuten erneut.</p>}

      {sourceDeltaPct !== null && Math.abs(sourceDeltaPct) > 3 && <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">Unsere beiden Preisquellen weichen gerade stärker voneinander ab. Prüfe den tatsächlichen Händlerpreis, bevor du kaufst oder verkaufst.</p>}

      <GoldHoldingCalculator history={history} currentGoldPricePerOz={currentPrice} todayIso={todayIso || new Date().toISOString().slice(0, 10)} marketContext={goldMarketContext} />

      <details className="terminal-panel p-5 sm:p-6" open={Boolean(dateRaw)}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">Einen früheren Kaufpreis pro Unze vergleichen</summary>
        <div className="mt-5 space-y-5">
      <section className="terminal-panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Ist dein Gold mehr oder weniger wert?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">Dieser Vergleich gilt für eine Feinunze. Deine gesamte Goldmenge berechnest du oben.</p>
        <form action="/gold" method="get" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300">Wann hast du gekauft?
              <input type="date" name="date" defaultValue={dateRaw} max={todayIso || undefined} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-white focus:border-emerald-400 focus:outline-none" required />
            </label>
            <label className="text-sm text-slate-300">Dein Kaufpreis pro Unze ($, optional)
              <input type="number" name="price" defaultValue={priceRaw ?? ''} step="0.01" min="0" placeholder="Falls du ihn kennst" className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-white focus:border-emerald-400 focus:outline-none" />
            </label>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">Ohne Kaufpreis verwenden wir den damaligen Kurs, soweit er vorliegt.</p>
          <button type="submit" className="terminal-button">Wert vergleichen</button>
        </form>
      </section>

      {dateOutOfRange && <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">Für dieses Kaufdatum fehlt uns der damalige Kurs. Trage deinen Kaufpreis zusätzlich ein, damit wir den Unterschied berechnen können.</p>}

      {purchasePrice !== null && pnlPct !== null && pnlAbs !== null && currentPrice !== null && (
        <section className="terminal-panel p-5 sm:p-6" aria-label="Dein Goldvergleich">
          <h2 className="text-lg font-semibold text-white">Dein Vergleich</h2>
          <p className="mt-2 text-sm text-slate-400">Eine Feinunze ist heute {pnlAbs >= 0 ? 'mehr' : 'weniger'} wert als am {fmtDate(purchaseDateIso || dateRaw)}.</p>
          <p className={`mt-3 font-mono text-3xl font-bold ${pnlPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)} %</p>
          <p className={`mt-2 text-sm ${pnlAbs >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pnlAbs >= 0 ? '+' : '−'}{Math.abs(pnlAbs).toLocaleString('de-DE', { style: 'currency', currency: 'USD' })} pro Feinunze</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-400">Damals</dt><dd className="mt-1 font-mono text-white">{purchasePrice.toLocaleString('de-DE', { style: 'currency', currency: 'USD' })}</dd></div><div><dt className="text-slate-400">Heute</dt><dd className="mt-1 font-mono text-white">{currentPrice.toLocaleString('de-DE', { style: 'currency', currency: 'USD' })}</dd></div></dl>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">Kauf- und Verkaufskosten sind hier noch nicht berücksichtigt.</p>
        </section>
      )}

        </div>
      </details>

      <details className="terminal-panel p-5 sm:p-6">
        <summary className="cursor-pointer text-base font-semibold text-white">Goldkäufe speichern und zusammenrechnen</summary>
        <div className="mt-6 space-y-8">
          <GoldPortfolioPanel history={history} currentGoldPricePerOz={currentPrice} todayIso={todayIso || new Date().toISOString().slice(0, 10)} marketContext={goldMarketContext} />
        </div>
      </details>

      <details className="terminal-panel p-5 sm:p-6">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">Preisverlauf und Datenquellen ansehen</summary>
        <div className="mt-5 space-y-5">
          {hasData && currentPrice !== null && <>
            <GoldChart times={times} closes={closes} ema50={ema50Series} ema200={ema200Series} purchaseDateIso={purchaseDateIso} purchasePrice={purchasePrice} />
            <p className="text-xs leading-relaxed text-slate-400">Die blaue und die grüne Linie glätten die täglichen Preisschwankungen über 50 beziehungsweise 200 Tage.</p>
            <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-400">Höchster Preis im letzten Jahr</dt><dd className="mt-1 font-mono text-white">{high52w.toLocaleString('de-DE', { style: 'currency', currency: 'USD' })}</dd></div><div><dt className="text-slate-400">Niedrigster Preis im letzten Jahr</dt><dd className="mt-1 font-mono text-white">{low52w.toLocaleString('de-DE', { style: 'currency', currency: 'USD' })}</dd></div></dl>
            <div className="grid grid-cols-3 gap-3">{[{ label: '30 Tage', v: change30 }, { label: '90 Tage', v: change90 }, { label: '180 Tage', v: change180 }].map(period => <div key={period.label} className="rounded-lg border border-slate-800 p-3 text-sm"><p className="text-slate-400">{period.label}</p><p className={`mt-1 font-mono ${period.v === null ? 'text-slate-500' : period.v >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{period.v === null ? '—' : `${period.v >= 0 ? '+' : ''}${period.v.toFixed(1)} %`}</p></div>)}</div>
          </>}
          <div className="space-y-3 text-sm leading-relaxed text-slate-400">
            <p>Für den Verlauf nutzen wir Tageskurse von PAXG über Binance oder Bybit. PAXG ist ein an Kryptobörsen gehandelter, mit Gold hinterlegter Wert. Er dient hier als Annäherung an den Goldpreis in US-Dollar. Wir haben höchstens die letzten zwölf Monate gespeichert.</p>
            {spotGold && <p>Zum Vergleich liefert Yahoo Finance einen Goldpreis für eine spätere Lieferung: {spotGold.last.toLocaleString('de-DE', { style: 'currency', currency: 'USD' })} pro Unze. Er kann vom PAXG-Kurs und vom Händlerpreis abweichen.</p>}
            <p>Ein höherer oder niedrigerer Kurs allein sagt dir noch nicht, ob ein Verkauf zu deinem Geldplan passt.</p>
          </div>
        </div>
      </details>
    </main>
  );
}

function GoldChart({
  times,
  closes,
  ema50,
  ema200,
  purchaseDateIso,
  purchasePrice
}: {
  times: number[];
  closes: number[];
  ema50: number[];
  ema200: number[];
  purchaseDateIso: string | null;
  purchasePrice: number | null;
}) {
  if (closes.length < 2) return null;
  const W = 640;
  const H = 180;
  const padL = 36;
  const padR = 8;
  const padT = 6;
  const padB = 16;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const allValues: number[] = [...closes, ...ema50.filter((v) => Number.isFinite(v)), ...ema200.filter((v) => Number.isFinite(v))];
  if (purchasePrice !== null) allValues.push(purchasePrice);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(1e-6, max - min);
  const xs = (i: number) => padL + (i / (closes.length - 1)) * innerW;
  const ys = (v: number) => padT + innerH - ((v - min) / range) * innerH;
  const linePath = (series: number[]): string =>
    series
      .map((v, i) => (i === 0 ? `M${xs(i).toFixed(1)} ${ys(v).toFixed(1)}` : `L${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`))
      .join(' ');

  let purchaseX: number | null = null;
  if (purchaseDateIso) {
    const target = new Date(purchaseDateIso + 'T00:00:00').getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const d = Math.abs(times[i] - target);
      if (d < bestDiff) { bestDiff = d; bestIdx = i; }
    }
    purchaseX = xs(bestIdx);
  }

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + (range * i) / ticks);

  return (
    <div>
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-slate-500">
        <span>Gold-Preis (PAXG, 1 Jahr)</span>
        <span className="flex gap-2 normal-case tracking-normal">
          <span className="text-amber-300">— Preis</span>
          {ema50.length > 0 && <span className="text-blue-300">— 50 T</span>}
          {ema200.length > 0 && <span className="text-emerald-300">— 200 T</span>}
          {purchasePrice !== null && <span className="text-rose-300">— Kauf</span>}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block w-full" role="img" aria-label="Gold-Preis-Chart">
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={ys(v)} x2={padL + innerW} y2={ys(v)} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2,3" />
            <text x={padL - 4} y={ys(v) + 3} fontSize={9} fill="#64748b" textAnchor="end" fontFamily="monospace">${v.toFixed(0)}</text>
          </g>
        ))}
        {ema200.length > 0 && <path d={linePath(ema200)} stroke="#34d399" strokeWidth={1.2} fill="none" opacity={0.9} />}
        {ema50.length > 0 && <path d={linePath(ema50)} stroke="#60a5fa" strokeWidth={1.1} fill="none" opacity={0.9} />}
        <path d={linePath(closes)} stroke="#fbbf24" strokeWidth={1.3} fill="none" />
        {purchaseX !== null && purchasePrice !== null && (
          <g>
            <line x1={purchaseX} y1={padT} x2={purchaseX} y2={padT + innerH} stroke="#fb7185" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
            <line x1={padL} y1={ys(purchasePrice)} x2={padL + innerW} y2={ys(purchasePrice)} stroke="#fb7185" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
            <circle cx={purchaseX} cy={ys(purchasePrice)} r={3.5} fill="#fb7185" />
          </g>
        )}
      </svg>
    </div>
  );
}
