import { Recommendation } from '@/lib/types/domain';

const styleByAction: Record<Recommendation['action'], string> = {
  BUY: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  WATCH: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  HOLD: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  AVOID: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  SELL: 'border-rose-500/40 bg-rose-500/10 text-rose-300'
};

export function ReportCard({ title, rows }: { title: string; rows: Recommendation[] }) {
  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.assetId} className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-3 transition hover:border-slate-700">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-sm font-bold uppercase tracking-wide text-slate-100">{row.assetId}</span>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styleByAction[row.action]}`}>
                {row.action}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">{row.rationale}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <span>Risk <span className="text-slate-300">{row.riskLevel}</span></span>
              <span>Hold <span className="text-slate-300">{row.holdDuration}</span></span>
              <span>Conf <span className="text-slate-300">{row.confidence}/100</span></span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
