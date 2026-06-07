// Verteilung der Sicherheits-Grades pro Rohstoff-Gruppe. Wie SectorSafetyHeatmap,
// aber auf den CommoditySafetyEntry-Daten.

import type { CommoditySafetyEntry } from '@/lib/market/commodity-safety-scan';

interface GroupRow {
  group: string;
  total: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

function summarize(entries: CommoditySafetyEntry[]): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const e of entries) {
    let row = map.get(e.group);
    if (!row) {
      row = { group: e.group, total: 0, a: 0, b: 0, c: 0, d: 0 };
      map.set(e.group, row);
    }
    row.total++;
    if (e.assessment.grade === 'A') row.a++;
    else if (e.assessment.grade === 'B') row.b++;
    else if (e.assessment.grade === 'C') row.c++;
    else row.d++;
  }
  return [...map.values()].sort((x, y) => {
    if (y.a !== x.a) return y.a - x.a;
    if (y.b !== x.b) return y.b - x.b;
    return x.group.localeCompare(y.group);
  });
}

export function CommoditySectorSafetyHeatmap({ entries }: { entries: CommoditySafetyEntry[] }) {
  if (entries.length === 0) return null;
  const rows = summarize(entries);
  const totalA = rows.reduce((s, r) => s + r.a, 0);
  const totalB = rows.reduce((s, r) => s + r.b, 0);
  const totalC = rows.reduce((s, r) => s + r.c, 0);
  const totalD = rows.reduce((s, r) => s + r.d, 0);
  const total = totalA + totalB + totalC + totalD;
  if (total === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Gruppen-Sicherheits-Heatmap</h2>
        <span className="text-[10px] text-slate-500">{totalA}A · {totalB}B · {totalC}C · {totalD}D</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Pro Rohstoff-Gruppe (Edelmetalle, Energie, Industriemetalle, Agrar) die Verteilung der 8-Punkt-Sicherheits-Grades.
        Grün = Grade A (alle Kriterien), blau = B, gelb = C, rot = D.
      </p>
      <ul className="space-y-1">
        {rows.map((r) => {
          const pctA = (r.a / r.total) * 100;
          const pctB = (r.b / r.total) * 100;
          const pctC = (r.c / r.total) * 100;
          const pctD = (r.d / r.total) * 100;
          return (
            <li key={r.group} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
              <div className="min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold text-slate-100">{r.group}</span>
                  <span className="font-mono text-[9.5px] text-slate-500">{r.total} Rohstoff{r.total === 1 ? '' : 'e'}</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-800">
                  {pctA > 0 && <div style={{ width: `${pctA}%` }} className="bg-emerald-400/80" title={`${r.a} × A`} />}
                  {pctB > 0 && <div style={{ width: `${pctB}%` }} className="bg-sky-400/70" title={`${r.b} × B`} />}
                  {pctC > 0 && <div style={{ width: `${pctC}%` }} className="bg-amber-400/70" title={`${r.c} × C`} />}
                  {pctD > 0 && <div style={{ width: `${pctD}%` }} className="bg-rose-500/70" title={`${r.d} × D`} />}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9.5px]">
                <span className="text-emerald-300">{r.a}A</span>
                <span className="text-sky-300">{r.b}B</span>
                <span className="text-amber-300">{r.c}C</span>
                <span className="text-rose-300">{r.d}D</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
