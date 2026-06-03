// Übersicht der 12 WM-Gruppen — kompakt, mobile-first. Host-Nation markiert.
// Steht im /sport-Reiter direkt unter dem WM-Countdown, wenn der noch aktiv ist.

import Link from 'next/link';
import { WM_2026_GROUPS } from '@/lib/sport/wm-groups';

interface Props {
  todayIso: string;
  openingIso?: string; // default 2026-06-11
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

export function WmGroupsOverview({ todayIso, openingIso = '2026-06-11' }: Props) {
  // Nur sichtbar wenn WM aktuell ist (Eröffnung 30 Tage vorher bis Finale +14).
  const daysToOpen = daysBetween(todayIso, openingIso);
  if (daysToOpen > 30 || daysToOpen < -50) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">WM 2026 · Gruppen A–L</h2>
        <Link href="/wm" className="text-[10px] text-emerald-300 hover:text-emerald-200">→ ganzer Plan</Link>
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        48 Mannschaften in 12 Gruppen à 4. Top 2 jeder Gruppe + die 8 besten Dritten ziehen in die K.-o.-Runde ein (32er-Auswahl).
        Mannschaften ohne offizielle Auslosung erscheinen als „TBD“.
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {WM_2026_GROUPS.map((g) => (
          <li key={g.letter} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            <div className="mb-1 flex items-baseline justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Gruppe {g.letter}</span>
              {g.hostFlag && <span className="text-[10px]">{g.hostFlag} Gastgeber</span>}
            </div>
            <ul className="space-y-0.5 text-[10.5px]">
              {g.teams.map((team, i) => (
                <li key={i} className={team === 'TBD' ? 'text-slate-600' : 'text-slate-100'}>
                  {team === 'TBD' ? '— TBD —' : team}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
