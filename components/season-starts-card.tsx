// Karte „Saisonstart Top-5" für die Sommerpause. Zeigt für jede Top-Liga,
// wann der erste Spieltag der neuen Saison ansteht — gibt der leeren
// Sport-Seite eine konkrete Wiederkehr-Erwartung.

import { nextSeasonStarts, daysUntil } from '@/lib/sport/season-starts';

interface Props {
  todayIso: string;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function SeasonStartsCard({ todayIso }: Props) {
  const upcoming = nextSeasonStarts(todayIso);
  if (upcoming.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Saisonstart Top-5</h2>
        <span className="text-[10px] text-slate-500">Saison 2026/27</span>
      </div>
      <ul className="space-y-1">
        {upcoming.map((s) => {
          const d = daysUntil(todayIso, s.iso);
          return (
            <li key={s.league} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
              <span aria-hidden className="text-base leading-none">{s.emoji}</span>
              <span className="min-w-0 truncate text-[11.5px] text-slate-100">
                <span className="font-semibold">{s.league}</span>
                <span className="text-slate-500"> · {s.country}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{fmtDate(s.iso)}</span>
              <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200">
                in {d} Tagen
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Sobald TheSportsDB die ersten Spielansetzungen liefert, taucht hier wieder die echte Topliste auf.
      </p>
    </section>
  );
}
