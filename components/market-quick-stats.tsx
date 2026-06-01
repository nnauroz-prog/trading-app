interface Props {
  fearGreed: number | null;
  btcDominancePct: number | null;
  fundingBtcAnnualizedPct: number | null;
  fundingEthAnnualizedPct: number | null;
}

// Kompakter Marktdaten-Streifen ganz oben, damit zentrale Crypto-Indikatoren
// auf einen Blick da sind — F&G, BTC-Dominanz, Funding BTC/ETH.
export function MarketQuickStats({ fearGreed, btcDominancePct, fundingBtcAnnualizedPct, fundingEthAnnualizedPct }: Props) {
  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat
        label="Fear & Greed"
        value={fearGreed !== null ? `${fearGreed}/100` : '—'}
        tone={fearGreed === null ? 'neutral' : fearGreed >= 75 ? 'bad' : fearGreed <= 25 ? 'good' : 'neutral'}
      />
      <Stat
        label="BTC-Dominanz"
        value={btcDominancePct !== null ? `${btcDominancePct.toFixed(1)}%` : '—'}
        tone="neutral"
      />
      <Stat
        label="Funding BTC"
        value={fundingBtcAnnualizedPct !== null ? `${fundingBtcAnnualizedPct.toFixed(1)}%` : '—'}
        tone={fundingBtcAnnualizedPct === null ? 'neutral' : fundingBtcAnnualizedPct >= 25 ? 'bad' : fundingBtcAnnualizedPct <= -10 ? 'good' : 'neutral'}
      />
      <Stat
        label="Funding ETH"
        value={fundingEthAnnualizedPct !== null ? `${fundingEthAnnualizedPct.toFixed(1)}%` : '—'}
        tone={fundingEthAnnualizedPct === null ? 'neutral' : fundingEthAnnualizedPct >= 25 ? 'bad' : fundingEthAnnualizedPct <= -10 ? 'good' : 'neutral'}
      />
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-100';
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</div>
    </div>
  );
}
