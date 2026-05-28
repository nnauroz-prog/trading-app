import { StrategyBacktestReport, StrategyBacktestStats } from '@/lib/analysis/strategy-backtest';

function fmtPct(v: number, sign = true): string {
  const s = v > 0 && sign ? '+' : '';
  return `${s}${v.toFixed(1)}%`;
}

function color(v: number): string {
  if (v > 0) return 'text-emerald-300';
  if (v < 0) return 'text-rose-300';
  return 'text-slate-300';
}

function Sparkline({ data, width = 600, height = 70 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return <div className="text-[10px] text-slate-600">zu wenig Trades für eine Kurve</div>;
  const min = Math.min(0, ...data);
  const max = Math.max(0, ...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`);
  const last = data[data.length - 1];
  const lineColor = last >= 0 ? '#34d399' : '#fb7185';
  const fill = last >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)';
  const zeroY = height - ((0 - min) / range) * height;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ aspectRatio: `${width}/${height}` }}>
      <polygon points={`0,${zeroY} ${pts.join(' ')} ${width},${zeroY}`} fill={fill} />
      <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#475569" strokeWidth={0.5} strokeDasharray="3,3" />
      <polyline points={pts.join(' ')} fill="none" stroke={lineColor} strokeWidth={1.5} />
    </svg>
  );
}

function AssetRow({ s }: { s: StrategyBacktestStats }) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-800/60 bg-slate-950/40 px-3 py-2">
      <div className="col-span-2 font-mono text-sm font-bold text-slate-100">{s.ticker}</div>
      <div className="col-span-2 font-mono text-sm">
        <span className={s.winRate !== null && s.winRate >= 0.5 ? 'text-emerald-300' : 'text-amber-300'}>
          {s.winRate !== null ? `${(s.winRate * 100).toFixed(0)}%` : '—'}
        </span>
        <span className="text-slate-600"> WR</span>
      </div>
      <div className="col-span-3 font-mono text-xs text-slate-400">{s.totalSignals} Trades ({s.wins}W/{s.losses}L/{s.timeouts}T)</div>
      <div className={`col-span-2 font-mono text-sm font-semibold ${color(s.netReturnPct)}`}>{fmtPct(s.netReturnPct)}</div>
      <div className="col-span-3"><Sparkline data={s.equityCurve} width={160} height={28} /></div>
    </div>
  );
}

export function StrategyBacktestView({ report }: { report: StrategyBacktestReport }) {
  if (report.dataSource === 'offline') {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
        Krypto-Daten-Provider gerade nicht erreichbar — Backtest kann nicht laufen.
      </div>
    );
  }

  const { combined, periodDays } = report;
  const wr = combined.winRate !== null ? (combined.winRate * 100).toFixed(0) : '—';
  const wrColor = combined.winRate !== null && combined.winRate >= 0.5 ? 'text-emerald-300' : 'text-amber-300';
  const profitable = combined.expectancyPct > 0;

  return (
    <div className="space-y-4">
      <section className={`rounded-2xl border-2 ${profitable ? 'border-emerald-500/40 bg-emerald-950/15' : 'border-rose-500/40 bg-rose-950/15'} p-5`}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          {`Antwort auf „hätte ich verloren?" · letzte ${Math.round(periodDays)} Tage · ≥${report.minConfluence}/12 Konfluenz`}
        </div>
        <h2 className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${profitable ? 'text-emerald-100' : 'text-rose-100'}`}>
          {profitable
            ? `Die Logik war profitabel: ${fmtPct(combined.netReturnPct)} über ${combined.totalSignals} Trades`
            : `Die Logik hätte Geld verloren: ${fmtPct(combined.netReturnPct)} über ${combined.totalSignals} Trades`}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {profitable
            ? `Bei ${wr}% Trefferquote und ATR-basierten Stops/Zielen wäre die Strategie über diesen Zeitraum positiv gewesen. Das ist Vergangenheit — keine Garantie für die Zukunft.`
            : `Über diesen Zeitraum hätte die Strategie Verluste gemacht. Genau dafür gibt es den No-Trade-Modus und Risk-Management — aber es ist eine ehrliche Warnung: nicht jede Phase ist handelbar.`}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 md:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Win-Rate</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${wrColor}`}>{wr}%</div>
          <div className="font-mono text-[10px] text-slate-500">{combined.wins}W / {combined.losses}L / {combined.timeouts}T</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Netto-Return</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${color(combined.netReturnPct)}`}>{fmtPct(combined.netReturnPct)}</div>
          <div className="font-mono text-[10px] text-slate-500">kumuliert, nach Fees</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Expectancy</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${color(combined.expectancyPct)}`}>{fmtPct(combined.expectancyPct)}</div>
          <div className="font-mono text-[10px] text-slate-500">pro Trade Ø</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Signale</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white">{combined.totalSignals}</div>
          <div className="font-mono text-[10px] text-slate-500">in {Math.round(periodDays)} Tagen</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Equity-Kurve (kumuliert, alle Coins)</div>
        <Sparkline data={combined.equityCurve} />
      </div>

      {report.perAsset.length > 0 && (
        <div className="space-y-1.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Pro Coin</div>
          {report.perAsset.map((s) => <AssetRow key={s.assetId} s={s} />)}
        </div>
      )}

      <p className="rounded-lg border border-amber-500/20 bg-amber-950/15 p-3 text-[11px] leading-relaxed text-amber-200/80">
        <strong className="text-amber-300">Ehrliche Einschränkung:</strong> Dieser Backtest nutzt exakt die 12-Punkt-Logik der App,
        aber modelliert KEINE Slippage, keine Spreads, keine Wochenend-Gaps und keine Emotionen. Real ist das Ergebnis immer etwas
        schlechter. Vergangene Performance ist kein Indikator für die Zukunft. Nur kleiner Einsatz, erst nach eigenem Paper-Trading.
      </p>
    </div>
  );
}
