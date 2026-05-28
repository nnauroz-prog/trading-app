import { HitRateBucket, HitRateSummary } from '@/lib/server/report-store';

export function HitRateTile({ summary }: { summary: HitRateSummary | null }) {
  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Trefferquote nach Horizont</h3>
        <span className="text-[10px] text-slate-600">Daily-Outlook-Reviews</span>
      </div>
      {summary === null ? (
        <p className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
          Persistenz nicht aktiv. Setze Supabase-Env-Variablen, damit Reviews ausgewertet werden können.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="7 Tage" bucket={summary.horizon7} />
          <Metric label="30 Tage" bucket={summary.horizon30} />
        </div>
      )}
    </section>
  );
}

function Metric({ label, bucket }: { label: string; bucket: HitRateBucket }) {
  return (
    <div className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      {bucket.rate === null ? (
        <p className="mt-2 text-xs text-slate-500">Noch keine Reviews</p>
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold text-emerald-300">{(bucket.rate * 100).toFixed(0)}%</span>
          <span className="font-mono text-xs text-slate-500">n={bucket.sampleSize}</span>
        </div>
      )}
    </div>
  );
}
