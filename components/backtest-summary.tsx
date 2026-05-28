import { BacktestReport, BacktestStats } from '@/lib/analysis/backtest';

function fmtPct(value: number, withSign = true): string {
  const sign = value > 0 && withSign ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function returnColor(value: number): string {
  if (value > 0) return 'text-emerald-300';
  if (value < 0) return 'text-rose-300';
  return 'text-slate-300';
}

function Sparkline({ data, width = 200, height = 40, color = '#34d399' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) {
    return <div className="text-[10px] text-slate-600">keine Daten</div>;
  }
  const min = Math.min(0, ...data);
  const max = Math.max(0, ...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const zeroY = height - ((0 - min) / range) * height;
  const lastValue = data[data.length - 1];
  const lineColor = lastValue >= 0 ? color : '#fb7185';
  const fillColor = lastValue >= 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={`0,${zeroY} ${points.join(' ')} ${width},${zeroY}`} fill={fillColor} stroke="none" />
      <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,2" />
      <polyline points={points.join(' ')} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatBlock({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${accent ?? 'text-white'}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function AssetRow({ stats }: { stats: BacktestStats }) {
  const winRatePct = stats.winRate !== null ? (stats.winRate * 100).toFixed(0) : '—';
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-800/60 bg-slate-950/40 px-3 py-2">
      <div className="col-span-2 font-mono text-sm font-bold text-slate-100">{stats.ticker}</div>
      <div className="col-span-2 font-mono text-sm">
        <span className={stats.winRate !== null && stats.winRate >= 0.5 ? 'text-emerald-300' : 'text-amber-300'}>{winRatePct}%</span>
        <span className="text-slate-600"> WR</span>
      </div>
      <div className="col-span-2 font-mono text-xs text-slate-400">
        {stats.totalSignals} <span className="text-slate-600">Trades</span>
      </div>
      <div className={`col-span-2 font-mono text-sm font-semibold ${returnColor(stats.netReturnPct)}`}>
        {fmtPct(stats.netReturnPct)}
      </div>
      <div className="col-span-4">
        <Sparkline data={stats.equityCurve} width={160} height={28} />
      </div>
    </div>
  );
}

export function BacktestSummary({ report }: { report: BacktestReport }) {
  if (report.dataSource === 'offline') {
    return null;
  }

  const { combined, periodDays } = report;
  const winRatePct = combined.winRate !== null ? (combined.winRate * 100).toFixed(0) : '—';
  const winRateColor = combined.winRate !== null && combined.winRate >= 0.5 ? 'text-emerald-300' : 'text-amber-300';

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 to-slate-900/60 p-5">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Backtest · letzte {Math.round(periodDays)} Tage
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Selbe Signal-Logik, simuliert über historische Binance-Kerzen. Trading-Fees (0.1% pro Seite) abgezogen. Slippage nicht modelliert — reale Performance kann etwas schlechter sein.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
          {new Date(report.generatedAt).toLocaleDateString('de-DE')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-slate-800 py-4 md:grid-cols-4">
        <StatBlock
          label="Win-Rate"
          value={`${winRatePct}%`}
          sub={`${combined.wins}W / ${combined.losses}L / ${combined.timeouts}T`}
          accent={winRateColor}
        />
        <StatBlock
          label="Netto-Return"
          value={fmtPct(combined.netReturnPct)}
          sub="kumuliert, nach Fees"
          accent={returnColor(combined.netReturnPct)}
        />
        <StatBlock
          label="Expectancy"
          value={fmtPct(combined.expectancyPct)}
          sub="pro Trade Ø"
          accent={returnColor(combined.expectancyPct)}
        />
        <StatBlock
          label="Signale"
          value={combined.totalSignals.toString()}
          sub={`Ø ${(combined.totalSignals / Math.max(periodDays, 1)).toFixed(1)}/Tag`}
        />
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Equity-Kurve (kumuliert)</div>
        <Sparkline data={combined.equityCurve} width={600} height={60} />
      </div>

      {report.perAsset.length > 0 && (
        <div className="mt-5 space-y-1.5">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Per Coin</div>
          {report.perAsset.map((s) => <AssetRow key={s.assetId} stats={s} />)}
        </div>
      )}

      {combined.winRate !== null && combined.expectancyPct > 0 && (
        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-[11px] leading-relaxed text-emerald-200/80">
          <strong className="text-emerald-300">Lesehilfe:</strong> Bei {winRatePct}% Win-Rate und R:R 1.5:1 wäre das System rein mathematisch profitabel
          (Break-Even-Win-Rate bei R:R 1.5:1 = 40%). Vergangenheit ≠ Zukunft. Reales Trading hat Slippage, Emotionen, und Marktphasen die das System nicht gesehen hat.
        </div>
      )}
      {combined.winRate !== null && combined.expectancyPct <= 0 && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-[11px] leading-relaxed text-rose-200/80">
          <strong className="text-rose-300">Achtung:</strong> Aktuelle Konfluenz-Regeln liefern negative Expectancy auf diesem Sample.
          Das System nicht blind nutzen — die Regeln müssen nachjustiert werden (engere RSI-Range, anderes Volumen-Threshold, etc.).
        </div>
      )}
    </section>
  );
}
