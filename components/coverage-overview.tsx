// Ehrlicher Daten-Status: Wie viele Ligen liefern heute Spiele, wie viele
// Probabilities sind drauf, wie viele in Saisonpause. Gehört unter das
// Details-Akkordeon, damit ein User mit Verdacht „warum so wenig?" eine
// klare Antwort findet.

import type { LeagueFixtures } from '@/lib/sport/fetcher';
import { computeLeagueCoverage, summarizeCoverage } from '@/lib/sport/league-coverage';

interface Props {
  leagues: LeagueFixtures[];
  todayIso: string;
}

export function CoverageOverview({ leagues, todayIso }: Props) {
  const rows = computeLeagueCoverage(leagues, todayIso);
  const summary = summarizeCoverage(rows);
  const active = rows.filter((r) => r.next7dCount > 0).sort((a, b) => b.next7dCount - a.next7dCount);
  const dormant = rows.filter((r) => r.next7dCount === 0);

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100">
        ▸ Ehrlicher Daten-Status — was kommt heute aus welcher Liga?
      </summary>
      <div className="mt-3 space-y-3">
        <dl className="grid grid-cols-2 gap-2 text-[10.5px] sm:grid-cols-4">
          <Stat label="Ligen gesamt" value={String(summary.totalLeagues)} />
          <Stat label="aktiv (7 Tage)" value={String(summary.activeLeagues)} />
          <Stat label="heute" value={String(summary.todayTotal)} tone="emerald" />
          <Stat label="Modell drauf" value={String(summary.withProbabilities)} />
        </dl>

        {active.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-emerald-300">aktive Ligen (7 Tage)</div>
            <ul className="space-y-0.5">
              {active.map((r) => (
                <li key={r.leagueId} className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10.5px]">
                  <span className="truncate text-slate-300">{r.leagueName} <span className="text-slate-500">· {r.country}</span></span>
                  <span className="font-mono text-slate-400">{r.next7dCount}</span>
                  <span className={`font-mono ${r.hasProbabilities ? 'text-emerald-300' : 'text-amber-400'}`}>
                    {r.hasProbabilities ? '✓' : '·'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {dormant.length > 0 && (
          <details>
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
              Ligen ohne Spiele in 7 Tagen ({dormant.length})
            </summary>
            <ul className="mt-1 space-y-0.5 text-[10.5px]">
              {dormant.map((r) => (
                <li key={r.leagueId} className="grid grid-cols-[1fr_auto] gap-2">
                  <span className="truncate text-slate-500">{r.leagueName} <span className="text-slate-600">· {r.country}</span></span>
                  <span className={`text-[9px] ${r.hasFinishedPool ? 'text-slate-500' : 'text-slate-700'}`}>
                    {r.hasFinishedPool ? 'Pause' : 'keine Daten'}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="text-[10px] leading-snug text-slate-500">
          Quelle: TheSportsDB (frei). Wenn eine Liga in Pause ist oder nichts liefert, taucht hier sofort die Wahrheit auf — keine Schönfärberei.
        </p>
      </div>
    </details>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'neutral' }) {
  const cls = tone === 'emerald' ? 'text-emerald-200' : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <dt className="text-[9px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</dd>
    </div>
  );
}
