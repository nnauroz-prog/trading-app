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
  const ema50 = hasData && closes.length >= 50 ? ema(closes, 50)[closes.length - 1] ?? null : null;
  const ema200 = hasData && closes.length >= 200 ? ema(closes, 200)[closes.length - 1] ?? null : null;
  const high52w = hasData ? Math.max(...highs.slice(-365)) : 0;
  const low52w = hasData ? Math.min(...lows.slice(-365)) : 0;

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
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
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
