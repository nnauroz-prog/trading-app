import Link from 'next/link';
import { getFootballFixtures, Fixture, UpcomingFixture, LeagueFixtures } from '@/lib/sport/fetcher';
import { TeamForm5 } from '@/lib/sport/predictor';
import { ProbabilityCard } from '@/components/probability-card';
import { SportTipJournal } from '@/components/sport-tip-journal';
import { StandingsTable } from '@/components/standings-table';
import { computeStandings } from '@/lib/sport/standings';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtLocalTime(date: string, time: string | null): string {
  if (!time) return '';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function FixtureRow({ f }: { f: Fixture }) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <span className="font-mono text-[10px] text-slate-500">
        {fmtDate(f.date)}
        {f.time && <span className="ml-1 text-slate-600">{fmtLocalTime(f.date, f.time)}</span>}
      </span>
      <span className="text-[13px] text-slate-100">
        <span className="font-semibold">{f.homeTeam}</span>
        <span className="mx-2 text-slate-500">—</span>
        <span className="font-semibold">{f.awayTeam}</span>
      </span>
      {f.status === 'finished' && f.homeScore !== null && f.awayScore !== null ? (
        <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-slate-100">
          {f.homeScore}:{f.awayScore}
        </span>
      ) : (
        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">vs.</span>
      )}
    </li>
  );
}

function FormChips({ form }: { form: TeamForm5 }) {
  if (form.results.length === 0) return <span className="text-[10px] text-slate-600">noch keine Form</span>;
  return (
    <span className="inline-flex gap-0.5">
      {form.results.map((r, i) => (
        <span
          key={i}
          className={`inline-block h-3 w-3 rounded-full text-center text-[8px] font-bold leading-3 ${r === 'W' ? 'bg-emerald-500/80 text-emerald-50' : r === 'L' ? 'bg-rose-500/80 text-rose-50' : 'bg-slate-600 text-slate-100'}`}
          title={r === 'W' ? 'Sieg' : r === 'L' ? 'Niederlage' : 'Unentschieden'}
        >
          {r === 'W' ? 'S' : r === 'L' ? 'N' : 'U'}
        </span>
      ))}
    </span>
  );
}

