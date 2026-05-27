'use client';

import { useEffect, useState } from 'react';
import { PerformanceMetrics, computePerformanceMetrics } from '@/lib/performance-metrics';
import { POSITIONS_CHANGED_EVENT, loadPositions } from '@/lib/positions';
import { JOURNAL_CHANGED_EVENT, loadJournal } from '@/lib/journal';

function fmtMoney(v: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  const sign = v >= 0 ? '+' : '−';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}${symbol}${abs.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${sign}${symbol}${abs.toFixed(2)}`;
}

function fmtMoneyPlain(v: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (v >= 1000) return `${symbol}${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${v.toFixed(2)}`;
}

function EquityCurveChart({ data, currency }: { data: PerformanceMetrics['equityCurve']; currency: string }) {
  if (data.length < 2) {
    return <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/30 p-4 text-center text-xs text-slate-500">Mindestens 2 geschlossene Trades nötig für Equity-Curve.</div>;
  }
  const width = 600;
  const height = 140;
  const xs = data.map((d) => d.time);
  const ys = data.map((d) => d.equity);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const rangeY = maxY - minY || 1;
  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : ((d.time - minX) / (maxX - minX)) * width;
    const y = height - ((d.equity - minY) / rangeY) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastEquity = ys[ys.length - 1];
  const lineColor = lastEquity >= 0 ? '#34d399' : '#fb7185';
  const fillColor = lastEquity >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.2)';
  const zeroY = height - ((0 - minY) / rangeY) * height;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ aspectRatio: `${width}/${height}` }}>
      <polygon points={`0,${zeroY} ${points.join(' ')} ${width},${zeroY}`} fill={fillColor} />
      <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#475569" strokeWidth={0.5} strokeDasharray="3,3" />
      <polyline points={points.join(' ')} fill="none" stroke={lineColor} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={width} cy={height - ((lastEquity - minY) / rangeY) * height} r={3} fill={lineColor} />
      <text x={width - 4} y={height - ((lastEquity - minY) / rangeY) * height - 6} textAnchor="end" fontSize={10} fontFamily="monospace" fill={lineColor}>
        {fmtMoneyPlain(lastEquity, currency)}
      </text>
    </svg>
  );
}

function MonthlyHeat({ months, currency }: { months: PerformanceMetrics['monthlyPnl']; currency: string }) {
  if (months.length === 0) return null;
  const maxAbs = Math.max(...months.map((m) => Math.abs(m.pnl)), 1);
  return (
    <div className="space-y-1">
      {months.map((m) => {
        const pct = (m.pnl / maxAbs) * 100;
        const color = m.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500';
        return (
          <div key={m.month} className="flex items-center gap-2 text-xs">
            <span className="w-16 font-mono text-slate-400">{m.month}</span>
            <div className="relative flex-1 h-5 rounded bg-slate-900">
              <div className={`absolute top-0 h-full ${color} rounded`} style={{
                left: m.pnl >= 0 ? '50%' : `${50 + pct / 2}%`,
                width: `${Math.abs(pct) / 2}%`
              }} />
              <div className="absolute left-1/2 top-0 h-full w-px bg-slate-700" />
            </div>
            <span className={`w-20 text-right font-mono text-xs font-semibold ${m.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {fmtMoney(m.pnl, currency)}
            </span>
            <span className="w-12 text-right font-mono text-[10px] text-slate-500">{m.trades}T</span>
          </div>
        );
      })}
    </div>
  );
}

