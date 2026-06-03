// Visualisiert die Quality-Band-Aufteilung der gerankten Prognosen als
// horizontaler Balken — zeigt auf einen Blick, wieviel des Tages-Pools in
// welcher Score-Klasse landet. Keine localStorage-Last, rein server-seitig.

import type { RankedPrediction } from '@/lib/sport/quality-ranking';

interface Props {
  ranked: RankedPrediction[];
  todayIso?: string;
}

const BAND_ORDER = ['sehr_stark', 'stark', 'brauchbar', 'orientierung', 'nicht_verwenden'] as const;
type Band = (typeof BAND_ORDER)[number];

const BAND_META: Record<Band, { label: string; bg: string; text: string }> = {
  sehr_stark: { label: 'sehr stark', bg: 'bg-emerald-500/70', text: 'text-emerald-200' },
  stark: { label: 'stark', bg: 'bg-sky-500/70', text: 'text-sky-200' },
  brauchbar: { label: 'brauchbar', bg: 'bg-amber-500/70', text: 'text-amber-200' },
  orientierung: { label: 'Orientierung', bg: 'bg-slate-500/70', text: 'text-slate-200' },
  nicht_verwenden: { label: 'nicht verwenden', bg: 'bg-rose-500/60', text: 'text-rose-200' }
};

export function QualityBandDistribution({ ranked, todayIso }: Props) {
  const pool = todayIso ? ranked.filter((r) => r.fixture.date === todayIso) : ranked;
  if (pool.length === 0) return null;

  const counts: Record<Band, number> = {
    sehr_stark: 0, stark: 0, brauchbar: 0, orientierung: 0, nicht_verwenden: 0
  };
  for (const r of pool) counts[r.quality.band as Band] += 1;
  const total = pool.length;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Quality-Band-Verteilung {todayIso ? '(heute)' : ''}
        </h2>
        <span className="text-[10px] text-slate-500">{total} Spiele bewertet</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Wie viel des heutigen Pools ist wirklich gut? Auf einen Blick erkennbar — keine Top-Liste, sondern Roh-Verteilung.
      </p>
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
        {BAND_ORDER.map((b) => {
          const pct = total === 0 ? 0 : (counts[b] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={b}
              className={BAND_META[b].bg}
              style={{ width: `${pct}%` }}
              title={`${BAND_META[b].label}: ${counts[b]}`}
            />
          );
        })}
      </div>
      <ul className="grid grid-cols-2 gap-1.5 text-[10.5px] sm:grid-cols-5">
        {BAND_ORDER.map((b) => {
          const pct = total === 0 ? 0 : Math.round((counts[b] / total) * 100);
          return (
            <li key={b} className="rounded-md border border-slate-800 bg-slate-950/40 p-1.5">
              <div className={`text-[9px] uppercase tracking-wider ${BAND_META[b].text}`}>{BAND_META[b].label}</div>
              <div className="mt-0.5 font-mono text-[11.5px] font-semibold text-slate-100">
                {counts[b]} <span className="text-slate-500">· {pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
