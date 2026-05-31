import Link from 'next/link';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';
import { ema } from '@/lib/analysis/indicators';

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

interface Verdict {
  tone: 'sell' | 'hold' | 'neutral';
  headline: string;
  reasons: string[];
}

function computeVerdict(price: number, ema50: number | null, ema200: number | null, high52w: number, low52w: number): Verdict {
  const reasons: string[] = [];
  let bullish = 0;
  let bearish = 0;

  if (ema50 !== null) {
    if (price > ema50) { bullish++; reasons.push(`Über der 50-Tage-Linie (${ema50.toFixed(0)} $) — kurzfristiger Trend hoch`); }
    else { bearish++; reasons.push(`Unter der 50-Tage-Linie (${ema50.toFixed(0)} $) — kurzfristiger Trend runter`); }
  }
  if (ema200 !== null) {
    if (price > ema200) { bullish++; reasons.push(`Über der 200-Tage-Linie (${ema200.toFixed(0)} $) — langfristig im Aufwärtstrend`); }
    else { bearish++; reasons.push(`Unter der 200-Tage-Linie (${ema200.toFixed(0)} $) — langfristig im Abwärtstrend`); }
  }

  const distFromHighPct = ((high52w - price) / high52w) * 100;
  const distFromLowPct = ((price - low52w) / low52w) * 100;
  if (distFromHighPct < 3) {
    bearish++;
    reasons.push(`Nahe 52-Wochen-Hoch (${high52w.toFixed(0)} $, nur ${distFromHighPct.toFixed(1)}% darunter) — Gewinnmitnahme oft sinnvoll`);
  } else if (distFromLowPct < 5) {
    bullish++;
    reasons.push(`Nahe 52-Wochen-Tief (${low52w.toFixed(0)} $, nur ${distFromLowPct.toFixed(1)}% darüber) — Boden möglich, Verkauf am Tief eher ungünstig`);
  }

  if (bullish >= 2 && bearish === 0) return { tone: 'hold', headline: 'EHER HALTEN', reasons };
  if (bearish >= 2 && bullish === 0) return { tone: 'sell', headline: 'JETZT VERKAUFEN IST OKAY', reasons };
  return { tone: 'neutral', headline: 'NEUTRAL — Bauchentscheidung', reasons };
}

const TONE: Record<Verdict['tone'], { box: string; head: string }> = {
  sell: { box: 'border-rose-500/50 bg-rose-950/20', head: 'text-rose-100' },
  hold: { box: 'border-emerald-500/50 bg-emerald-950/20', head: 'text-emerald-100' },
  neutral: { box: 'border-amber-500/50 bg-amber-950/20', head: 'text-amber-100' }
};

