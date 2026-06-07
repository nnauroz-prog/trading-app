// Tagesplan — kurze, ehrliche Regeln.

import type { ActionPlan } from '@/lib/daily/daily-action-plan';

export function DailyActionPlanCard({ plan }: { plan: ActionPlan }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">📋 Tagesplan</h2>
        <p className="mt-1 text-[11px] leading-snug text-slate-300">{plan.intro}</p>
      </div>
      <ul className="space-y-1.5">
        {plan.lines.map((l) => (
          <li key={l.id} className="rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
            <div className="font-semibold text-slate-100">{l.headline}</div>
            <div className="text-[10.5px] leading-snug text-slate-400">{l.detail}</div>
          </li>
        ))}
      </ul>
      <p className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-2 text-[10px] leading-relaxed text-slate-400">
        {plan.residualRisk}
      </p>
    </section>
  );
}
