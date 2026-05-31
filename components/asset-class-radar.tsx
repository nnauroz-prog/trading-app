import Link from 'next/link';

export type AssetClassStatus = 'stark' | 'neutral' | 'schwach' | 'keine_daten';

export interface AssetClassCard {
  klass: 'crypto' | 'stocks' | 'gold' | 'cash';
  label: string;
  status: AssetClassStatus;
  topCandidate: string | null;
  goodSetupsCount: number;
  riskLevel: 'niedrig' | 'mittel' | 'hoch';
  action: string;
  href: string | null;
  note?: string;
}

function statusClasses(s: AssetClassStatus): string {
  if (s === 'stark') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  if (s === 'schwach') return 'border-rose-400/50 bg-rose-500/15 text-rose-200';
  if (s === 'keine_daten') return 'border-slate-800 bg-slate-950 text-slate-500';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function statusLabel(s: AssetClassStatus): string {
  if (s === 'stark') return 'stark';
  if (s === 'schwach') return 'schwach';
  if (s === 'keine_daten') return 'keine Daten';
  return 'neutral';
}

function riskClasses(r: 'niedrig' | 'mittel' | 'hoch'): string {
  if (r === 'niedrig') return 'text-emerald-300';
  if (r === 'hoch') return 'text-rose-300';
  return 'text-amber-300';
}

export function AssetClassRadar({ cards }: { cards: AssetClassCard[] }) {
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Multi-Asset-Radar</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((c) => {
          const inner = (
            <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3 transition hover:border-emerald-400/30">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-bold text-white">{c.label}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusClasses(c.status)}`}>
                  {statusLabel(c.status)}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                {c.topCandidate && (
                  <span className="font-mono text-slate-300">Top: {c.topCandidate}</span>
                )}
                <span>{c.goodSetupsCount} {c.goodSetupsCount === 1 ? 'Setup' : 'Setups'}</span>
                <span className={riskClasses(c.riskLevel)}>Risiko {c.riskLevel}</span>
              </div>
              <p className="text-[11px] text-slate-200">{c.action}</p>
              {c.note && <p className="text-[10px] italic text-slate-500">{c.note}</p>}
            </div>
          );
          return c.href ? (
            <Link key={c.klass} href={c.href} className="block">{inner}</Link>
          ) : (
            <div key={c.klass}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
