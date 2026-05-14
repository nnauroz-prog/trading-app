import { HitRateSummary } from '@/lib/server/report-store';

export function HitRateTile({ summary }: { summary: HitRateSummary | null }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Trefferquote</h2>
      {summary === null ? (
        <p className="text-sm text-slate-400">
          Persistenz nicht aktiv. Setze Supabase-Env-Variablen, damit Reviews ausgewertet werden können.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Letzte 7 Tage" rate={summary.hitRate7d} n={summary.sampleSize7d} />
          <Metric label="Letzte 30 Tage" rate={summary.hitRate30d} n={summary.sampleSize30d} />
        </div>
      )}
    </section>
  );
}

function Metric({ label, rate, n }: { label: string; rate: number | null; n: number }) {
  return (
    <div className="rounded-lg bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      {rate === null ? (
        <p className="mt-1 text-sm text-slate-400">Noch keine Reviews</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold">{(rate * 100).toFixed(0)}%</p>
          <p className="text-xs text-slate-400">n = {n}</p>
        </>
      )}
    </div>
  );
}
