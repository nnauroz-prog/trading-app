import { TeamStanding } from '@/lib/sport/standings';

export function StandingsTable({ standings }: { standings: TeamStanding[] }) {
  if (standings.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40">
      <table className="w-full text-[10px]">
        <thead className="border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-2 py-1 text-left">#</th>
            <th className="px-2 py-1 text-left">Team</th>
            <th className="px-2 py-1 text-right">Sp</th>
            <th className="px-2 py-1 text-right">S/U/N</th>
            <th className="px-2 py-1 text-right">Tore</th>
            <th className="px-2 py-1 text-right">Diff</th>
            <th className="px-2 py-1 text-right">Pkt</th>
          </tr>
        </thead>
        <tbody>
          {standings.slice(0, 20).map((s, i) => (
            <tr key={s.team} className="border-b border-slate-900 last:border-b-0">
              <td className="px-2 py-1 font-mono text-slate-500">{i + 1}</td>
              <td className="px-2 py-1 text-slate-200">{s.team}</td>
              <td className="px-2 py-1 text-right font-mono text-slate-400">{s.games}</td>
              <td className="px-2 py-1 text-right font-mono text-slate-400">{s.wins}/{s.draws}/{s.losses}</td>
              <td className="px-2 py-1 text-right font-mono text-slate-400">{s.goalsFor}:{s.goalsAgainst}</td>
              <td className={`px-2 py-1 text-right font-mono ${s.goalDiff > 0 ? 'text-emerald-300' : s.goalDiff < 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                {s.goalDiff > 0 ? '+' : ''}{s.goalDiff}
              </td>
              <td className="px-2 py-1 text-right font-mono font-bold text-slate-100">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-2 py-1 text-[9px] text-slate-500">
        Geschätzt aus den letzten Liga-Spielen im Feed — keine offizielle Tabelle.
      </p>
    </div>
  );
}
