import Link from 'next/link';
import type { EmployeeBacktestStat } from '@/lib/sport/firma/employee-backtest';

interface Props {
  stats: EmployeeBacktestStat[];
}

const DEPARTMENT_SHORT: Record<string, string> = {
  chef: 'Chef',
  league_scout: 'Liga-Scout',
  team_analyst: 'Team-Analyse',
  form_analyst: 'Form',
  tactical_analyst: 'Taktik',
  international_watch: 'Int.',
  transfer_watch: 'Transfer',
  politik_watch: 'Politik',
  schedule_gatekeeper: 'Aktualität',
  safety_picker: 'Sicherheit',
  h2h_specialist: 'H2H',
  daily_pick_curator: 'Tag-Pick'
};

// Echtes Backtest-Ergebnis pro Mitarbeiter aus den 3 Saisons. Sortiert nach
// Trefferquote, nur Mitarbeiter mit relevanter Sample-Größe.
export function EmployeeLeaderboard({ stats }: Props) {
  const eligible = stats.filter((s) => s.totalVotes >= 15 && s.hitRatePct !== null);
  const sorted = [...eligible].sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0) || b.totalVotes - a.totalVotes);

  if (sorted.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border-2 border-sky-400/40 bg-slate-900/60 p-4">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Wer liegt historisch wie oft richtig?</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">
          Echter Backtest auf den letzten 3 Saisons. Pro Mitarbeiter:in werden alle abgegebenen Stimmen gegen tatsächliche Endergebnisse geprüft — Lookahead-frei, weil pro Spiel nur die davor liegenden Daten als Context genutzt werden.
        </p>
      </header>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Gesamtes Ranking — {sorted.length} Mitarbeiter:innen</div>
          <div className="text-[9.5px] text-slate-500">sortiert nach Trefferquote</div>
        </div>
        <ul className="space-y-1">
          {sorted.map((s, i) => {
            const rate = s.hitRatePct ?? 0;
            const isTop10 = i < 10;
            const isBottom5 = i >= sorted.length - 5 && sorted.length > 10;
            const accent = isTop10
              ? 'border-emerald-400/40 hover:border-emerald-400/70'
              : isBottom5
                ? 'border-rose-400/30 hover:border-rose-400/60'
                : 'border-slate-800 hover:border-slate-600';
            const rankColor = isTop10 ? 'text-emerald-300' : isBottom5 ? 'text-rose-300' : 'text-slate-500';
            const rateColor = isTop10 && rate >= 60
              ? 'text-emerald-300'
              : isBottom5
                ? 'text-rose-300'
                : rate >= 50
                  ? 'text-amber-300'
                  : 'text-slate-400';
            return (
              <li key={s.employeeId}>
                <Link href={`/sport/firma/${s.employeeId}`} className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border bg-slate-950/40 px-2.5 py-1.5 text-[11px] ${accent}`}>
                  <span className={`font-mono text-[10px] ${rankColor}`}>#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-100">{s.employeeName}</div>
                    <div className="truncate text-[9.5px] text-slate-500">{DEPARTMENT_SHORT[s.department] ?? s.department} · {s.totalVotes} Stimmen</div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{s.rightVotes}/{s.totalVotes}</span>
                  <span className={`font-mono text-[11px] font-bold ${rateColor}`}>
                    {s.hitRatePct?.toFixed(1)} %
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-[10px] leading-snug text-slate-500">
        Sample-Quality: gut ≥50 Stimmen · mittel ≥15 · schwach &lt;15. Mitarbeiter unter 15 sind hier ausgeblendet. Grün = Top 10, Rot = unteres Quintil.
      </p>
    </section>
  );
}
