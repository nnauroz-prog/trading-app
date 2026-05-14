import { HitRateBucket, HitRateSummary } from '@/lib/server/report-store';

export function HitRateTile({ summary }: { summary: HitRateSummary | null }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-1 text-lg font-semibold">Trefferquote nach Horizont</h2>
      <p className="mb-3 text-xs text-slate-400">
        Bewertet wird, wie sich der Preis seit der Empfehlung über den jeweiligen Zeitraum bewegt hat.
      </p>
      {summary === null ? (
        <p className="text-sm text-slate-400">
          Persistenz nicht aktiv. Setze Supabase-Env-Variablen, damit Reviews ausgewertet werden können.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Horizont 7 Tage" bucket={summary.horizon7} />
          <Metric label="Horizont 30 Tage" bucket={summary.horizon30} />
        </div>
      )}
    </section>
  );
}

function Metric({ label, bucket }: { label: string; bucket: HitRateBucket }) {
  return (
    <div className="rounded-lg bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      {bucket.rate === null ? (
        <p className="mt-1 text-sm text-slate-400">Noch keine Reviews in diesem Horizont</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold">{(bucket.rate * 100).toFixed(0)}%</p>
          <p className="text-xs text-slate-400">n = {bucket.sampleSize}</p>
        </>
      )}
    </div>
  );
}
