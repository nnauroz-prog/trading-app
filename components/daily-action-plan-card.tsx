// Tagesplan — kurze, ehrliche Regeln.

import type { ActionPlan } from '@/lib/daily/daily-action-plan';

export function DailyActionPlanCard({ plan }: { plan: ActionPlan }) {
  // Identifizier-IDs der „Basis-Regeln" — die kommen IMMER an den Schluss.
  // Modus-spezifische Linien werden am Anfang vor diesen einsortiert.
  const baseIds = new Set(['multi-system', 'always-stop', 'cap-risk', 'no-data-no-action']);
  const modeSpecific = plan.lines.filter((l) => !baseIds.has(l.id));
  const baseLines = plan.lines.filter((l) => baseIds.has(l.id));

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">📋 Tagesplan</h2>
        <p className="mt-1 text-[11px] leading-snug text-slate-300">{plan.intro}</p>
      </div>

      {modeSpecific.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Für heute speziell
          </div>
          <ul className="space-y-1.5">
            {modeSpecific.map((l) => (
              <li key={l.id} className="rounded-md border border-emerald-400/30 bg-emerald-950/15 px-2.5 py-1.5 text-[11px]">
                <div className="font-semibold text-slate-100">{l.headline}</div>
                <div className="text-[10.5px] leading-snug text-slate-300">{l.detail}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Immer gültig
        </div>
        <ul className="space-y-1.5">
          {baseLines.map((l) => (
            <li key={l.id} className="rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
              <div className="font-semibold text-slate-100">{l.headline}</div>
              <div className="text-[10.5px] leading-snug text-slate-400">{l.detail}</div>
            </li>
          ))}
        </ul>
      </div>

      <p className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-2 text-[10px] leading-relaxed text-slate-400">
        {plan.residualRisk}
      </p>
    </section>
  );
}
