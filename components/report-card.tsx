import { Recommendation } from '@/lib/types/domain';

const colorByAction: Record<Recommendation['action'], string> = {
  BUY: 'bg-emerald-600',
  WATCH: 'bg-amber-600',
  HOLD: 'bg-blue-600',
  AVOID: 'bg-orange-700',
  SELL: 'bg-rose-700'
};

export function ReportCard({ title, rows }: { title: string; rows: Recommendation[] }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.assetId} className="rounded-lg bg-slate-950 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium uppercase">{row.assetId}</span>
              <span className={`rounded px-2 py-0.5 text-xs ${colorByAction[row.action]}`}>{row.action}</span>
            </div>
            <p className="text-sm text-slate-300">{row.rationale}</p>
            <p className="mt-1 text-xs text-slate-400">Risiko: {row.riskLevel} · Haltedauer: {row.holdDuration} · Confidence: {row.confidence}/100</p>
          </div>
        ))}
      </div>
    </section>
  );
}
