'use client';

// Prominenter „Beweis-Block" auf der Home: was haben die drei Firmen
// historisch wirklich gebracht? Nicht „Richtung erraten" sondern
// virtuelles P&L: jeder vergangene BUY-Verdict aus dem Tagebuch wird gegen
// den AKTUELLEN Live-Preis gemessen. HIT_TP zaehlt als realisierter Gewinn,
// HIT_SL als realisierter Verlust, dazwischen als schwebende Position.
//
// Damit beantwortet die Karte die Frage, die der User die ganze Zeit
// stellt: „Wuerden mir die Agenten echt was bringen?" — mit konkreten
// Prozenten, nicht mit Badges.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { computeFirmaPnl, type FirmaPnlSummary, type FirmaTradePnl } from '@/lib/agents/firma-pnl';
import type { PersonaId } from '@/lib/agents/personas';

interface Props {
  // Vom Server uebergebene aktuelle Preise. Key = lowercased symbol ohne USDT
  // (so wie sie in app/page.tsx aufgebaut werden).
  latestPrices: Record<string, number | null>;
}

const MIN_BUYS_SHOW = 3; // bei zu wenig BUYs schweigen wir ehrlich

const FIRMA_TONE: Record<PersonaId, string> = {
  conservative: 'border-sky-400/30 bg-sky-950/15',
  balanced: 'border-emerald-400/30 bg-emerald-950/15',
  aggressive: 'border-amber-400/30 bg-amber-950/15'
};

function fmtPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)} %`;
}

function pctTone(v: number): string {
  if (v >= 10) return 'text-emerald-300';
  if (v >= 0) return 'text-emerald-400/80';
  if (v >= -10) return 'text-rose-400/80';
  return 'text-rose-300';
}

function outcomeBadge(o: FirmaTradePnl['outcome']) {
  if (o === 'HIT_TP') return <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1 py-0.5 text-[9px] font-bold text-emerald-200">TP</span>;
  if (o === 'HIT_SL') return <span className="rounded border border-rose-400/50 bg-rose-500/15 px-1 py-0.5 text-[9px] font-bold text-rose-200">SL</span>;
  if (o === 'OPEN') return <span className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-[9px] font-bold text-slate-300">offen</span>;
  return <span className="rounded border border-slate-800 bg-slate-950 px-1 py-0.5 text-[9px] font-bold text-slate-500">—</span>;
}

export function FirmaPnlCard({ latestPrices }: Props) {
  const [summaries, setSummaries] = useState<FirmaPnlSummary[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const log = loadFirmaLog();
      const priceFor = (symbol: string): number | null => {
        const k = symbol.toLowerCase();
        const v = latestPrices[k];
        return typeof v === 'number' && Number.isFinite(v) ? v : null;
      };
      setSummaries(computeFirmaPnl(log, priceFor));
    };
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
  }, [latestPrices]);

  if (!mounted) return null;
  const totalBuys = summaries.reduce((s, x) => s + x.totalBuys, 0);
  if (totalBuys === 0) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] leading-relaxed text-slate-400">
        <div className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">Virtuelles P&amp;L</div>
        <p className="mt-1">
          Sobald die drei Firmen den ersten BUY ausgeben, wird hier laufend gerechnet, wo deren Empfehlungen heute stehen wuerden.
        </p>
      </section>
    );
  }
  const overallSum = summaries.reduce((s, x) => s + x.totalPnlPct, 0);
  const overallBuys = totalBuys;
  const enoughData = summaries.some((s) => s.totalBuys >= MIN_BUYS_SHOW);

  return (
    <section className="space-y-3 rounded-2xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-950/15 via-slate-950/60 to-slate-950/60 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Virtuelles P&amp;L · Was die Firmen geliefert haben</div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
            Jeder vergangene BUY der drei Firmen, gemessen gegen den AKTUELLEN Live-Preis: <span className="text-emerald-300">TP</span> = Ziel getroffen, <span className="text-rose-300">SL</span> = ausgestoppt, sonst offene Position mit schwebendem Stand. Gleich-gewichtet, ohne Position-Sizing.
          </p>
        </div>
        <Link href="/agent" className="shrink-0 text-[10px] text-sky-300 hover:text-sky-200">Detail →</Link>
      </header>

      {!enoughData && (
        <p className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px] text-slate-400">
          Erst {overallBuys} {overallBuys === 1 ? 'BUY' : 'BUYs'} im Tagebuch — Statistik ist noch duenn. Werte werden belastbarer ab je {MIN_BUYS_SHOW} BUYs pro Firma.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {summaries.map((s) => (
          <article key={s.firma} className={`space-y-2 rounded-xl border-2 p-3 ${FIRMA_TONE[s.firma]}`}>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">{s.firmaName}</span>
              <span className="text-[9px] text-slate-400">{s.totalBuys} BUY{s.totalBuys === 1 ? '' : 's'}</span>
            </div>
            <div className="grid grid-cols-3 items-baseline gap-1.5">
              <div>
                <div className="text-[8.5px] uppercase tracking-wider text-slate-500">Gesamt</div>
                <div className={`font-mono text-lg font-bold ${pctTone(s.totalPnlPct)}`}>{fmtPct(s.totalPnlPct)}</div>
              </div>
              <div>
                <div className="text-[8.5px] uppercase tracking-wider text-slate-500">⌀/Trade</div>
                <div className={`font-mono text-sm font-bold ${pctTone(s.avgPnlPct)}`}>{fmtPct(s.avgPnlPct)}</div>
              </div>
              <div>
                <div className="text-[8.5px] uppercase tracking-wider text-slate-500">TP-Quote</div>
                <div className="font-mono text-sm font-bold text-slate-200">
                  {s.resolvedHitRatePct !== null ? `${s.resolvedHitRatePct} %` : '—'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 text-[9px]">
              <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">{s.wins} TP</span>
              <span className="rounded border border-rose-400/40 bg-rose-500/10 px-1.5 py-0.5 text-rose-200">{s.losses} SL</span>
              <span className="rounded border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-slate-300">{s.openTrades} offen</span>
            </div>
            {s.bestTradePct !== null && s.worstTradePct !== null && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10px]">
                <span className="text-slate-500">Bester</span>
                <span className={`font-mono font-bold ${pctTone(s.bestTradePct)}`}>{fmtPct(s.bestTradePct)}</span>
                <span className="text-slate-500">· Schlechtester</span>
                <span className={`font-mono font-bold ${pctTone(s.worstTradePct)}`}>{fmtPct(s.worstTradePct)}</span>
              </div>
            )}
            {s.trades.length > 0 && (
              <details className="rounded border border-slate-800 bg-slate-950/40">
                <summary className="cursor-pointer p-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                  ▸ Letzte {Math.min(s.trades.length, 8)} BUYs
                </summary>
                <ul className="divide-y divide-slate-800">
                  {s.trades.slice(0, 8).map((t, i) => (
                    <li key={`${t.date}-${t.coin}-${i}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 px-2 py-1 text-[10px]">
                      <span className="font-mono text-[9px] text-slate-500">{t.date.slice(5)}</span>
                      <span className="font-mono font-bold text-slate-200">{t.coin}</span>
                      {outcomeBadge(t.outcome)}
                      <span className={`font-mono font-bold ${t.pnlPct === null ? 'text-slate-500' : pctTone(t.pnlPct)}`}>
                        {t.pnlPct === null ? '—' : fmtPct(t.pnlPct)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>

      <p className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[10px] leading-snug text-slate-400">
        Summe aller drei Firmen gleich-gewichtet: <span className={`font-mono font-bold ${pctTone(overallSum)}`}>{fmtPct(overallSum)}</span> ueber {overallBuys} BUYs.{' '}
        Vereinfachtes &bdquo;Hold-to-Now&ldquo;-Modell: bei TP-Treffer wird der TP1-Gewinn realisiert, bei SL-Treffer der SL-Verlust, sonst der aktuelle, schwebende Stand gezeigt. Keine Steuern, keine Spread-Kosten. Vergangenheit ≠ Zukunft.
      </p>
    </section>
  );
}
