// 16 WM-Stadien als ausklappbare Liste pro Gastgeber-Land. Standalone-
// Komponente, server-fähig (statisch).

import { venuesByCountry } from '@/lib/sport/wm-venues';

interface Props {
  todayIso: string;
  openingIso?: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

export function WmVenuesList({ todayIso, openingIso = '2026-06-11' }: Props) {
  const daysToOpen = daysBetween(todayIso, openingIso);
  if (daysToOpen > 30 || daysToOpen < -50) return null;
  const byCountry = venuesByCountry();
  const flags: Record<string, string> = { USA: '🇺🇸', Kanada: '🇨🇦', Mexiko: '🇲🇽' };

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40">
      <summary className="cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Alle 16 WM-Stadien
      </summary>
      <div className="space-y-3 p-4 pt-0">
        {(Object.keys(byCountry) as Array<keyof typeof byCountry>).map((country) => {
          const list = byCountry[country];
          return (
            <div key={country}>
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="text-base">{flags[country]}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">{country}</span>
                <span className="text-[10px] text-slate-500">{list.length} {list.length === 1 ? 'Stadion' : 'Stadien'}</span>
              </div>
              <ul className="space-y-0.5">
                {list.map((v) => (
                  <li key={v.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10.5px]">
                    <span className="min-w-0 truncate text-slate-100">{v.name}</span>
                    <span className="text-slate-500">{v.city}</span>
                    <span className="font-mono text-slate-400">{v.capacity.toLocaleString('de-DE')}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <p className="text-[10px] leading-snug text-slate-500">
          Kapazitäten gerundet. Die größten Stadien (MetLife, AT&T, Azteca) hosten Eröffnung, Halbfinale und Finale.
        </p>
      </div>
    </details>
  );
}
