import Link from 'next/link';
import { ChefredakteurReport, IntelSignal } from '@/lib/intel/types';

function signalClasses(s: IntelSignal): string {
  if (s === 'risk-on') return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  if (s === 'risk-off') return 'border-rose-400/60 bg-rose-500/15 text-rose-100';
  if (s === 'neutral') return 'border-slate-700 bg-slate-900 text-slate-300';
  return 'border-slate-800 bg-slate-950 text-slate-500';
}

function signalLabel(s: IntelSignal): string {
  if (s === 'risk-on') return 'risk-on';
  if (s === 'risk-off') return 'risk-off';
  return 'neutral';
}

// Compact view of the Chefredakteur for the home page. Same data as /intel
// but reduced to the most important sentence + tendency badge + a link to the
// full department breakdown.
export function IntelStrip({ ceo }: { ceo: ChefredakteurReport }) {
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chefredakteur — Lagebericht</h2>
        <div className="flex items-baseline gap-2">
          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${signalClasses(ceo.netSignal)}`}>
            {signalLabel(ceo.netSignal)}
          </span>
          <Link href="/intel" className="text-[10px] text-sky-300 hover:text-sky-200">Details →</Link>
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-slate-200">{ceo.lagebericht}</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-slate-500">
        <span>{ceo.riskOnCount} risk-on</span>
        <span>{ceo.riskOffCount} risk-off</span>
        {ceo.conflicts.length > 0 && <span>{ceo.conflicts.length} Widerspruch{ceo.conflicts.length === 1 ? '' : 'sfälle'}</span>}
      </div>
    </section>
  );
}
