// Sektor-Heatmap: zeigt für jede Gruppe (Edelmetalle, Energie, …) den
// gewichteten Tages-Durchschnitt als farbigen Balken. Mit einem Blick
// erkennt der User, ob ein ganzer Sektor heute rot oder grün ist.

import type { MarketQuote } from '@/lib/market/yahoo-quote';

interface GroupBucket {
  name: string;
  avgChangePct: number;
  liveCount: number;
  totalCount: number;
}

interface Props {
  buckets: GroupBucket[];
  title?: string;
}

export type { GroupBucket };

function tone(avg: number): { bar: string; text: string; label: string } {
  if (avg >= 1.5) return { bar: 'bg-emerald-500/70', text: 'text-emerald-300', label: 'stark grün' };
  if (avg >= 0.3) return { bar: 'bg-emerald-500/40', text: 'text-emerald-300', label: 'grün' };
  if (avg > -0.3) return { bar: 'bg-slate-500/40', text: 'text-slate-300', label: 'neutral' };
  if (avg > -1.5) return { bar: 'bg-rose-500/40', text: 'text-rose-300', label: 'rot' };
  return { bar: 'bg-rose-500/70', text: 'text-rose-300', label: 'stark rot' };
}

export function SectorHeatmap({ buckets, title = 'Sektor-Heatmap' }: Props) {
  if (buckets.length === 0) return null;
  const activeBuckets = buckets.filter((b) => b.liveCount > 0);
  if (activeBuckets.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{title}</h2>
        <span className="text-[10px] text-slate-500">{activeBuckets.length} Sektor{activeBuckets.length === 1 ? '' : 'en'}</span>
      </div>
      <ul className="space-y-1.5">
        {activeBuckets.map((b) => {
          const t = tone(b.avgChangePct);
          // Balken-Breite proportional zu |Durchschnitt|, capped bei 6 %.
          const widthPct = Math.min(100, (Math.abs(b.avgChangePct) / 6) * 100);
          return (
            <li key={b.name} className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px]">
              <div className="min-w-0">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-100">{b.name}</span>
                  <span className={`font-mono text-[10.5px] ${t.text}`}>
                    {b.avgChangePct >= 0 ? '+' : ''}{b.avgChangePct.toFixed(2)} %
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                  <div
                    className={t.bar}
                    style={{
                      width: `${widthPct}%`,
                      height: '100%',
                      marginLeft: b.avgChangePct < 0 ? `${100 - widthPct}%` : '0'
                    }}
                  />
                </div>
              </div>
              <span className="text-[9.5px] uppercase tracking-wider text-slate-500">
                {b.liveCount}/{b.totalCount}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Durchschnittliche Tagesveränderung pro Sektor. Balken links = rot, rechts = grün. Cap ±6 %.
      </p>
    </section>
  );
}

// Helper: Quote-Listen pro Gruppe in GroupBuckets aggregieren.
export function aggregateBuckets<G extends string>(
  items: Array<{ group: G; quote: MarketQuote | null }>,
  groupOrder: G[]
): GroupBucket[] {
  return groupOrder.map((group) => {
    const groupItems = items.filter((i) => i.group === group);
    const live = groupItems.filter((i) => i.quote !== null);
    const avg = live.length > 0
      ? live.reduce((sum, i) => sum + (i.quote!.changePct), 0) / live.length
      : 0;
    return {
      name: group,
      avgChangePct: avg,
      liveCount: live.length,
      totalCount: groupItems.length
    };
  });
}
