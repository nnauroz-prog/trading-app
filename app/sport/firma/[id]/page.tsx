import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SPORT_FIRMA, type SportEmployee } from '@/lib/sport/firma/roster';
import { getEmployeeBacktest } from '@/lib/sport/firma/employee-backtest-cache';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { collectFirmaVotes } from '@/lib/sport/firma/employee-votes';
import { computeTeamForms } from '@/lib/sport/firma/scouts';
import { computeLeagueSeasonStats } from '@/lib/sport/firma/season-stats';
import { computeHeadToHead } from '@/lib/sport/h2h';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

const DEPARTMENT_LABEL: Record<SportEmployee['department'], string> = {
  chef: 'Chefredaktion',
  league_scout: 'Liga-Scouts',
  team_analyst: 'Mannschafts-Analyse',
  form_analyst: 'Form-Analyse',
  tactical_analyst: 'Taktik',
  international_watch: 'International',
  transfer_watch: 'Transfer-Markt',
  politik_watch: 'Verbands-Politik',
  schedule_gatekeeper: 'Aktualitäts-Wache',
  safety_picker: 'Sicherheits-Tipp-Wache',
  h2h_specialist: 'Direktvergleich (H2H)',
  daily_pick_curator: 'Tipp-des-Tages-Wache'
};

function avatarInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const employee = SPORT_FIRMA.find((e) => e.id === id);
  if (!employee) return notFound();

  const colleagues = SPORT_FIRMA.filter((e) => e.department === employee.department && e.id !== employee.id);
  const hue = hueFromId(employee.id);
  const [allStats, leagues] = await Promise.all([
    getEmployeeBacktest(),
    getFootballFixtures()
  ]);
  const myStats = allStats.find((s) => s.employeeId === employee.id) ?? null;

  // Heutige Stimmen des Mitarbeiters auf die 5 am höchsten gerankten Spielen
  // mit Modell-Prediction. So sieht der User: was sagt diese Person aktuell?
  const candidates = leagues.flatMap((lf) =>
    lf.next.filter((f) => f.prediction !== null).map((f) => ({ league: lf, fixture: f }))
  );
  candidates.sort((a, b) => (b.fixture.prediction?.pickConfidence ?? 0) - (a.fixture.prediction?.pickConfidence ?? 0));
  const topCandidates = candidates.slice(0, 5);
  const hitRateMap = new Map<string, number>();
  for (const stat of allStats) {
    if (stat.hitRatePct !== null) hitRateMap.set(stat.employeeId, stat.hitRatePct);
  }
  const myCurrentVotes = topCandidates.map(({ league, fixture }) => {
    const forms = computeTeamForms([league]);
    const homeForm = forms.find((f) => f.team === fixture.homeTeam) ?? null;
    const awayForm = forms.find((f) => f.team === fixture.awayTeam) ?? null;
    const h2h = computeHeadToHead(fixture.homeTeam, fixture.awayTeam, league.last);
    const seasonStats = computeLeagueSeasonStats([league])[0] ?? null;
    const result = collectFirmaVotes({
      fixture,
      leagueName: league.league.name,
      homeForm,
      awayForm,
      h2h,
      leagueStats: seasonStats,
      finishedPool: league.last,
      hitRates: hitRateMap
    });
    const mine = result.votes.find((v) => v.employeeId === employee.id) ?? null;
    return { league, fixture, mine };
  }).filter((x) => x.mine !== null);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href="/sport/firma" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Personalakte
      </Link>

      <header className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full font-mono text-xl font-bold text-white"
          style={{ background: `hsl(${hue}, 45%, 35%)` }}
          aria-hidden
        >
          {avatarInitials(employee.name)}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">{DEPARTMENT_LABEL[employee.department]}</div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{employee.name}</h1>
        </div>
      </header>

      {myCurrentVotes.length > 0 && (
        <section className="space-y-2 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Was {employee.name} heute zu den kommenden Spielen sagt
          </h2>
          <ul className="space-y-2">
            {myCurrentVotes.map(({ league, fixture, mine }) => {
              const side = mine!.side;
              const sideLabel = side === 'home' ? fixture.homeTeam
                : side === 'away' ? fixture.awayTeam
                : side === 'draw' ? 'Remis'
                : 'Enthaltung';
              const sideTone = side === 'abstain'
                ? 'border-slate-700 bg-slate-900/60 text-slate-300'
                : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100';
              return (
                <li key={fixture.id} className={`rounded-lg border px-3 py-2 ${sideTone}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold">
                        {fixture.homeTeam} <span className="text-slate-500">–</span> {fixture.awayTeam}
                      </div>
                      <div className="text-[9.5px] text-slate-500">{league.league.name} · {fixture.date}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider">→ {sideLabel}</div>
                      {side !== 'abstain' && (
                        <div className="font-mono text-[10px] opacity-80">
                          Confidence {Math.round(mine!.confidence * 100)} %
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-snug opacity-90">{mine!.reasoning}</p>
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] leading-snug text-slate-500">
            Stimmen werden live aus der aktuellen Liga-Datenlage berechnet. Bei Daten-Lücken stimmt der Mitarbeiter mit &bdquo;Enthaltung&ldquo; — keine erfundenen Tipps.
          </p>
        </section>
      )}

      {myStats && myStats.totalVotes > 0 && (
        <section className="space-y-2 rounded-2xl border-2 border-sky-400/40 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Backtest-Bilanz auf 3 Saisons</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Stimmen total</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-slate-100">{myStats.totalVotes}</div>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Richtig</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-emerald-300">{myStats.rightVotes}</div>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Falsch</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-rose-300">{myStats.wrongVotes}</div>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Trefferquote</div>
              <div className={`mt-0.5 font-mono text-lg font-bold ${(myStats.hitRatePct ?? 0) >= 60 ? 'text-emerald-300' : (myStats.hitRatePct ?? 0) >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>
                {myStats.hitRatePct?.toFixed(1)} %
              </div>
            </div>
          </div>
          <p className="text-[10px] leading-snug text-slate-500">
            Stichprobengröße: <span className="font-semibold">{myStats.sampleQuality === 'good' ? 'gut' : myStats.sampleQuality === 'medium' ? 'mittel' : 'schwach'}</span> ({myStats.totalVotes} Stimmen). Plus {myStats.abstainCount} Enthaltungen, die nicht in die Quote eingehen.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Rolle</h2>
        <p className="mt-1 text-[12.5px] leading-snug text-slate-200">{employee.role}</p>
        {employee.leagueKey && (
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">Liga-Bindung: {employee.leagueKey}</div>
        )}
        {employee.teamKey && (
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">Team-Bindung: {employee.teamKey}</div>
        )}
      </section>

      {colleagues.length > 0 && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Kollegen in dieser Abteilung ({colleagues.length})</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {colleagues.map((c) => (
              <li key={c.id}>
                <Link href={`/sport/firma/${c.id}`} className="block truncate rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[11px] text-slate-200 hover:border-emerald-400/60 hover:text-emerald-300">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
