// Vergleicht eine einzelne Aktie mit dem Schnitt ihres Sektors anhand der
// Sicherheits-Scores aus dem 8-Punkt-Gate. Server-Komponente, presentational.

import Link from 'next/link';
import type { StockSafetyEntry } from '@/lib/market/stock-safety-scan';

interface Props {
  symbol: string;
  group: string;
  ownScore: number;
  peers: StockSafetyEntry[]; // alle Aktien aus dem gleichen Sektor (inkl. der eigenen)
}

export function SectorPeerComparison({ symbol, group, ownScore, peers }: Props) {
  if (peers.length < 2) return null;

  const peerScores = peers.map((p) => p.assessment.score);
  const avg = peerScores.reduce((s, v) => s + v, 0) / peerScores.length;
  // Wo steht die eigene Aktie im Sektor-Ranking?
  const sortedDesc = [...peers].sort((a, b) => b.assessment.score - a.assessment.score);
  const rank = sortedDesc.findIndex((p) => p.symbol === symbol) + 1;
  const total = peers.length;
  const aboveAvg = ownScore > avg;

  const topThree = sortedDesc.slice(0, 3);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Sektor-Vergleich · {group}</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Wo steht diese Aktie im Vergleich zum Branchen-Durchschnitt?
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Diese Aktie" value={`${Math.round(ownScore)}/100`} tone={aboveAvg ? 'good' : 'neutral'} />
        <Stat label={`Ø ${group}`} value={`${Math.round(avg)}/100`} tone="neutral" />
        <Stat label="Rang im Sektor" value={`#${rank} von ${total}`} tone={rank <= Math.ceil(total / 3) ? 'good' : rank > Math.ceil((2 * total) / 3) ? 'bad' : 'neutral'} />
      </div>
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Top 3 im Sektor</h3>
        <ul className="mt-1 space-y-1">
          {topThree.map((p) => (
            <li key={p.symbol}>
              <Link
                href={`/aktien/${encodeURIComponent(p.symbol)}`}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px] transition hover:brightness-110"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-100">{p.name}</span>
                  <span className="block text-[9.5px] text-slate-500">{p.symbol}</span>
                </span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  p.assessment.grade === 'A' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                    : p.assessment.grade === 'B' ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                    : p.assessment.grade === 'C' ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                    : 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                }`}>
                  {p.assessment.grade} · {p.assessment.score}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-200';
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}
