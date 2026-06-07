// Badges für US- und Xetra-Markt-Status. Helfen dem User zu sehen, ob die
// Live-Quotes gerade frisch oder nur stale-end-of-day sind.

import type { MarketState, MarketStatus } from '@/lib/market/market-hours';

const STATUS_TONE: Record<MarketStatus, string> = {
  open: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200',
  pre: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  after: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  closed: 'border-slate-700 bg-slate-900 text-slate-400',
  weekend: 'border-slate-700 bg-slate-900 text-slate-400'
};

export function MarketStatusBadges({ states }: { states: MarketState[] }) {
  return (
    <section className="space-y-1.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Markt-Status</h2>
      <ul className="flex flex-wrap gap-1.5">
        {states.map((s) => (
          <li key={s.market}>
            <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider ${STATUS_TONE[s.status]}`} title={s.detail}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'open' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : s.status === 'pre' ? 'bg-sky-400' : s.status === 'after' ? 'bg-amber-400' : 'bg-slate-500'}`} aria-hidden />
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
