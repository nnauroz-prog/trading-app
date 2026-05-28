import { BtcDominanceSnapshot, FearGreedSnapshot } from '@/lib/providers/sentiment-indicators';

function fgColor(value: number): { bg: string; ring: string; text: string; label: string } {
  if (value >= 75) return { bg: 'bg-emerald-500/20', ring: 'border-emerald-400/50', text: 'text-emerald-200', label: 'Extreme Greed' };
  if (value >= 55) return { bg: 'bg-emerald-500/15', ring: 'border-emerald-500/40', text: 'text-emerald-300', label: 'Greed' };
  if (value >= 45) return { bg: 'bg-amber-500/15', ring: 'border-amber-500/40', text: 'text-amber-300', label: 'Neutral' };
  if (value >= 25) return { bg: 'bg-orange-500/15', ring: 'border-orange-500/40', text: 'text-orange-300', label: 'Fear' };
  return { bg: 'bg-rose-500/20', ring: 'border-rose-500/50', text: 'text-rose-200', label: 'Extreme Fear' };
}

function fgInterpretation(value: number): string {
  if (value >= 75) return 'Extreme Gier — historisch korrigiert der Markt aus dieser Zone. Vorsicht mit neuen Long-Entries, Profit-Sicherung lohnt.';
  if (value >= 55) return 'Gierig — Markt optimistisch, aber noch nicht überhitzt. Trades brauchen mehr Konfluenz als üblich.';
  if (value >= 45) return 'Neutral — kein klares Sentiment-Signal. Setups stehen auf eigenem Merit.';
  if (value >= 25) return 'Angst — historisch oft Kaufzonen für mittelfristige Investoren. Kurzfristig kann Schwäche weitergehen.';
  return 'Extreme Angst — historisch oft Boden-Signale. DCA-Strategie statt All-in.';
}

export function MarketPulseTile({
  fearGreed,
  btcDominance
}: {
  fearGreed: FearGreedSnapshot | null;
  btcDominance: BtcDominanceSnapshot | null;
}) {
  const allOffline = !fearGreed && !btcDominance;
  if (allOffline) return null;

  const fg = fearGreed ? fgColor(fearGreed.value) : null;
  const btcD = btcDominance;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Market Pulse</h2>
        <span className="font-mono text-[10px] text-slate-600">Live · alternative.me · CoinGecko</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fearGreed && fg && (
          <div className={`rounded-xl border ${fg.ring} ${fg.bg} p-4`}>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Fear &amp; Greed</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${fg.text}`}>{fg.label}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className={`font-mono text-4xl font-bold ${fg.text}`}>{fearGreed.value}</span>
              <span className="font-mono text-xs text-slate-500">/ 100</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950">
              <div className={`h-full ${fg.text.replace('text-', 'bg-')}`} style={{ width: `${fearGreed.value}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{fgInterpretation(fearGreed.value)}</p>
            <div className="mt-1 font-mono text-[10px] text-slate-600">
              {new Date(fearGreed.timestamp).toLocaleString('de-DE')}
            </div>
          </div>
        )}

        {btcD && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-400">BTC Dominance</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">{btcD.marketCapChange24hPct >= 0 ? '↗' : '↘'} 24h Total MC {btcD.marketCapChange24hPct.toFixed(2)}%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-mono text-4xl font-bold text-amber-300">{btcD.btcDominancePct.toFixed(1)}<span className="text-xl text-slate-500">%</span></span>
              <span className="font-mono text-xs text-slate-500">ETH {btcD.ethDominancePct.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full bg-amber-400" style={{ width: `${btcD.btcDominancePct}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              {btcD.btcDominancePct > 55
                ? 'BTC.D hoch — Liquidität in BTC konzentriert, Alts historisch schwach. Schwierige Phase für Altcoin-Trades.'
                : btcD.btcDominancePct > 45
                ? 'BTC.D moderat — neutraler Markt zwischen BTC und Alts. Selektive Alt-Setups möglich.'
                : 'BTC.D niedrig — Kapital fließt in Alts. Historisch späte Zyklus-Phase, Alt-Season-typische Konstellation.'}
            </p>
            <div className="mt-1 font-mono text-[10px] text-slate-600">
              Total Market-Cap: ${(btcD.totalMarketCapUsd / 1_000_000_000_000).toFixed(2)}T
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
