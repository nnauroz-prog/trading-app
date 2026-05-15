import { SignalReport } from '@/lib/analysis/signal-engine';
import { TradeSignal } from '@/lib/types/domain';

function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function formatPct(value: number, withSign = true): string {
  const sign = value > 0 && withSign ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function confidenceColor(c: number): string {
  if (c >= 70) return 'text-emerald-300';
  if (c >= 60) return 'text-emerald-400';
  if (c >= 50) return 'text-amber-300';
  return 'text-rose-300';
}

function SignalCard({ signal }: { signal: TradeSignal }) {
  const risk = signal.entry - signal.stopLoss;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 p-5 shadow-2xl shadow-emerald-500/10 transition hover:border-emerald-400/50">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">{signal.ticker}/USDT</span>
            <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              {signal.type}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-xs text-slate-500">
            {new Date(signal.generatedAt).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-2xl font-bold ${confidenceColor(signal.confidence)}`}>{signal.confidence}%</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Konfidenz</div>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Entry</div>
          <div className="mt-1 font-mono text-lg font-bold text-white">${formatPrice(signal.entry)}</div>
        </div>
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-rose-400">Stop-Loss</div>
          <div className="mt-1 font-mono text-lg font-bold text-rose-200">${formatPrice(signal.stopLoss)}</div>
          <div className="font-mono text-xs text-rose-400">{formatPct(-signal.riskPct)}</div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400">Take-Profit 1</div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-200">${formatPrice(signal.takeProfit1)}</div>
          <div className="font-mono text-xs text-emerald-400">{formatPct(signal.rewardPct1)}</div>
        </div>
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-900/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300">Take-Profit 2</div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-100">${formatPrice(signal.takeProfit2)}</div>
          <div className="font-mono text-xs text-emerald-300">{formatPct(signal.rewardPct2)}</div>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-mono text-slate-400">
          Risk: <span className="text-rose-300">${formatPrice(risk)}</span>
        </span>
        <span className="font-mono text-slate-400">
          R:R TP1 <span className="text-emerald-300">1:{signal.riskRewardRatio.toFixed(1)}</span>
        </span>
        <span className="font-mono text-slate-400">
          R:R TP2 <span className="text-emerald-300">1:3.0</span>
        </span>
      </div>

      <div className="relative mt-4 space-y-1.5 border-t border-slate-800 pt-4">
        {signal.reasoning.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
            <span>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusRow({ status }: { status: SignalReport['statuses'][number] }) {
  const chip = (label: string, ok: boolean, value: string) => (
    <div className={`rounded-md border px-2 py-1 font-mono text-[11px] ${ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
      <span className="text-slate-500">{label}</span> {value}
    </div>
  );
  const rsiOk = status.rsi1h !== null && status.rsi1h >= 30 && status.rsi1h <= 55;
  const macdOk = status.macdState === 'bullish_cross' || status.macdState === 'bullish';
  const trendOk = status.trend4h === 'up';
  const volOk = status.volumeRatio !== null && status.volumeRatio >= 1.3;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
      <div className="w-20">
        <div className="font-bold text-slate-200">{status.ticker}</div>
        <div className="font-mono text-xs text-slate-500">{status.lastPrice ? `$${formatPrice(status.lastPrice)}` : '—'}</div>
      </div>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {chip('RSI', rsiOk, status.rsi1h !== null ? status.rsi1h.toFixed(0) : '—')}
        {chip('MACD', macdOk, status.macdState ?? '—')}
        {chip('4h', trendOk, status.trend4h ?? '—')}
        {chip('Vol', volOk, status.volumeRatio !== null ? `${status.volumeRatio.toFixed(2)}x` : '—')}
      </div>
      <div className="w-16 text-right">
        <div className={`font-mono text-sm font-bold ${status.confluence >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>{status.confluence}/4</div>
      </div>
    </div>
  );
}

export function SignalBoard({ report }: { report: SignalReport }) {
  if (report.dataSource === 'offline') {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          <span className="text-sm text-slate-300">Signal-Engine offline — Binance-API gerade nicht erreichbar. Retry beim nächsten Page-Load.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
            Aktive Signale
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            TA-Konfluenz auf 1h + 4h • Data: Binance Spot • Re-Check alle 60s
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
          {new Date(report.generatedAt).toLocaleTimeString('de-DE')}
        </div>
      </div>

      {report.signals.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6">
          <div className="text-sm text-slate-400">
            <span className="font-semibold text-slate-200">Keine aktiven Signale.</span> Mindestens 3 von 4 Indikatoren müssen aligned sein (RSI 30-55, MACD bullish, 4h-Trend up, Volume-Spike). Status unten zeigt warum.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {report.signals.map((s) => (
            <SignalCard key={s.assetId} signal={s} />
          ))}
        </div>
      )}

      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Indikator-Status (Live)</h3>
        {report.statuses.map((s) => (
          <StatusRow key={s.assetId} status={s} />
        ))}
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-amber-200/80">
        <strong className="text-amber-300">Disclaimer:</strong> Keine Finanzberatung. Signale basieren auf historischer Technischer Analyse, keine Erfolgs-Garantie. Realistische Win-Rate bei dieser Konfluenz-Logik liegt bei 50-65%. Trade nur mit Geld, dessen Verlust du verkraftest, und respektiere den Stop-Loss religiös.
      </div>
    </section>
  );
}
