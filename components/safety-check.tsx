import { MasterSignalReport } from '@/lib/analysis/master-signal-engine';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { SafetyAssessment, evaluateSafety } from '@/lib/analysis/safety-gate';

const GRADE_STYLE: Record<SafetyAssessment['grade'], string> = {
  A: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
  B: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
  C: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
  D: 'border-rose-500/60 bg-rose-600/20 text-rose-200'
};

export function SafetyCheck({ report, backtest }: { report: MasterSignalReport; backtest: BacktestSummary }) {
  if (report.candidates.length === 0) return null;

  // Pro move: pick the candidate with the highest safety score, not just the
  // raw-confluence leader. Ties broken by passedCount.
  const scored = report.candidates.map((c) => {
    const userBrokerAvailable = c.brokers.includes('Coinbase') || c.brokers.includes('Scalable Capital');
    const safety = evaluateSafety({
      passedCount: c.passedCount,
      marketMood: report.marketMood,
      btcRegime: report.btcRegime,
      isBtc: c.coinId === 'btc',
      structure: c.structure,
      nearSupport: c.nearSupport,
      crowdCautious: report.crowd.cautious,
      quoteVolume: c.quoteVolume,
      stopDistancePct: c.stopDistancePct,
      confirmed: c.confirmed,
      userBrokerAvailable,
      relStrengthVsBtc: c.relStrengthVsBtc,
      backtestEdge: backtest.perAssetEdge[c.coinId] ?? null
    });
    return { c, safety };
  });
  scored.sort((x, y) => y.safety.score - x.safety.score || y.c.passedCount - x.c.passedCount);
  const { c: target, safety: a } = scored[0];
  const confluenceLeader = report.candidates[0];
  const switched = target.coinId !== confluenceLeader.coinId;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5" aria-label="Sicherheits-Check">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sicherheits-Check · {target.symbol}</h2>
          <p className="mt-1 text-[11px] text-slate-500">Grün nur, wenn ALLE Kriterien passen.</p>
        </div>
        <div className={`shrink-0 rounded-xl border px-3 py-1.5 text-center ${GRADE_STYLE[a.grade]}`}>
          <div className="text-lg font-bold leading-none">{a.grade}</div>
          <div className="mt-0.5 font-mono text-[10px]">{a.score}/100</div>
        </div>
      </div>

      {a.maxSafety ? (
        <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 p-2.5 text-sm font-bold text-emerald-100">
          ✓ SICHERER KAUF — alle Kriterien erfüllt
        </div>
      ) : (
        <div className="rounded-lg border border-amber-400/40 bg-amber-950/20 p-2.5 text-sm font-semibold text-amber-100">
          Kein sicheres Signal ({a.passedHard}/{a.totalHard} Kriterien) — heute lieber abwarten
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-slate-300">
        <span className="font-semibold text-slate-200">Warum gerade {target.symbol}?</span> {target.oneLineReason}.
        {Number.isFinite(target.relStrengthVsBtc) && (
          <>
            {' '}
            <span className={target.relStrengthVsBtc >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {target.relStrengthVsBtc >= 0 ? '+' : ''}{target.relStrengthVsBtc.toFixed(1)}% ggü. BTC (24h)
            </span>.
          </>
        )}
        {switched && (
          <span className="ml-1 text-[10px] text-slate-500">
            (sicherer als der Konfluenz-Sieger {confluenceLeader.symbol})
          </span>
        )}
      </p>

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
