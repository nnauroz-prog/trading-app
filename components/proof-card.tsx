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
        <div className="mt-2 space-y-2 rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-2.5">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Nur sichere Stufe (≥9/12)</span>
            <span className="ml-2 text-[11px] text-slate-300">
              {summary.safeTier.trades} Trades · <span className="font-mono font-bold text-emerald-200">{summary.safeTier.winRatePct}%</span> Treffer ·{' '}
              <span className={`font-mono font-bold ${summary.safeTier.netReturnPct >= 0 ? 'text-emerald-200' : 'text-rose-300'}`}>
                {summary.safeTier.netReturnPct >= 0 ? '+' : ''}{summary.safeTier.netReturnPct.toFixed(1)}%
              </span>
              {summary.safeTier.medianHoldHours !== null && (
                <> · Haltedauer Ø <span className="font-mono font-bold text-slate-200">{summary.safeTier.medianHoldHours}h</span></>
              )}
              <> · max DD <span className="font-mono font-bold text-rose-300">{summary.safeTier.maxDrawdownPct.toFixed(1)}%</span></>
              {summary.safeTier.tradeSharpe !== null && (
                <> · Sharpe <span className={`font-mono font-bold ${summary.safeTier.tradeSharpe >= 0.5 ? 'text-emerald-200' : summary.safeTier.tradeSharpe >= 0 ? 'text-slate-200' : 'text-rose-300'}`}>{summary.safeTier.tradeSharpe.toFixed(2)}</span></>
              )}
            </span>
          </div>
          {summary.safeTier.equityCurve.length > 1 && <EquityCurve curve={summary.safeTier.equityCurve} />}
        </div>
      )}
    </section>
  );
}

function EquityCurve({ curve }: { curve: number[] }) {
  const W = 280;
  const H = 56;
  // Build the underwater (drawdown) curve at every step.
  let peak = -Infinity;
  const underwater = curve.map((v) => {
    if (v > peak) peak = v;
    return v - peak; // <= 0
  });
  const allValues = [...curve, ...underwater];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(1e-6, max - min);
  const xs = (i: number) => (curve.length === 1 ? 0 : (i / (curve.length - 1)) * (W - 2)) + 1;
  const ys = (v: number) => H - 1 - ((v - min) / range) * (H - 2);
  const zeroY = ys(0);
  const equityPath = curve.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(' ');
  const ddPath = underwater.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(' ');
  const positive = curve[curve.length - 1] >= 0;
  const equityStroke = positive ? '#34d399' : '#fb7185';
  return (
    <div>
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-slate-500">
        <span>Konto-Verlauf (sichere Stufe, in % Risiko-Einheiten)</span>
        <span className="flex gap-2 normal-case tracking-normal">
          <span className="text-emerald-300">— Equity</span>
          <span className="text-rose-300/70">— Underwater (Drawdown)</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block w-full" aria-label="Equity-Kurve der sicheren Stufe" role="img">
        <line x1={1} y1={zeroY} x2={W - 1} y2={zeroY} stroke="#475569" strokeWidth={0.4} strokeDasharray="2,3" />
        <path d={ddPath} stroke="#fb7185" strokeWidth={1} fill="none" opacity={0.55} />
        <path d={equityPath} stroke={equityStroke} strokeWidth={1.4} fill="none" />
      </svg>
    </div>
  );
}
