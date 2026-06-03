import { SafetyAssessment } from '@/lib/analysis/safety-gate';

const GRADE_STYLE: Record<SafetyAssessment['grade'], string> = {
  A: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
  B: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
  C: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
  D: 'border-rose-500/60 bg-rose-600/20 text-rose-200'
};

// Coin-specific safety verdict. The home-page SafetyCheck picks the best
// candidate; here we render the grade for the coin the user actively opened.
export function AssetSafetyCard({ symbol, safety }: { symbol: string; safety: SafetyAssessment }) {
  const missing = safety.criteria.filter((c) => !c.passed && c.id !== 'backtest-edge' && c.id !== 'rel-strength');
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4" aria-label="Sicherheits-Check für diesen Coin">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sicherheits-Check · {symbol}</h2>
          <p className="mt-0.5 text-[10.5px] text-slate-500">Grade A nur, wenn alle harten Kriterien passen.</p>
        </div>
        <div className={`shrink-0 rounded-xl border px-3 py-1.5 text-center ${GRADE_STYLE[safety.grade]}`}>
          <div className="text-lg font-bold leading-none">{safety.grade}</div>
          <div className="mt-0.5 font-mono text-[10px]">{safety.score}/100</div>
        </div>
      </div>

      {safety.maxSafety ? (
        <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 p-2.5 text-sm font-bold text-emerald-100">
          ✓ Alle harten Kriterien erfüllt
        </div>
      ) : (
        <div className="rounded-lg border border-amber-400/40 bg-amber-950/20 p-2.5 text-sm font-semibold text-amber-100">
          {safety.passedHard}/{safety.totalHard} Kriterien erfüllt — kein sicheres Setup
        </div>
      )}

      {!safety.maxSafety && missing.length > 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-2.5 text-[11px] leading-relaxed text-amber-100/90">
          <span className="font-semibold">Fehlt für Note A:</span>{' '}
          {missing.slice(0, 4).map((c) => c.label).join(' · ')}
          {missing.length > 4 && <span className="text-slate-500"> (+{missing.length - 4} weitere)</span>}
        </p>
      )}

      <details className="rounded-lg border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer p-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Alle Kriterien zeigen
        </summary>
        <ul className="space-y-1.5 p-2.5 pt-0">
          {safety.criteria.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-[11px]">
              <span className={c.passed ? 'text-emerald-400' : 'text-rose-400'}>{c.passed ? '✓' : '✗'}</span>
              <span className="flex-1 text-slate-300">
                <span className="font-semibold">{c.label}</span> <span className="text-slate-500">— {c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>

      <p className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2 text-[10px] leading-relaxed text-slate-500">
        {safety.residualRiskNote}
      </p>
    </section>
  );
}