function pickConfidenceClass(label: 'klar' | 'leicht' | 'offen'): string {
  if (label === 'klar') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  if (label === 'leicht') return 'border-amber-400/50 bg-amber-500/15 text-amber-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function TopTipp({ leagues }: { leagues: LeagueFixtures[] }) {
  let best: { fixture: UpcomingFixture; league: string } | null = null;
  for (const lf of leagues) {
    for (const f of lf.next) {
      if (!f.prediction) continue;
      if (!best || f.prediction.pickConfidence > (best.fixture.prediction?.pickConfidence ?? 0)) {
        best = { fixture: f, league: lf.league.name };
      }
    }
  }
  if (!best || !best.fixture.prediction) return null;
  const p = best.fixture.prediction;
  const conf = Math.round(p.pickConfidence * 100);
  return (
    <section className="space-y-2 rounded-2xl border-2 border-emerald-400/40 bg-emerald-950/20 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Tipp der Woche</span>
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${pickConfidenceClass(p.pickLabel)}`}>
          {p.pickLabel} · {conf}%
        </span>
      </div>
      <h2 className="text-lg font-bold text-white">
        {best.fixture.homeTeam} <span className="text-slate-500">vs.</span> {best.fixture.awayTeam}
      </h2>
      <div className="text-[11px] text-slate-400">
        {best.league} · {fmtDate(best.fixture.date)}{best.fixture.time ? ` · ${fmtLocalTime(best.fixture.date, best.fixture.time)}` : ''}
      </div>
      <p className="text-[13px] text-slate-100">
        <span className="font-bold">{p.pickPlain}</span> — wahrscheinlichstes Ergebnis: <span className="font-mono">{p.likelyScore.home} : {p.likelyScore.away}</span>.
      </p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span>Form {best.fixture.homeTeam}: <FormChips form={p.homeForm} /></span>
        <span>Form {best.fixture.awayTeam}: <FormChips form={p.awayForm} /></span>
      </div>
    </section>
  );
}

function UpcomingFixtureRow({ f }: { f: UpcomingFixture }) {
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="font-mono text-[10px] text-slate-500">
          {fmtDate(f.date)}
          {f.time && <span className="ml-1 text-slate-600">{fmtLocalTime(f.date, f.time)}</span>}
        </span>
        <span className="text-[13px] text-slate-100">
          <span className="font-semibold">{f.homeTeam}</span>
          <span className="mx-2 text-slate-500">—</span>
          <span className="font-semibold">{f.awayTeam}</span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">vs.</span>
      </div>
      {f.prediction && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800/60 pt-1.5 text-[10px] text-slate-500">
          <span>Form Heim: <FormChips form={f.prediction.homeForm} /></span>
          <span>Form Auswärts: <FormChips form={f.prediction.awayForm} /></span>
        </div>
      )}
      {f.probabilities && f.tips ? (
        <div className="mt-3">
          <ProbabilityCard
            homeTeam={f.homeTeam}
            awayTeam={f.awayTeam}
            model={f.probabilities}
            tips={f.tips}
            saveContext={{ fixtureId: f.id, date: f.date, league: f.league }}
          />
        </div>
      ) : (
        <div className="mt-1.5 border-t border-slate-800/60 pt-1.5 text-[10px] text-slate-500">
          Wahrscheinlichkeits-Modell: zu wenig Spiele in dieser Liga — Saison gerade gestartet oder Pokal-Modus.
        </div>
      )}
    </li>
  );
}

export default async function SportPage() {
  const leagues = await getFootballFixtures();
  const anyData = leagues.some((l) => l.next.length > 0 || l.last.length > 0);

  // Flatten all finished fixtures across leagues for the tip-journal resolver.
  const finishedLite = leagues.flatMap((lf) => lf.last
    .filter((f) => f.homeScore !== null && f.awayScore !== null)
    .map((f) => ({ id: f.id, homeTeam: f.homeTeam, awayTeam: f.awayTeam, homeScore: f.homeScore!, awayScore: f.awayScore! })));

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Sport · Fußball</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Spielpläne &amp; Ergebnisse</h1>
        <p className="text-sm text-slate-400">Top-Ligen Europas — die nächsten und letzten Spiele.</p>
      </header>

      <TopTipp leagues={leagues} />

      <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Tipp-Spiel mit Freunden</div>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-300">
          Die „Tipp“-Schätzungen unter jedem Spiel sind ein einfaches <strong>Statistik-Modell</strong> (Poisson auf den letzten
          Liga-Spielen) — gedacht für Gespräche und Tipp-Spiele unter Freunden, <strong>nicht</strong> für Wetten. Verletzungen,
          Sperren, Aufstellungen und Tagesform sind nicht modelliert; die echte Welt schlägt das Modell oft.
        </p>
      </section>

      {!anyData && (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          Spielplan-Daten gerade nicht verfügbar — versuch&apos;s in ein paar Minuten nochmal.
        </p>
      )}

      <div className="space-y-3">
        {leagues.map((lf, leagueIdx) => {
          if (lf.next.length === 0 && lf.last.length === 0) return null;
          // First two leagues open by default so visitors see real content
          // immediately. Remaining leagues stay collapsed to keep the page tight.
          return (
            <details key={lf.league.id} open={leagueIdx < 2} className="rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <summary className="cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100">
                ▸ {lf.league.name} <span className="text-slate-500">· {lf.league.country}</span>
              </summary>
              <div className="space-y-4 p-4 pt-0">
                {lf.next.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Nächste Spiele · mit Tipp</h3>
                    <ul className="space-y-1.5">
                      {lf.next.map((f) => <UpcomingFixtureRow key={f.id} f={f} />)}
                    </ul>
                  </div>
                )}
                {lf.last.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Letzte Ergebnisse</h3>
                    <ul className="space-y-1.5">
                      {lf.last.map((f) => <FixtureRow key={f.id} f={f} />)}
                    </ul>
                  </div>
                )}
                {lf.last.length >= 3 && (
                  <details>
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-sky-300 hover:text-sky-200">
                      Liga-Tabelle (geschätzt) anzeigen
                    </summary>
                    <div className="mt-2">
                      <StandingsTable standings={computeStandings(lf.last)} />
                    </div>
                  </details>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <SportTipJournal finishedFixtures={finishedLite} />

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Daten: TheSportsDB (öffentlich, frei) · Zeiten in Europe/Berlin · Aktualisierung max. stündlich · keine Garantie auf Vollständigkeit/Korrektheit.
      </footer>
    </main>
  );
}
