import type { LeagueSeasonStats } from '@/lib/sport/firma/season-stats';

interface Props {
  stats: LeagueSeasonStats[];
}

// Liga-Grundwerte aus drei Saisons. Was passiert im Schnitt in dieser Liga?
// Hilft beim Einordnen: "Bundesliga 3.1 Tore/Spiel" — also tor-reich.
export function LeagueSeasonStatsCard({ stats }: Props) {
  if (stats.length === 0) return null;
  const sorted = [...stats].sort((a, b) => b.played - a.played);
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Liga-Grundwerte (3 Saisons)</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Echte Durchschnittswerte aus den letzten drei Spielzeiten pro Liga. Hilft beim Einordnen: tor-reich vs. defensiv, Heim-Stadion stark vs. neutral, häufige Über-2.5-Spiele oder eher knappe Begegnungen.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-[9.5px] uppercase tracking-wider text-slate-500">
              <th className="pb-1.5 pr-2">Liga</th>
              <th className="pb-1.5 pr-2 text-right">Spiele</th>
              <th className="pb-1.5 pr-2 text-right">Tore/Spiel</th>
              <th className="pb-1.5 pr-2 text-right">Heim</th>
              <th className="pb-1.5 pr-2 text-right">Remis</th>
              <th className="pb-1.5 pr-2 text-right">Auswärts</th>
              <th className="pb-1.5 pr-2 text-right">BTTS</th>
              <th className="pb-1.5 text-right">Über 2.5</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.league} className="border-t border-slate-800/60">
                <td className="py-1.5 pr-2 font-semibold text-slate-100">{s.league}</td>
                <td className="py-1.5 pr-2 text-right font-mono text-slate-300">{s.played.toLocaleString('de-DE')}</td>
                <td className="py-1.5 pr-2 text-right font-mono text-emerald-300">{s.goalsPerMatch.toFixed(2)}</td>
                <td className="py-1.5 pr-2 text-right font-mono text-slate-300">{s.homeWinPct}%</td>
                <td className="py-1.5 pr-2 text-right font-mono text-slate-400">{s.drawPct}%</td>
                <td className="py-1.5 pr-2 text-right font-mono text-slate-300">{s.awayWinPct}%</td>
                <td className="py-1.5 pr-2 text-right font-mono text-slate-200">{s.bttsPct}%</td>
                <td className="py-1.5 text-right font-mono text-slate-200">{s.over25Pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
