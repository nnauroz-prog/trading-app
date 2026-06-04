'use client';

import { useEffect, useState } from 'react';
import type { RankedPrediction } from '@/lib/sport/quality-ranking';
import { TipSaveButton } from '@/components/tip-save-button';
import { STABLE_ONLY_CHANGED, loadStableOnly } from '@/components/stable-only-toggle';
import { ClearSignalBadge } from '@/components/clear-signal-badge';

interface Props {
  ranked: RankedPrediction[];
  limit?: number;
  title?: string;
}

const BAND_CHIP: Record<string, string> = {
  sehr_stark: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
  stark: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  brauchbar: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  orientierung: 'border-slate-700 bg-slate-800/40 text-slate-300',
  nicht_verwenden: 'border-rose-500/40 bg-rose-500/10 text-rose-200'
};

function fmtTime(date: string, time: string | null): string {
  if (!time) return '—';
  const d = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function TopPredictionsRanking({ ranked, limit = 5, title = 'Top-Prognosen (nach Quality-Score)' }: Props) {
  const [stableOnly, setStableOnly] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStableOnly(loadStableOnly());
    setMounted(true);
    const sync = () => setStableOnly(loadStableOnly());
    window.addEventListener(STABLE_ONLY_CHANGED, sync);
    return () => window.removeEventListener(STABLE_ONLY_CHANGED, sync);
  }, []);

  const filtered = stableOnly
    ? ranked.filter((r) => r.quality.recommendation.isStableMarket)
    : ranked;
  const top = filtered.slice(0, limit);
  if (top.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{title}</h2>
        <p className="mt-2 text-[12px] leading-snug text-slate-400">
          {stableOnly ? 'Kein stabiler Markt schafft heute die Topliste — Filter entschärfen oder nicht tippen.' : 'Keine Prognosen verfügbar.'}
        </p>
      </section>
    );
  }

  void mounted;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{title}</h2>
        <span className="text-[10px] text-slate-500">
          {stableOnly ? `${filtered.length}/${ranked.length}` : ranked.length} Spiele
        </span>
      </div>
      <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
        Ranking nach kombiniertem Quality-Score, nicht nach roher Wahrscheinlichkeit. Stabile Märkte (Tor-Markt, Doppelchance) bevorzugt.
      </p>
      <ol className="mt-3 space-y-2">
        {top.map((rp, i) => {
          const { fixture, leagueName, quality } = rp;
          const { recommendation, score, band, bandLabel } = quality;
          const chipClass = BAND_CHIP[band] ?? BAND_CHIP.orientierung;
          return (
            <li key={fixture.id}>
              <details className="group rounded-lg border border-slate-800 bg-slate-950/40">
                <summary className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 p-2.5 hover:bg-slate-900/60">
                  <span className="font-mono text-[10px] text-slate-500">#{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-slate-100">
                      {fixture.homeTeam} <span className="text-slate-500">–</span> {fixture.awayTeam}
                    </span>
                    <span className="block truncate text-[10.5px] text-slate-400">
                      {leagueName} · {fmtDate(fixture.date)} {fmtTime(fixture.date, fixture.time)} · {recommendation.label}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <ClearSignalBadge rp={rp} compact />
                    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-bold ${chipClass}`}>{score}</span>
                  </span>
                </summary>
                <div className="space-y-2 border-t border-slate-800 px-2.5 py-2 text-[11px] text-slate-300">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                      {bandLabel}
                    </span>
                    <span className="font-mono text-[10.5px] text-slate-400">
                      Modell-Wahrsch. {Math.round(recommendation.probability * 100)} %
                    </span>
                    {recommendation.isStableMarket ? (
                      <span className="text-[10px] text-emerald-300">stabiler Markt</span>
                    ) : (
                      <span className="text-[10px] text-amber-300">enger Markt</span>
                    )}
                  </div>
                  <p className="leading-snug text-slate-400">{recommendation.rationale}</p>
                  <details>
                    <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
                      Score-Aufschlüsselung
                    </summary>
                    <dl className="mt-1.5 grid grid-cols-2 gap-1 text-[10.5px] sm:grid-cols-5">
                      <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                        <dt className="text-[9px] text-slate-500">Wahrsch.</dt>
                        <dd className="font-mono">{quality.parts.probability}/45</dd>
                      </div>
                      <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                        <dt className="text-[9px] text-slate-500">Confidence</dt>
                        <dd className="font-mono">{quality.parts.confidence}/20</dd>
                      </div>
                      <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                        <dt className="text-[9px] text-slate-500">Daten</dt>
                        <dd className="font-mono">{quality.parts.dataQuality}/20</dd>
                      </div>
                      <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                        <dt className="text-[9px] text-slate-500">Markt</dt>
                        <dd className="font-mono">{quality.parts.marketRisk}/10</dd>
                      </div>
                      <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
                        <dt className="text-[9px] text-slate-500">Aktualität</dt>
                        <dd className="font-mono">{quality.parts.actuality}/5</dd>
                      </div>
                    </dl>
                  </details>
                  {quality.warnings.length > 0 && (
                    <ul className="space-y-0.5 text-[10.5px] text-amber-200/80">
                      {quality.warnings.map((w, idx) => (
                        <li key={idx}>· {w}</li>
                      ))}
                    </ul>
                  )}
                  <div>
                    <TipSaveButton
                      fixtureId={fixture.id}
                      fixtureDate={fixture.date}
                      league={rp.leagueName}
                      homeTeam={fixture.homeTeam}
                      awayTeam={fixture.awayTeam}
                      tier="custom"
                      market={recommendation.label}
                      modelProbabilityPct={Math.round(recommendation.probability * 100)}
                      qualityScore={quality.score}
                      qualityBand={quality.band}
                      dataQuality={fixture.probabilities?.dataQuality ?? 'weak'}
                      isStableMarket={recommendation.isStableMarket}
                    />
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
