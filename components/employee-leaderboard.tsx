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
  const top10 = sorted.slice(0, 10);
  const bottom5 = sorted.slice(-5).reverse();

  if (top10.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Mitarbeiter-Erfolgsquoten</h2>
        <p className="mt-1 text-[11px] text-slate-400">
          Noch zu wenig historische Spiele für einen sinnvollen Backtest. Sobald die Saison-Endpoints mehr Daten liefern, erscheinen hier die echten Hit-Rates pro Mitarbeiter:in.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border-2 border-sky-400/40 bg-slate-900/60 p-4">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Wer liegt historisch wie oft richtig?</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">
          Echter Backtest auf den letzten 3 Saisons. Pro Mitarbeiter:in werden alle abgegebenen Stimmen gegen tatsächliche Endergebnisse geprüft — Lookahead-frei, weil pro Spiel nur die davor liegenden Daten als Context genutzt werden.
        </p>
      </header>

      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">🏆 Top 10 — beste Trefferquoten</div>
        <ul className="space-y-1">
          {top10.map((s, i) => (
            <li key={s.employeeId}>
              <Link href={`/sport/firma/${s.employeeId}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px] hover:border-emerald-400/40">
                <span className="font-mono text-[10px] text-emerald-300">#{i + 1}</span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-100">{s.employeeName}</div>
                  <div className="truncate text-[9.5px] text-slate-500">{DEPARTMENT_SHORT[s.department] ?? s.department} · {s.totalVotes} Stimmen</div>
                </div>
                <span className="font-mono text-[10px] text-slate-400">{s.rightVotes}/{s.totalVotes}</span>
                <span className={`font-mono text-[11px] font-bold ${(s.hitRatePct ?? 0) >= 60 ? 'text-emerald-300' : (s.hitRatePct ?? 0) >= 50 ? 'text-amber-300' : 'text-slate-400'}`}>
                  {s.hitRatePct?.toFixed(1)} %
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">📉 5 schwächste Trefferquoten</div>
        <ul className="space-y-1">
          {bottom5.map((s) => (
            <li key={s.employeeId}>
              <Link href={`/sport/firma/${s.employeeId}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px] hover:border-rose-400/40">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-100">{s.employeeName}</div>
                  <div className="truncate text-[9.5px] text-slate-500">{DEPARTMENT_SHORT[s.department] ?? s.department} · {s.totalVotes} Stimmen</div>
                </div>
                <span className="font-mono text-[10px] text-slate-400">{s.rightVotes}/{s.totalVotes}</span>
                <span className="font-mono text-[11px] font-bold text-rose-300">{s.hitRatePct?.toFixed(1)} %</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] leading-snug text-slate-500">
        Sample-Quality: gut ≥50 Stimmen · mittel ≥15 · schwach &lt;15. Mitarbeiter unter 15 sind hier ausgeblendet.
      </p>
    </section>
  );
}