export default async function GoldPage({ searchParams }: { searchParams: Promise<{ date?: string; price?: string }> }) {
  const sp = await searchParams;
  const candles = await fetchKlinesBySymbol('PAXGUSDT', '1d', 365);
  const hasData = !!candles && candles.length > 30;

  const currentPrice = hasData ? candles![candles!.length - 1].close : null;
  const closes = hasData ? candles!.map((c) => c.close) : [];
  const highs = hasData ? candles!.map((c) => c.high) : [];
  const lows = hasData ? candles!.map((c) => c.low) : [];
  const times = hasData ? candles!.map((c) => c.openTime) : [];
  const ema50Series = hasData && closes.length >= 50 ? ema(closes, 50) : [];
  const ema200Series = hasData && closes.length >= 200 ? ema(closes, 200) : [];
  const ema50 = ema50Series.length > 0 ? ema50Series[ema50Series.length - 1] ?? null : null;
  const ema200 = ema200Series.length > 0 ? ema200Series[ema200Series.length - 1] ?? null : null;
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

  function monthlyBreakdown(): { label: string; pct: number }[] {
    if (!hasData) return [];
    const byMonth = new Map<string, { first: number; last: number }>();
    for (const c of candles!) {
      const d = new Date(c.openTime);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const cur = byMonth.get(key);
      if (!cur) byMonth.set(key, { first: c.close, last: c.close });
      else cur.last = c.close;
    }
    return Array.from(byMonth.entries())
      .map(([key, v]) => ({ label: key, pct: v.first > 0 ? ((v.last - v.first) / v.first) * 100 : 0 }))
      .slice(-12);
  }
  const months = monthlyBreakdown();

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

  const verdict = hasData && currentPrice !== null
    ? computeVerdict(currentPrice, ema50, ema200, high52w, low52w)
    : null;
  const verdictTone = verdict ? TONE[verdict.tone] : null;

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Gold-Rechner</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Wann verkaufen?</h1>
        <p className="text-sm text-slate-400">
          Gib dein Kaufdatum ein (optional Kaufpreis pro Unze in $). Der Rechner zeigt deinen Stand und ob jetzt ein guter Verkaufszeitpunkt ist. Quelle: PAXG (1:1 mit physischem Gold gedeckt) — Tagesdaten der letzten 12 Monate.
        </p>
      </header>

      <form action="/gold" method="get" className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Kaufdatum
            <input
              type="date"
              name="date"
              defaultValue={dateRaw}
              max={todayIso}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
              required
            />
          </label>
          <label className="text-xs text-slate-400">
            Kaufpreis pro Unze ($, optional)
            <input
              type="number"
              name="price"
              defaultValue={priceRaw ?? ''}
              step="0.01"
              min="0"
              placeholder="leer = automatischer Tagespreis"
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </label>
        </div>
        <button type="submit" className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30">
          Berechnen
        </button>
      </form>

      {!hasData && (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          Gold-Kursdaten (PAXG) gerade nicht verfügbar. Versuch&apos;s in ein paar Minuten nochmal.
        </p>
      )}

      {hasData && currentPrice !== null && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Aktuell</div>
              <div className="font-mono text-lg font-bold text-white">${currentPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">52w Hoch</div>
              <div className="font-mono text-lg font-bold text-slate-200">${high52w.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">52w Tief</div>
              <div className="font-mono text-lg font-bold text-slate-200">${low52w.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">200-Tage-Linie</div>
              <div className="font-mono text-lg font-bold text-slate-200">{ema200 !== null ? `$${ema200.toFixed(0)}` : '—'}</div>
            </div>
          </div>

          <GoldChart
            times={times}
            closes={closes}
            ema50={ema50Series}
            ema200={ema200Series}
            purchaseDateIso={purchaseDateIso}
            purchasePrice={purchasePrice}
          />

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: '30 Tage', v: change30 },
              { label: '90 Tage', v: change90 },
              { label: '180 Tage', v: change180 }
            ].map((p) => (
              <div key={p.label} className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{p.label}</div>
                <div className={`font-mono text-sm font-bold ${p.v === null ? 'text-slate-500' : p.v >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {p.v === null ? '—' : `${p.v >= 0 ? '+' : ''}${p.v.toFixed(1)}%`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {months.length > 0 && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Monatliche Performance (letzte 12 Monate)</h2>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
            {months.map((m) => (
              <div key={m.label} className={`rounded-md border p-1.5 text-center ${m.pct >= 0 ? 'border-emerald-500/30 bg-emerald-950/15' : 'border-rose-500/30 bg-rose-950/15'}`}>
                <div className="text-[9px] font-mono text-slate-500">{m.label}</div>
                <div className={`font-mono text-xs font-bold ${m.pct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {m.pct >= 0 ? '+' : ''}{m.pct.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {dateOutOfRange && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-100/90">
          Für dein Kaufdatum liegen keine Tagesdaten im 12-Monats-Fenster vor. Trag bitte zusätzlich den Kaufpreis ein, dann rechne ich trotzdem.
        </p>
      )}

      {purchasePrice !== null && pnlPct !== null && pnlAbs !== null && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dein Stand</h2>
          <p className="mt-1 text-sm text-slate-300">
            Kauf am <span className="font-mono font-semibold text-slate-100">{purchaseDateIso ? fmtDate(purchaseDateIso) : fmtDate(dateRaw)}</span> zu <span className="font-mono font-semibold text-slate-100">${purchasePrice.toFixed(2)}</span> · Heute <span className="font-mono font-semibold text-slate-100">${currentPrice!.toFixed(2)}</span>
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className={`font-mono text-3xl font-bold ${pnlPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span>
            <span className={`font-mono text-sm ${pnlAbs >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pnlAbs >= 0 ? '+' : ''}${pnlAbs.toFixed(2)} pro Unze</span>
          </div>
        </section>
      )}

      {verdict && verdictTone && (
        <section className={`rounded-2xl border-2 p-4 ${verdictTone.box}`}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Verkaufs-Verdikt</div>
          <h2 className={`mt-1 text-xl font-bold ${verdictTone.head}`}>{verdict.headline}</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {verdict.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg border border-slate-700/60 bg-slate-950/40 p-2.5 text-[11px] leading-relaxed text-slate-400">
            Heuristik aus Trend (50/200-Tage-Linien) und Abstand zu 52w-Hoch/Tief — keine Garantie. Gold reagiert auf Zinsen, Inflation, geopolitische Lage. Vergangenheit ≠ Zukunft.
          </p>
        </section>
      )}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Daten: PAXG (Pax Gold, 1:1 gedeckt) über Binance/Bybit · Tagesdaten · max. 365 Tage Historie · keine Anlageberatung.
      </footer>
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
