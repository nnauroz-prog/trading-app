import Link from 'next/link';
import { ScreenerReport, ScreenerRow } from '@/lib/analysis/screener';

function confluenceColor(c: number, total: number): string {
  const pct = c / total;
  if (pct >= 0.58) return 'text-emerald-300';
  if (pct >= 0.42) return 'text-amber-300';
  return 'text-rose-300';
}

function pctColor(v: number): string {
  if (v > 0) return 'text-emerald-300';
  if (v < 0) return 'text-rose-300';
  return 'text-slate-300';
}

function Dot({ on }: { on: boolean }) {
  return <span className={on ? 'text-emerald-400' : 'text-slate-700'}>{on ? '✓' : '·'}</span>;
}

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}

function Row({ r }: { r: ScreenerRow }) {
  return (
    <Link
      href={`/assets/${r.symbol.toLowerCase()}`}
      className={`grid grid-cols-12 items-center gap-1 border-b border-slate-800/60 px-2 py-2 text-xs transition hover:bg-slate-800/30 ${r.tradeable ? 'bg-emerald-500/5' : ''}`}
    >
      <div className="col-span-2">
        <div className="font-mono text-sm font-bold text-slate-100">{r.symbol}</div>
        <div className="font-mono text-[10px] text-slate-500">${fmtPrice(r.price)}</div>
      </div>
      <div className="col-span-2 text-center">
        <span className={`font-mono text-base font-bold ${confluenceColor(r.confluence, r.totalChecks)}`}>{r.confluence}</span>
        <span className="font-mono text-[10px] text-slate-600">/{r.totalChecks}</span>
        {r.tradeable && <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">tradeable</div>}
      </div>
      <div className={`col-span-2 text-center font-mono ${pctColor(r.change24hPct)}`}>
        {r.change24hPct > 0 ? '+' : ''}{r.change24hPct.toFixed(1)}%
      </div>
      <div className="col-span-1 text-center font-mono text-slate-400">{r.rsi1h}</div>
      <div className="col-span-3 flex items-center justify-center gap-1.5 font-mono text-[11px]">
        <span title="1h-Trend"><Dot on={r.trend1h} />1h</span>
        <span title="4h-Trend"><Dot on={r.trend4h} />4h</span>
        <span title="Tagestrend"><Dot on={r.trend1d} />1d</span>
        <span title="Volume"><Dot on={r.volumeOk} />Vol</span>
      </div>
      <div className="col-span-2 text-center">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${r.regime === 'bull' ? 'bg-emerald-500/15 text-emerald-300' : r.regime === 'bear' ? 'bg-rose-500/15 text-rose-300' : 'bg-slate-700 text-slate-300'}`}>
          {r.regime}
        </span>
      </div>
    </Link>
  );
}

export function ScreenerView({ report }: { report: ScreenerReport }) {
  if (report.dataSource === 'offline') {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
        Krypto-Daten-Provider gerade nicht erreichbar — Screener kann nicht laufen.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-xs">
        <span className="text-slate-400">
          <span className="font-mono text-base font-bold text-white">{report.analyzedCount}</span> Coins gescannt
        </span>
        <span className="text-slate-400">
          <span className={`font-mono text-base font-bold ${report.tradeableCount > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>{report.tradeableCount}</span> tradeable (≥7/12)
        </span>
        <span className="ml-auto font-mono text-[10px] text-slate-600">{new Date(report.generatedAt).toLocaleTimeString('de-DE')}</span>
      </div>

      {report.tradeableCount === 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/15 p-3 text-[11px] text-amber-200/85">
          Aktuell kein Coin über der Trade-Schwelle (7/12). Das ist ein Markt-Signal an sich: breite Schwäche, defensiv bleiben. Die stärksten Kandidaten stehen trotzdem oben — beobachten, nicht erzwingen.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
        <div className="grid grid-cols-12 gap-1 border-b border-slate-800 bg-slate-950/60 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <div className="col-span-2">Coin</div>
          <div className="col-span-2 text-center">Konfluenz</div>
          <div className="col-span-2 text-center">24h</div>
          <div className="col-span-1 text-center">RSI</div>
          <div className="col-span-3 text-center">Trend / Vol</div>
          <div className="col-span-2 text-center">Regime</div>
        </div>
        {report.rows.map((r) => <Row key={r.coinId} r={r} />)}
      </div>

      <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        {`Sortiert nach Konfluenz (12-Punkt-Master-Logik), dann 24h-Performance. „tradeable" = ≥7/12 Bestätigungen, also über der Trade-Schwelle. Tippen öffnet die Chart-Detailseite. Live Bybit/Binance-Daten, kein Versprechen — eigene Prüfung bleibt Pflicht.`}
      </p>
    </div>
  );
}
