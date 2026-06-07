// Visualisiert die InstrumentSafetyAssessment-Karte für die Detail-Seiten.
// Klares Verdict oben, Grade-Badge, Kriterien-Liste in einem details/summary.

import type { InstrumentSafetyAssessment } from '@/lib/market/instrument-safety';

const GRADE_STYLE: Record<InstrumentSafetyAssessment['grade'], string> = {
  A: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
  B: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  C: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  D: 'border-rose-500/50 bg-rose-500/15 text-rose-200'
};

const VERDICT_STYLE: Record<InstrumentSafetyAssessment['verdict'], string> = {
  KAUFEN: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  BEOBACHTEN: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  'NICHT KAUFEN': 'border-rose-500/50 bg-rose-500/15 text-rose-100'
};

export function InstrumentSafetyCard({ assessment, name }: { assessment: InstrumentSafetyAssessment; name: string }) {
  const a = assessment;
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4" aria-label="Sicherheits-Check">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sicherheits-Check · {name}</h2>
          <p className="mt-1 text-[11px] text-slate-500">Grün nur, wenn ALLE 8 Kriterien passen.</p>
        </div>
        <div className={`shrink-0 rounded-xl border px-3 py-1.5 text-center ${GRADE_STYLE[a.grade]}`}>
          <div className="text-lg font-bold leading-none">{a.grade}</div>
          <div className="mt-0.5 font-mono text-[10px]">{a.score}/100</div>
        </div>
      </div>

      <div className={`rounded-lg border p-2.5 text-sm font-bold ${VERDICT_STYLE[a.verdict]}`}>
        {a.verdict === 'KAUFEN' && '✓ '}
        {a.verdict === 'NICHT KAUFEN' && '✗ '}
        {a.verdict} · {a.passedHard}/{a.totalHard} Kriterien
      </div>

      <details className="rounded-lg border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer p-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Alle Kriterien zeigen
        </summary>
        <div className="space-y-2 p-2.5 pt-0">
          <ul className="space-y-1.5">
            {a.criteria.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[11px]">
                <span className={c.passed ? 'text-emerald-400' : 'text-rose-400'}>{c.passed ? '✓' : '✗'}</span>
                <span className="flex-1 text-slate-300">
                  <span className="font-semibold">{c.label}</span> <span className="text-slate-500">— {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2 text-[10px] leading-relaxed text-slate-400">
            {a.residualRiskNote}
          </p>
        </div>
      </details>
    </section>
  );
}