function BreakdownTable({ rows, currency, label }: { rows: Array<{ key: string; pnl: number; trades: number; winRate: number | null }>; currency: string; label: string }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-xs">
            <span className="font-mono text-slate-200">{r.key}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-slate-500">{r.trades}T · WR {r.winRate !== null ? `${(r.winRate * 100).toFixed(0)}%` : '—'}</span>
              <span className={`w-20 text-right font-mono font-semibold ${r.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {fmtMoney(r.pnl, currency)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const positions = loadPositions();
      const journal = loadJournal();
      setMetrics(computePerformanceMetrics(positions, journal));
    };
    refresh();
    setMounted(true);
    window.addEventListener(POSITIONS_CHANGED_EVENT, refresh);
    window.addEventListener(JOURNAL_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(POSITIONS_CHANGED_EVENT, refresh);
      window.removeEventListener(JOURNAL_CHANGED_EVENT, refresh);
    };
  }, []);

  if (!mounted || !metrics) return null;

  if (metrics.totalTrades === 0) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Performance Dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">
          Noch keine geschlossenen Trades. Erfasse Positionen unter <a href="/positions" className="text-emerald-300 underline">/positions</a> und schließe sie mit Exit-Preis — danach erscheinen hier Win-Rate, Sharpe, Drawdown und Equity-Curve.
        </p>
      </section>
    );
  }

  const { currency } = metrics;
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Performance Dashboard</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Realisierte PnL aus geschlossenen Positions. Sharpe-Ratio annualisiert mit √52 (wöchentlich angenommen).
          Vorsichtig interpretieren bei &lt;30 Trades — kleine Samples geben unzuverlässige Statistiken.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Total Realized</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${metrics.totalRealizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {fmtMoney(metrics.totalRealizedPnl, currency)}
          </div>
          <div className="font-mono text-[10px] text-slate-500">{metrics.totalTrades} Trades</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Win-Rate</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${metrics.winRatePct !== null && metrics.winRatePct >= 50 ? 'text-emerald-300' : 'text-amber-300'}`}>
            {metrics.winRatePct !== null ? `${metrics.winRatePct.toFixed(0)}%` : '—'}
          </div>
          <div className="font-mono text-[10px] text-slate-500">{metrics.wins}W / {metrics.losses}L / {metrics.breakeven}BE</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Profit-Factor</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${metrics.profitFactor !== null && metrics.profitFactor >= 1.5 ? 'text-emerald-300' : metrics.profitFactor !== null && metrics.profitFactor >= 1 ? 'text-amber-300' : 'text-rose-300'}`}>
            {metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : '—'}
          </div>
          <div className="font-mono text-[10px] text-slate-500">Profi-Ziel: &gt;1.5</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Sharpe-Ratio</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${metrics.sharpeRatio !== null && metrics.sharpeRatio >= 1 ? 'text-emerald-300' : metrics.sharpeRatio !== null && metrics.sharpeRatio >= 0 ? 'text-amber-300' : 'text-rose-300'}`}>
            {metrics.sharpeRatio !== null ? metrics.sharpeRatio.toFixed(2) : '—'}
          </div>
          <div className="font-mono text-[10px] text-slate-500">Profi-Ziel: &gt;1.0</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Max-Drawdown</div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-300">
            −{metrics.maxDrawdownPct.toFixed(1)}%
          </div>
          <div className="font-mono text-[10px] text-slate-500">−{fmtMoneyPlain(metrics.maxDrawdownAbsolute, currency).replace('€', '€').replace('$', '$')}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Expectancy / Trade</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${metrics.expectancyPerTrade !== null && metrics.expectancyPerTrade > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {metrics.expectancyPerTrade !== null ? fmtMoney(metrics.expectancyPerTrade, currency) : '—'}
          </div>
          <div className="font-mono text-[10px] text-slate-500">Ø-Erwartung</div>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3">
          <div className="text-[10px] uppercase tracking-widest text-emerald-400">Best Trade</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-300">{fmtMoney(metrics.bestTrade, currency)}</div>
          <div className="font-mono text-[10px] text-emerald-500">Win-Streak {metrics.longestWinStreak}</div>
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-3">
          <div className="text-[10px] uppercase tracking-widest text-rose-400">Worst Trade</div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-300">{fmtMoney(metrics.worstTrade, currency)}</div>
          <div className="font-mono text-[10px] text-rose-500">Loss-Streak {metrics.longestLossStreak}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Equity-Curve (kumuliertes Realized PnL)</div>
        <EquityCurveChart data={metrics.equityCurve} currency={currency} />
      </div>

      {metrics.monthlyPnl.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Monthly PnL</div>
          <MonthlyHeat months={metrics.monthlyPnl} currency={currency} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <BreakdownTable
          rows={metrics.byUnderlying.slice(0, 8).map((r) => ({ key: r.underlying, pnl: r.pnl, trades: r.trades, winRate: r.winRate }))}
          currency={currency}
          label="By Underlying"
        />
        <BreakdownTable
          rows={metrics.byInstrumentType.map((r) => ({ key: r.type, pnl: r.pnl, trades: r.trades, winRate: r.winRate }))}
          currency={currency}
          label="By Instrument-Type"
        />
        <BreakdownTable
          rows={metrics.byBroker.map((r) => ({ key: r.broker, pnl: r.pnl, trades: r.trades, winRate: r.winRate }))}
          currency={currency}
          label="By Broker"
        />
      </div>

      {metrics.byAppDecision.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">App-Decision vs Outcome (aus Journal, 7-Tage-Horizont)</div>
          <div className="space-y-1.5">
            {metrics.byAppDecision.map((row) => {
              const total = row.outcomes.positive + row.outcomes.negative + row.outcomes.neutral + row.outcomes.pending;
              const evaluated = row.outcomes.positive + row.outcomes.negative + row.outcomes.neutral;
              const accuracy = evaluated > 0 ? (row.outcomes.positive / evaluated) * 100 : null;
              return (
                <div key={row.decision} className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs">
                  <span className="font-mono text-slate-200">{row.decision}</span>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="text-emerald-300">{row.outcomes.positive}+</span>
                    <span className="text-rose-300">{row.outcomes.negative}−</span>
                    <span className="text-slate-400">{row.outcomes.neutral}=</span>
                    <span className="text-slate-600">{row.outcomes.pending}?</span>
                    <span className="w-12 text-right font-bold text-amber-300">{accuracy !== null ? `${accuracy.toFixed(0)}%` : '—'}</span>
                    <span className="w-12 text-right text-slate-500">{total}T</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
