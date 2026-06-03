// Großes ehrliches Banner ganz oben am Sport-Reiter, wenn praktisch nichts
// anliegt — typisch Anfang Juni, wenn Top-Ligen Sommerpause haben und die
// Sommer-aktiven Ligen (MLS, Brasileirão, J1, A-League) bei TheSportsDB
// nicht zuverlässig aktualisiert werden.

import type { LeagueFixtures } from '@/lib/sport/fetcher';

interface Props {
  leagues: LeagueFixtures[];
  todayIso: string;
}

export function SummerModeBanner({ leagues, todayIso }: Props) {
  const today = new Date(`${todayIso}T00:00:00`).getTime();
  const horizon = today + 7 * 24 * 60 * 60 * 1000;
  let upcomingCount = 0;
  let activeLeagues = 0;
  for (const lf of leagues) {
    let hasUpcoming = false;
    for (const f of lf.next) {
      const t = new Date(`${f.date}T00:00:00`).getTime();
      if (t >= today && t <= horizon) {
        upcomingCount += 1;
        hasUpcoming = true;
      }
    }
    if (hasUpcoming) activeLeagues += 1;
  }

  if (upcomingCount >= 15) return null;

  if (upcomingCount === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-amber-500/40 bg-amber-950/15 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Sommer-Modus</div>
        <h2 className="text-lg font-bold tracking-tight text-amber-100">Aktuell keine Spiele in den eingebundenen Ligen</h2>
        <p className="text-[11.5px] leading-snug text-amber-100/85">
          Top-Ligen (Bundesliga, Premier League, La Liga, Serie A, Ligue 1) sind in Sommerpause.
          Saisonstart liegt typischerweise zwischen Mitte August und Anfang September. Die Sommer-aktiven
          Ligen (MLS, Brasileirão, J1, A-League) hat unser Daten-Anbieter TheSportsDB nur lückenhaft —
          deshalb wirkt der Reiter heute leer.
        </p>
        <p className="text-[11px] leading-snug text-amber-100/70">
          Tipps aus dem Tipp-Tagebuch werden trotzdem automatisch ausgewertet, sobald Ergebnisse reinkommen.
          Du kannst die Tipprunde-Statistik unten aktiviert lassen und ab Saisonstart sofort weitermachen.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-1 rounded-2xl border border-sky-500/30 bg-sky-950/15 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">dünne Spielwoche</div>
      <p className="text-[11px] leading-snug text-sky-100/85">
        Nur <span className="font-semibold text-sky-50">{upcomingCount}</span> Spiele in den nächsten 7 Tagen verteilt auf {activeLeagues} {activeLeagues === 1 ? 'Liga' : 'Ligen'}.
        Saison-Übergang — die meisten Top-Ligen sind in Pause, einzelne Pokal- oder Sommer-Ligen liefern noch.
      </p>
    </section>
  );
}
