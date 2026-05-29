import { BacktestSummary } from '@/lib/analysis/backtest-summary';

export function ProofCard({ summary }: { summary: BacktestSummary }) {
  if (!summary.available) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Funktioniert die Strategie?</div>
        <p className="mt-1 text-xs text-slate-500">Backtest-Zahlen werden berechnet … (gleich verfügbar).</p>
      </section>
    );
  }

  const positive = summary.netReturnPct >= 0;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Funktioniert die Strategie? — echter Backtest</div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Zeitraum</div>
          <div className="font-mono text-sm font-bold text-slate-100">{summary.periodDays}d</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Trades</div>
          <div className="font-mono text-sm font-bold text-slate-100">{summary.trades}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Treffer</div>
          <div className="font-mono text-sm font-bold text-slate-100">{summary.winRatePct !== null ? `${summary.winRatePct}%` : '—'}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Netto</div>
          <div className={`font-mono text-sm font-bold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
            {positive ? '+' : ''}{summary.netReturnPct.toFixed(1)}%
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Belegt am Backtest (BTC/ETH/SOL, echte historische Kerzen, Gebühren abgezogen, keine Slippage). Vergangenheit ≠ Zukunft.
      </p>

      {summary.safeTier && (
        <div className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Nur sichere Stufe (≥9/12)</span>
          <span className="ml-2 text-[11px] text-slate-300">
            {summary.safeTier.trades} Trades · <span className="font-mono font-bold text-emerald-200">{summary.safeTier.winRatePct}%</span> Treffer ·{' '}
            <span className={`font-mono font-bold ${summary.safeTier.netReturnPct >= 0 ? 'text-emerald-200' : 'text-rose-300'}`}>
              {summary.safeTier.netReturnPct >= 0 ? '+' : ''}{summary.safeTier.netReturnPct.toFixed(1)}%
            </span>
            {summary.safeTier.medianHoldHours !== null && (
              <> · Haltedauer Ø <span className="font-mono font-bold text-slate-200">{summary.safeTier.medianHoldHours}h</span></>
            )}
          </span>
        </div>
      )}
    </section>
  );
}
