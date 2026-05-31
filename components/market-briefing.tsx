import { BriefingStep, MasterSignalReport, buildMarketBriefing } from '@/lib/analysis/master-signal-engine';

const TONE_DOT: Record<BriefingStep['tone'], string> = {
  good: 'bg-emerald-400',
  bad: 'bg-rose-400',
  neutral: 'bg-slate-500'
};

export function MarketBriefing({ report }: { report: MasterSignalReport }) {
  const steps = buildMarketBriefing(report);

  return (
    <details open className="rounded-2xl border border-slate-800/80 bg-slate-900/40">
      <summary className="cursor-pointer p-5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        So lese ich den Markt heute (Profi-Analyse, Schritt für Schritt)
      </summary>
      <ol className="space-y-2 px-5 pb-5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <span className="font-mono text-sm font-bold text-slate-600">{i + 1}</span>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[s.tone]}`} />
            <div className="flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</div>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-200">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
