import Link from 'next/link';
import type { UpcomingFixture, LeagueFixtures } from '@/lib/sport/fetcher';
import { bucketByDay } from '@/lib/sport/day-buckets';
import { predictWinner } from '@/lib/sport/winner-verdict';

function fmtTime(time: string | null, date: string): string {
  if (!time) return '—';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

interface Props {
  leagues: LeagueFixtures[];
}

// Sehr prominenter Block für ALLE heutigen Spiele über alle Ligen.
// User-Anforderung: "Spiele, die heute sind", nicht versteckt im Liga-Reiter.
export function SportTodayLive({ leagues }: Props) {
  const flat: { fixture: UpcomingFixture; league: string }[] = [];
  for (const lf of leagues) {
    for (const f of lf.next) flat.push({ fixture: f, league: lf.league.name });
  }
  const buckets = bucketByDay(flat.map((x) => x.fixture));
  const today = buckets.today;
  const byLeague = new Map<string, string>();
  for (const lf of leagues) for (const f of lf.next) byLeague.set(f.id, lf.league.name);

  if (today.length === 0) {
    return (
      <section className="rounded-2xl border-2 border-emerald-400/40 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">⚽ Heute live</h2>
        <p className="mt-1 text-[12px] leading-snug text-slate-300">
          Heute laufen in den eingebundenen Ligen aktuell keine Spielansetzungen. Sobald TheSportsDB neue Anstöße meldet (alle 10 Minuten geprüft), erscheinen sie hier — sortiert nach Anstoßzeit.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">⚽ Heute live</div>
          <h2 className="text-xl font-bold tracking-tight text-white">{today.length} Spiele heute</h2>
        </div>
        <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300">
          {new Set(today.map((f) => byLeague.get(f.id))).size} Ligen
        </span>
      </header>
      <ul className="space-y-1.5">
        {today.map((f) => {
          const verdict = predictWinner({
            homeTeam: f.homeTeam, awayTeam: f.awayTeam,
            prediction: f.prediction, h2h: null, finishedPool: [],
            sport: 'football'
          });
          const tone = verdict.clarity === 'strong' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
            : verdict.clarity === 'leaning' ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
            : 'border-amber-400/50 bg-amber-500/10 text-amber-100';
          return (
            <li key={f.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2 text-[11.5px]">
              <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                <span className="font-mono text-[10px] text-emerald-300">{fmtTime(f.time, f.date)}</span>
                <Link href={`/sport/team/${encodeURIComponent(f.homeTeam)}`} className="truncate text-right font-semibold text-slate-100 hover:text-emerald-300">{f.homeTeam}</Link>
                <span className={`rounded-md border-2 px-2 py-0.5 font-mono text-sm font-bold ${tone}`}>
                  {verdict.confidencePct}%
                </span>
                <Link href={`/sport/team/${encodeURIComponent(f.awayTeam)}`} className="truncate font-semibold text-slate-100 hover:text-emerald-300">{f.awayTeam}</Link>
                <span className="text-[9.5px] uppercase tracking-wider text-slate-500">{byLeague.get(f.id) ?? '—'}</span>
              </div>
              <div className="text-[10.5px] text-slate-200">
                <span className="font-semibold">
                  {verdict.winner === 'home' ? `Voraussichtlich gewinnt: ${f.homeTeam}`
                    : verdict.winner === 'away' ? `Voraussichtlich gewinnt: ${f.awayTeam}`
                    : verdict.winner === 'draw' ? 'Remis wahrscheinlich'
                    : 'Kein klarer Favorit'}
                </span>
                <span className="ml-2 text-slate-500">
                  Heim {verdict.regular.homePct}% · Remis {verdict.regular.drawPct}% · Auswärts {verdict.regular.awayPct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Farbcode nach Klarheit: grün = klarer Tipp (≥58 %), blau = leichter Favorit (≥46 %), gelb = offen — eher nicht tippen.
        Modell-Wahrscheinlichkeit aus drei Saisons Form-Daten plus Sport-spezifischen Heimvorteil. Keine Wettempfehlung.
      </p>
    </section>
  );
}
