import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { computeTeamForms } from '@/lib/sport/firma/scouts';
import { computeHeadToHead } from '@/lib/sport/h2h';
import { H2HBadge } from '@/components/h2h-badge';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

interface PageProps {
  params: Promise<{ name: string }>;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { name: rawName } = await params;
  const team = decodeURIComponent(rawName);
  const leagues = await getFootballFixtures();

  const lf = leagues.find((l) => l.last.some((f) => f.homeTeam === team || f.awayTeam === team)
    || l.next.some((f) => f.homeTeam === team || f.awayTeam === team));
  if (!lf) return notFound();

  const form = computeTeamForms([lf]).find((f) => f.team === team) ?? null;
  const upcoming = lf.next.filter((f) => f.homeTeam === team || f.awayTeam === team);
  const allPast = lf.last.filter((f) => f.homeTeam === team || f.awayTeam === team);
  const past = allPast.slice(0, 8);

  // Aggregat-Statistiken über alle aufgezeichneten Spiele dieser Mannschaft
  // (mehrere Saisons), nicht nur die letzten 5.
  let wHist = 0, dHist = 0, lHist = 0, gFor = 0, gAgainst = 0, homeWins = 0, homeGames = 0, awayWins = 0, awayGames = 0;
  for (const f of allPast) {
    if (f.homeScore === null || f.awayScore === null) continue;
    const isHome = f.homeTeam === team;
    const my = isHome ? f.homeScore : f.awayScore;
    const opp = isHome ? f.awayScore : f.homeScore;
    gFor += my;
    gAgainst += opp;
    if (my > opp) wHist++;
    else if (my < opp) lHist++;
    else dHist++;
    if (isHome) {
      homeGames++;
      if (my > opp) homeWins++;
    } else {
      awayGames++;
      if (my > opp) awayWins++;
    }
  }
  const totalHistGames = wHist + dHist + lHist;
  const histAvailable = totalHistGames > 0;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/sport" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Sport-Reiter
      </Link>

      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">{lf.league.name} · {lf.league.country}</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{team}</h1>
      </header>

      {form && form.played > 0 ? (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Letzte Spiele" value={String(form.played)} />
          <Stat label="S/U/N" value={`${form.wins}/${form.draws}/${form.losses}`} />
          <Stat label="Tor-Diff" value={`${form.goalDiff >= 0 ? '+' : ''}${form.goalDiff}`} tone={form.goalDiff >= 0 ? 'good' : 'bad'} />
          <Stat
            label="Streak"
            value={form.streak === 0 ? '—' : form.streak > 0 ? `${form.streak} S` : `${Math.abs(form.streak)} N`}
            tone={form.streak > 0 ? 'good' : form.streak < 0 ? 'bad' : 'neutral'}
          />
        </section>
      ) : (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">Noch keine auswertbare Form in dieser Liga.</p>
      )}

      {histAvailable && (
        <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Saisonen-Bilanz · {totalHistGames} Spiele</h2>
          <p className="text-[10.5px] leading-snug text-slate-500">
            Alles, was wir aus den letzten Spielzeiten ausgewertet haben — Sieg-Quote, Tore, Heim-/Auswärts-Stärke.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Siege" value={`${Math.round((wHist / totalHistGames) * 100)}%`} tone="good" />
            <Stat label="Remis" value={`${Math.round((dHist / totalHistGames) * 100)}%`} tone="neutral" />
            <Stat label="Niederlagen" value={`${Math.round((lHist / totalHistGames) * 100)}%`} tone="bad" />
            <Stat label="Tor-Quote/Spiel" value={(gFor / totalHistGames).toFixed(2)} tone="neutral" />
            <Stat label="Gegentor/Spiel" value={(gAgainst / totalHistGames).toFixed(2)} tone="neutral" />
            <Stat label="Tor-Diff (∑)" value={`${gFor - gAgainst >= 0 ? '+' : ''}${gFor - gAgainst}`} tone={gFor - gAgainst >= 0 ? 'good' : 'bad'} />
            <Stat label="Heim-Sieg-Quote" value={homeGames > 0 ? `${Math.round((homeWins / homeGames) * 100)}%` : '—'} tone="good" />
            <Stat label="Auswärts-Sieg-Quote" value={awayGames > 0 ? `${Math.round((awayWins / awayGames) * 100)}%` : '—'} tone="neutral" />
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Kommende Spiele</h2>
          <ul className="space-y-2">
            {upcoming.map((f) => {
              const opponent = f.homeTeam === team ? f.awayTeam : f.homeTeam;
              const isHome = f.homeTeam === team;
              const h2h = computeHeadToHead(f.homeTeam, f.awayTeam, lf.last);
              return (
                <li key={f.id} className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2 text-[11.5px] text-slate-100">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      {fmtDate(f.date)} · <span className="font-semibold">{isHome ? 'Heim' : 'Auswärts'}</span> gegen <span className="font-semibold">{opponent}</span>
                    </span>
                    {f.prediction && (
                      <span className="font-mono text-emerald-300 text-[10px]">
                        Tipp: {f.prediction.pickPlain} · {Math.round(f.prediction.pickConfidence * 100)}% · {f.prediction.likelyScore.home}:{f.prediction.likelyScore.away}
                      </span>
                    )}
                  </div>
                  <H2HBadge h2h={h2h} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Letzte Spiele</h2>
          <ul className="space-y-1">
            {past.map((f) => {
              const my = f.homeTeam === team ? f.homeScore : f.awayScore;
              const opp = f.homeTeam === team ? f.awayScore : f.homeScore;
              const result: 'W' | 'D' | 'L' = (my ?? 0) > (opp ?? 0) ? 'W' : (my ?? 0) < (opp ?? 0) ? 'L' : 'D';
              const color = result === 'W' ? 'bg-emerald-500/80 text-emerald-50' : result === 'L' ? 'bg-rose-500/80 text-rose-50' : 'bg-slate-600 text-slate-100';
              return (
                <li key={f.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                  <span className="font-mono text-[10px] text-slate-500">{fmtDate(f.date)}</span>
                  <span className="text-slate-100">{f.homeTeam} {f.homeScore}:{f.awayScore} {f.awayTeam}</span>
                  <span className={`inline-block h-4 w-4 rounded-sm text-center text-[9px] font-bold leading-4 ${color}`}>{result === 'W' ? 'S' : result === 'L' ? 'N' : 'U'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-100';
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-bold ${cls}`}>{value}</div>
    </div>
  );
}
