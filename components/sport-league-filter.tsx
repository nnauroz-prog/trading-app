'use client';

import { useState, useMemo } from 'react';
import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';

interface Props {
  leagues: LeagueFixtures[];
}

// Kompakter Liga-Filter: User wählt eine oder „alle". Bei einer Liga werden
// nur deren anstehende Spiele angezeigt. Reine Client-Logik mit useMemo.
export function SportLeagueFilter({ leagues }: Props) {
  const [selected, setSelected] = useState<string>('ALLE');
  const options = useMemo(() => {
    const list = leagues
      .filter((l) => l.next.length > 0)
      .map((l) => ({ id: l.league.id, label: `${l.league.name} (${l.next.length})` }));
    list.sort((a, b) => a.label.localeCompare(b.label, 'de'));
    return list;
  }, [leagues]);
  const fixtures = useMemo<UpcomingFixture[]>(() => {
    const filtered = selected === 'ALLE'
      ? leagues.flatMap((l) => l.next)
      : leagues.find((l) => l.league.id === selected)?.next ?? [];
    return filtered.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  }, [leagues, selected]);

  if (options.length === 0) return null;
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Liga-Filter</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Nur eine Liga ansehen? Wähle sie aus — sonst sind alle aktiven Ligen drin. Sortiert chronologisch nach Anstoßzeit.
        </p>
      </header>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
      >
        <option value="ALLE">Alle aktiven Ligen ({leagues.reduce((s, l) => s + l.next.length, 0)} Spiele)</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <p className="text-[10px] text-slate-500">
        Aktive Auswahl: <span className="font-mono text-slate-300">{fixtures.length} Spiele</span>
      </p>
    </section>
  );
}
