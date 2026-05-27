import Link from 'next/link';
import { TopPlay } from '@/lib/analysis/top-play-engine';
import { TradeSignal } from '@/lib/types/domain';
import { SignalSizing } from '@/components/signal-sizing';
import { TakeSignalButton } from '@/components/take-signal-button';
import { Sparkline } from '@/components/sparkline';

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}

function fmtPct(value: number, withSign = true): string {
  const sign = value > 0 && withSign ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function confidenceStyle(c: TopPlay['confidence']): { ring: string; glow: string; label: string; bolts: string; chipBg: string; chipText: string; chipBorder: string; bgGradient: string } {
  switch (c) {
    case 'high':
      return {
        ring: 'border-emerald-400/60',
        glow: 'shadow-2xl shadow-emerald-500/20',
        label: 'High',
        bolts: '⚡⚡⚡',
        chipBg: 'bg-emerald-500/15',
        chipText: 'text-emerald-300',
        chipBorder: 'border-emerald-400/50',
        bgGradient: 'bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950'
      };
    case 'medium':
      return {
        ring: 'border-amber-400/40',
        glow: 'shadow-xl shadow-amber-500/10',
        label: 'Medium',
        bolts: '⚡⚡',
        chipBg: 'bg-amber-500/15',
        chipText: 'text-amber-300',
        chipBorder: 'border-amber-400/50',
        bgGradient: 'bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950'
      };
    case 'low':
      return {
        ring: 'border-slate-700',
        glow: 'shadow-lg shadow-slate-900/30',
        label: 'Low',
        bolts: '⚡',
        chipBg: 'bg-slate-800',
        chipText: 'text-slate-300',
        chipBorder: 'border-slate-600',
        bgGradient: 'bg-gradient-to-br from-slate-900 to-slate-950'
      };
  }
}

function toTradeSignal(play: TopPlay): TradeSignal {
  return {
    assetId: play.coin.id,
    ticker: play.coin.symbol,
    type: play.type,
    entry: play.entry,
    stopLoss: play.stopLoss,
    takeProfit1: play.takeProfit1,
    takeProfit2: play.takeProfit2,
    riskPct: play.riskPct,
    rewardPct1: play.reward1Pct,
    rewardPct2: play.reward2Pct,
    riskRewardRatio: play.riskRewardRatio,
    confidence: play.confidenceScore,
    reasoning: play.reasoning,
    indicators: {
      rsi1h: play.indicators.rsi,
      macdState: play.indicators.macdState,
      trend4h: play.indicators.trend4hUp ? 'up' : play.indicators.trend4hDistancePct < -1 ? 'down' : 'sideways',
      trend4hDistancePct: play.indicators.trend4hDistancePct,
      volumeRatio: play.indicators.volumeRatio
    },
    generatedAt: play.generatedAt
  };
}

export function TopPlayCard({ play }: { play: TopPlay | null }) {
  if (!play) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          Top-Play-Engine offline · Binance-API gerade nicht erreichbar
        </div>
      </section>
    );
  }

  const style = confidenceStyle(play.confidence);
  const signal = toTradeSignal(play);

  return (
    <section className={`relative overflow-hidden rounded-2xl border-2 ${style.ring} ${style.bgGradient} ${style.glow} p-5`}>
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Top Play · Right Now
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">{play.coin.symbol}</h2>
            <span className="font-mono text-sm text-slate-500">/USDT</span>
            <span className="ml-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              {play.type}
            </span>
            <Link
              href={`/assets/${play.coin.symbol.toLowerCase()}`}
              className="ml-1 text-[10px] uppercase tracking-wider text-slate-500 hover:text-emerald-300"
            >
              Chart →
            </Link>
          </div>
          <div className="mt-1 text-xs text-slate-500">{play.coin.name} · 24h {fmtPct(play.ticker.priceChangePct)}</div>
        </div>
        <div className={`flex flex-col items-end rounded-lg border px-3 py-1.5 ${style.chipBorder} ${style.chipBg}`}>
          <div className={`font-mono text-2xl ${style.chipText}`}>{style.bolts}</div>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${style.chipText}`}>{style.label}</div>
          <div className="font-mono text-[10px] text-slate-500">Score {play.confidenceScore}</div>
        </div>
      </div>

      <div className="relative mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">48h Verlauf</div>
        <Sparkline candles={play.sparkline} width={220} height={36} />
      </div>

      <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Entry</div>
          <div className="mt-1 font-mono text-lg font-bold text-white">${fmtPrice(play.entry)}</div>
        </div>
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-rose-400">Stop-Loss</div>
          <div className="mt-1 font-mono text-lg font-bold text-rose-200">${fmtPrice(play.stopLoss)}</div>
          <div className="font-mono text-[10px] text-rose-400">{fmtPct(-play.riskPct)}</div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400">Take-Profit 1</div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-200">${fmtPrice(play.takeProfit1)}</div>
          <div className="font-mono text-[10px] text-emerald-400">{fmtPct(play.reward1Pct)}</div>
        </div>
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-900/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300">Take-Profit 2</div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-100">${fmtPrice(play.takeProfit2)}</div>
          <div className="font-mono text-[10px] text-emerald-300">{fmtPct(play.reward2Pct)}</div>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-slate-400">
        <span>R:R TP1 <span className="text-emerald-300">1:{play.riskRewardRatio.toFixed(1)}</span></span>
        <span>R:R TP2 <span className="text-emerald-300">1:3.0</span></span>
        <span className="text-slate-600">·</span>
        <span>{new Date(play.generatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className="relative mt-4 space-y-1.5 border-t border-slate-800 pt-4">
        {play.reasoning.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
            <span>{r}</span>
          </div>
        ))}
      </div>

      <div className="relative mt-3">
        <SignalSizing signal={signal} />
      </div>
      <div className="relative mt-3">
        <TakeSignalButton signal={signal} />
      </div>
    </section>
  );
}

export function AlternatesList({ alternates }: { alternates: TopPlay[] }) {
  if (alternates.length === 0) return null;
  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Weitere Setups</h3>
      <div className="space-y-2">
        {alternates.map((p) => {
          const style = confidenceStyle(p.confidence);
          return (
            <Link
              key={p.coin.id}
              href={`/assets/${p.coin.symbol.toLowerCase()}`}
              className="group flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2 transition hover:border-slate-700"
            >
              <div className="w-16">
                <div className="font-mono text-sm font-bold text-slate-100">{p.coin.symbol}</div>
                <div className="font-mono text-[10px] text-slate-500">${fmtPrice(p.entry)}</div>
              </div>
              <div className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${style.chipBorder} ${style.chipBg} ${style.chipText}`}>
                {style.bolts} {style.label}
              </div>
              <div className="hidden sm:block">
                <Sparkline candles={p.sparkline} width={80} height={24} showFill={false} />
              </div>
              <div className="flex-1 truncate text-[11px] text-slate-400">{p.reasoning[0] ?? '—'}</div>
              <div className="font-mono text-[10px] text-slate-500 transition group-hover:text-emerald-300">Chart →</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
