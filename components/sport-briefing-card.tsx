import Link from 'next/link';
import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';
import type { EmployeeBacktestStat } from '@/lib/sport/firma/employee-backtest';

interface SportBriefingProps {
  synth: FirmaSynthesis;
  todayFixtures: number;
  // Optional: aggregierter Track-Record der Sport-Mitarbeiter. Wenn vorhanden,
  // zeigt die Karte eine Track-Record-Zeile ein. So fliessen die Backtest-
  // Daten von /sport/firma auch in die Home-Empfehlung.
  employeeStats?: EmployeeBacktestStat[];
}

// Mini-Karte für die Startseite: kurzer Sport-Tagesausblick mit Link
// auf den vollen Sport-Reiter. Damit ist die Sport-Firma nicht isoliert.
export function SportBriefingCard({ synth, todayFixtures, employeeStats }: SportBriefingProps) {
  // Aggregat: durchschnittliche Hit-Rate der Mitarbeiter mit ≥ 10 bewerteten
  // Stimmen (sample-quality 'good' oder 'medium'). Unter diesem Schwellwert
  // wuerde Rauschen ueberwiegen.
  const ratedEmployees = (employeeStats ?? []).filter(
    (e) => e.hitRatePct !== null && e.totalVotes >= 10
  );
  const avgHitRate = ratedEmployees.length > 0
    ? Math.round(ratedEmployees.reduce((s, e) => s + (e.hitRatePct ?? 0), 0) / ratedEmployees.length)
    : null;
  const topEmployee = ratedEmployees.length > 0
    ? [...ratedEmployees].sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0))[0]
    : null;
  // Erst der sichere Tipp, sonst der beste verfügbare. Damit die Karte
  // immer mit einer konkreten Empfehlung füllt, auch in der Sommerpause.
  const lead = synth.highConfidencePicks[0] ?? synth.dailyTopPick;
  const leadLabel = synth.highConfidencePicks[0] ? 'Sicherer Tipp' : 'Tipp des Tages';
  const dangerous = synth.findings.find((f) => f.kind === 'dangerous') ?? null;
  return (
    <Link
      href="/sport"
      className="block space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 transition hover:border-emerald-400/60 hover:bg-slate-900/60"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Sport-Redaktion · {synth.totalEmployees} Mitarbeiter</h2>
        <span className="text-[10px] text-slate-500">{synth.totalFixturesNext7d} Spiele · 7 Tage · {synth.perLeagueTopPicks.length} Ligen</span>
      </div>
      <p className="text-[11.5px] leading-snug text-slate-100">
        <span className="font-mono text-emerald-300">{todayFixtures} heute</span>
        <span className="mx-1 text-slate-600">·</span>
        <span className="font-mono text-slate-300">{synth.weekAhead.reduce((s, d) => s + d.fixtures.length, 0)} in 7 Tagen</span>
        <span className="mx-1 text-slate-600">·</span>
        <span className="font-mono text-amber-300">{synth.highConfidencePicks.length} sicher</span>
        {dangerous && synth.totalFixturesNext7d > 0 && (
          <>
            <br />
            <span className="text-slate-300">Heißeste Mannschaft: <span className="font-semibold text-white">{dangerous.team}</span> <span className="text-slate-500">({dangerous.league})</span></span>
          </>
        )}
        {lead && (
          <>
            <br />
            <span className="text-slate-300">{leadLabel}: <span className="font-semibold text-white">{lead.fixture.homeTeam}</span> vs. <span className="font-semibold text-white">{lead.fixture.awayTeam}</span> · <span className="font-mono text-emerald-300">{lead.likelyScore.home}:{lead.likelyScore.away} · {Math.round(lead.confidence * 100)}%</span></span>
          </>
        )}
      </p>
      {avgHitRate !== null && topEmployee && (
        <p className="text-[10.5px] leading-snug text-slate-400">
          <span className="text-slate-300">Track-Record:</span>{' '}
          {ratedEmployees.length} von {synth.totalEmployees} Mitarbeitern mit genug Daten · Schnitt{' '}
          <span className={`font-mono font-bold ${
            avgHitRate >= 55 ? 'text-emerald-300'
            : avgHitRate >= 45 ? 'text-slate-200'
            : 'text-rose-300'
          }`}>
            {avgHitRate} %
          </span>{' '}
          · stärkste/r Mitarbeiter/in <span className="font-semibold text-slate-200">{topEmployee.employeeName}</span> ({topEmployee.hitRatePct} %).
        </p>
      )}
      <div className="text-[10px] text-emerald-300/80">zum Sport-Reiter →</div>
    </Link>
  );
}
