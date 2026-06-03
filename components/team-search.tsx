'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

interface Props {
  teams: { team: string; league: string }[];
}

// Schnell durch alle Mannschaften der eingebundenen Ligen suchen. Tipp den
// Anfang ein, klick den Treffer, lande auf der Team-Detail-Seite.
export function TeamSearch({ teams }: Props) {
  const [query, setQuery] = useState('');
  const sorted = useMemo(() => {
    const seen = new Set<string>();
    const unique: { team: string; league: string }[] = [];
    for (const t of teams) {
      const key = `${t.team}::${t.league}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(t);
    }
    unique.sort((a, b) => a.team.localeCompare(b.team, 'de'));
    return unique;
  }, [teams]);
  const filtered = query.trim().length === 0 ? [] : sorted.filter((t) => t.team.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12);
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Mannschaft suchen</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Volltext-Suche über alle Teams in den eingebundenen Ligen. Treffer führen direkt zur Detail-Seite.
        </p>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="z. B. Bayern, Liverpool, Inter Miami …"
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
      />
      {filtered.length > 0 && (
        <ul className="space-y-1">
          {filtered.map((t) => (
            <li key={`${t.team}::${t.league}`}>
              <Link
                href={`/sport/team/${encodeURIComponent(t.team)}`}
                className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11.5px] text-slate-100 hover:border-emerald-400/40 hover:text-emerald-200"
              >
                <span className="font-semibold">{t.team}</span>
                <span className="text-[9.5px] uppercase tracking-wider text-slate-500">{t.league}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
