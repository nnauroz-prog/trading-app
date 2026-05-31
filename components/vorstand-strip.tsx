import Link from 'next/link';
import { VorstandReport, VorstandVerdict } from '@/lib/agents/vorstand';

function tone(v: VorstandVerdict): string {
  if (v === 'KLARER_KAUF') return 'border-emerald-400/60 bg-emerald-950/30';
  if (v === 'KAUFEN_VORSICHTIG') return 'border-emerald-400/40 bg-emerald-950/20';
  if (v === 'WATCHLIST') return 'border-amber-400/40 bg-amber-950/20';
  return 'border-slate-700 bg-slate-900/60';
}

function badge(v: VorstandVerdict): string {
  if (v === 'KLARER_KAUF') return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  if (v === 'KAUFEN_VORSICHTIG') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
  if (v === 'WATCHLIST') return 'border-amber-400/50 bg-amber-500/15 text-amber-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

export function VorstandStrip({ report }: { report: VorstandReport }) {
  return (
    <section className={`space-y-2 rounded-2xl border-2 p-4 ${tone(report.verdict)}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Vorstand</span>
        <div className="flex items-baseline gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge(report.verdict)}`}>
            {report.verdict.replace(/_/g, ' ')}
          </span>
          <Link href="/agent" className="text-[10px] text-sky-300 hover:text-sky-200">Details →</Link>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-slate-100">{report.headline}</p>
      <p className="text-[11px] leading-relaxed text-slate-400">{report.body}</p>
    </section>
  );
}
