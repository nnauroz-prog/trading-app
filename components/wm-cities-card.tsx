// Welche Stadien haben die meisten WM-Spiele? Zeigt Top-Venues sortiert
// nach Match-Count. Hilft beim Reise-Planen.

import { fixturesByCity } from '@/lib/sport/wm-city-filter';

interface Props {
  todayIso: string;
  openingIso?: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

export function WmCitiesCard({ todayIso, openingIso = '2026-06-11' }: Props) {
  const daysToOpen = daysBetween(todayIso, openingIso);
  if (daysToOpen > 30 || daysToOpen < -50) return null;

  const cities = fixturesByCity(todayIso);
  if (cities.length === 0) return null;

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-emerald-300 hover:text-emerald-200">
        ▸ WM-Top-Stadien (nach Spiel-Anzahl)
      </summary>
      <ul className="mt-2 space-y-1">
        {cities.map((c) => (
          <li key={c.venue} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
            <span className="min-w-0">
              <span className="block truncate text-slate-100">{c.venue.split(',')[0]}</span>
              <span className="text-[10px] text-slate-500">{c.city}</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">{c.upcoming.length} kommen</span>
            <span className="rounded-md border border-sky-400/40 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-200">{c.matchCount} ges.</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Basiert auf dem hardkodierten WM-Spielplan. Stadt-Namen werden aus den Venues extrahiert.
      </p>
    </details>
  );
}
