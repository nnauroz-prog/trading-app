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
      {summary.btcHodlReturnPct !== null && (
        <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-950/40 p-2.5 text-[11px] text-slate-300">
          <span className="font-semibold text-slate-200">vs. BTC Buy-and-Hold:</span>{' '}
          Strategie <span className={`font-mono font-bold ${summary.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{summary.netReturnPct >= 0 ? '+' : ''}{summary.netReturnPct.toFixed(1)}%</span>{' '}
          gegen HODL <span className={`font-mono font-bold ${summary.btcHodlReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{summary.btcHodlReturnPct >= 0 ? '+' : ''}{summary.btcHodlReturnPct.toFixed(1)}%</span>{' '}
          {(() => {
            const diff = summary.netReturnPct - summary.btcHodlReturnPct;
            return (
              <span className={`font-mono font-bold ${diff >= 0 ? 'text-emerald-200' : 'text-rose-300'}`}>
                ({diff >= 0 ? '+' : ''}{diff.toFixed(1)}% {diff >= 0 ? 'geschlagen' : 'underperformed'})
              </span>
            );
          })()}
        </div>
      )}

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
              {summary.safeTier.profitFactor !== null && Number.isFinite(summary.safeTier.profitFactor) && (
                <> · Profit-Faktor <span className={`font-mono font-bold ${summary.safeTier.profitFactor >= 1.5 ? 'text-emerald-200' : summary.safeTier.profitFactor >= 1 ? 'text-slate-200' : 'text-rose-300'}`}>{summary.safeTier.profitFactor.toFixed(2)}</span></>
              )}
            </span>
          </div>
          {(summary.safeTier.avgWinPct !== null || summary.safeTier.avgLossPct !== null) && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {summary.safeTier.avgWinPct !== null && (
                <div className="rounded border border-emerald-500/20 bg-emerald-950/15 p-1.5 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-300">Ø Gewinn</div>
                  <div className="font-mono text-xs font-bold text-emerald-200">+{summary.safeTier.avgWinPct.toFixed(2)}%</div>
                </div>
              )}
              {summary.safeTier.avgLossPct !== null && (
                <div className="rounded border border-rose-500/20 bg-rose-950/15 p-1.5 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-rose-300">Ø Verlust</div>
                  <div className="font-mono text-xs font-bold text-rose-200">{summary.safeTier.avgLossPct.toFixed(2)}%</div>
                </div>
              )}
              {summary.safeTier.bestTradePct !== null && (
                <div className="rounded border border-slate-700 bg-slate-950/40 p-1.5 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Bester</div>
                  <div className="font-mono text-xs font-bold text-emerald-300">+{summary.safeTier.bestTradePct.toFixed(2)}%</div>
                </div>
              )}
              {summary.safeTier.worstTradePct !== null && (
                <div className="rounded border border-slate-700 bg-slate-950/40 p-1.5 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Schlechtester</div>
                  <div className="font-mono text-xs font-bold text-rose-300">{summary.safeTier.worstTradePct.toFixed(2)}%</div>
                </div>
              )}
            </div>
          )}
          {summary.safeTier.equityCurve.length > 1 && <EquityCurve curve={summary.safeTier.equityCurve} />}
          {summary.safeTier.winRatePct > 0 && summary.safeTier.winRatePct < 100 && <LossStreakRisk winRatePct={summary.safeTier.winRatePct} />}
        </div>
      )}
    </section>
  );
}

function LossStreakRisk({ winRatePct }: { winRatePct: number }) {
  const p = winRatePct / 100;
  const lossP = 1 - p;
  const lengths = [3, 5, 10] as const;
  return (
    <div className="rounded-lg border border-rose-500/20 bg-rose-950/15 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-rose-300">Verlustserien-Risiko</div>
      <ul className="mt-1 grid grid-cols-3 gap-2 text-center text-[11px]">
        {lengths.map((n) => {
          const prob = Math.pow(lossP, n) * 100;
          return (
            <li key={n} className="rounded border border-slate-700/60 bg-slate-950/40 p-1.5">
              <div className="font-mono text-[10px] text-slate-500">{n} Verluste in Folge</div>
              <div className="font-mono text-sm font-bold text-rose-200">−{n}R</div>
              <div className="font-mono text-[10px] text-slate-400">~{prob >= 1 ? prob.toFixed(1) : prob.toFixed(2)}%</div>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
        1R = dein Risiko pro Trade (z.B. 1 % deines Kapitals = €1 bei €100). Eine 5er-Serie kostet ~5 % deines Kontos — kalkulier&apos;s ein, dann tut&apos;s nicht weh.
      </p>
    </div>
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
