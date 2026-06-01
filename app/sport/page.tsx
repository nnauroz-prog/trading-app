import Link from 'next/link';
import { getFootballFixtures, Fixture, UpcomingFixture, LeagueFixtures } from '@/lib/sport/fetcher';
import { TeamForm5 } from '@/lib/sport/predictor';
import { ProbabilityCard } from '@/components/probability-card';
import { SportTipJournal } from '@/components/sport-tip-journal';
import { StandingsTable } from '@/components/standings-table';
import { computeStandings } from '@/lib/sport/standings';
import { bucketByDay } from '@/lib/sport/day-buckets';
import { buildFirmaSynthesis } from '@/lib/sport/firma/synthesis';
import { SportFirmaCard } from '@/components/sport-firma-card';
import { WeekAheadList } from '@/components/week-ahead-list';
import { TeamWatchlistPanel } from '@/components/team-watchlist-panel';
import { TeamWatchToggle } from '@/components/team-watch-toggle';
import { SafetyPicksSection } from '@/components/safety-picks-section';
import { H2HBadge } from '@/components/h2h-badge';
import { computeHeadToHead } from '@/lib/sport/h2h';
import { FirmaTrackRecord } from '@/components/firma-track-record';
import { DailyTopPickCard } from '@/components/daily-top-pick';
import { PerLeagueTopPicks } from '@/components/per-league-top-picks';
import { MultiTipCombo } from '@/components/multi-tip-combo';
import { PendingTipsCounter } from '@/components/pending-tips-counter';
import { LeagueHeatmap } from '@/components/league-heatmap';
import { SeasonPauseBanner } from '@/components/season-pause-banner';
import { SportCuratorsQuote } from '@/components/sport-curators-quote';
import { WeekHighlights } from '@/components/week-highlights';
import { TeamSearch } from '@/components/team-search';
import { LeagueHitRate } from '@/components/league-hit-rate';
import { SportSectionNav } from '@/components/sport-section-nav';
import { WochenErgebnisse } from '@/components/wochen-ergebnisse';
import { LeagueSeasonStatsCard } from '@/components/league-season-stats';
import { computeLeagueSeasonStats } from '@/lib/sport/firma/season-stats';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

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

function UpcomingFixtureRow({ f, leagueLabel, h2h }: { f: UpcomingFixture; leagueLabel?: string; h2h?: import('@/lib/sport/h2h').HeadToHeadResult }) {
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="font-mono text-[10px] text-slate-500">
          {fmtDate(f.date)}
          {f.time && <span className="ml-1 text-slate-600">{fmtLocalTime(f.date, f.time)}</span>}
          {leagueLabel && <span className="ml-1 block text-[9px] uppercase tracking-wider text-slate-600">{leagueLabel}</span>}
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
          {f.venue && <span className="text-slate-600">· 📍 {f.venue}</span>}
        </div>
      )}
      {h2h && (
        <div className="mt-1.5">
          <H2HBadge h2h={h2h} />
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

function DaySection({
  title,
  subtitle,
  fixtures,
  leagueNameById,
  h2hById
}: {
  title: string;
  subtitle: string;
  fixtures: { fixture: UpcomingFixture; leagueName: string }[];
  leagueNameById: Map<string, string>;
  h2hById: Map<string, import('@/lib/sport/h2h').HeadToHeadResult>;
}) {
  if (fixtures.length === 0) return null;
  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-950/10 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{title}</h2>
        <span className="text-[10px] text-slate-500">{fixtures.length} {fixtures.length === 1 ? 'Spiel' : 'Spiele'}</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">{subtitle}</p>
      <ul className="space-y-1.5">
        {fixtures.map(({ fixture: f, leagueName }) => (
          <UpcomingFixtureRow
            key={f.id}
            f={f}
            leagueLabel={leagueName || leagueNameById.get(f.league) || f.league}
            h2h={h2hById.get(f.id)}
          />
        ))}
      </ul>
    </section>
  );
}

export default async function SportPage() {
  const leagues = await getFootballFixtures();
  const anyData = leagues.some((l) => l.next.length > 0 || l.last.length > 0);

  const flatUpcoming: { fixture: UpcomingFixture; leagueName: string }[] = [];
  const leagueNameById = new Map<string, string>();
  for (const lf of leagues) {
    leagueNameById.set(lf.league.id, lf.league.name);
    for (const f of lf.next) flatUpcoming.push({ fixture: f, leagueName: lf.league.name });
  }
  const buckets = bucketByDay(flatUpcoming.map((x) => x.fixture));
  const wrap = (fxs: UpcomingFixture[]) =>
    fxs.map((f) => {
      const entry = flatUpcoming.find((x) => x.fixture.id === f.id);
      return { fixture: f, leagueName: entry?.leagueName ?? '' };
    });
  const todayFixtures = wrap(buckets.today);
  const tomorrowFixtures = wrap(buckets.tomorrow);
  const laterFirstFixtures = wrap(buckets.laterFirst);
  const laterDateLabel = buckets.laterFirstDate ? fmtDate(buckets.laterFirstDate) : null;
  const firmaSynth = buildFirmaSynthesis(leagues, buckets.todayIso);
  const leagueSeasonStats = computeLeagueSeasonStats(leagues);

  // Sigrid Achterberg (H2H-Spezialistin) gräbt für jedes upcoming-Fixture den
  // Direktvergleich aus den letzten Liga-Spielen.
  const h2hById = new Map<string, import('@/lib/sport/h2h').HeadToHeadResult>();
  for (const lf of leagues) {
    for (const f of lf.next) {
      h2hById.set(f.id, computeHeadToHead(f.homeTeam, f.awayTeam, lf.last));
    }
  }

  // Liefere für die Team-Watchlist Form + nächstes Spiel pro Team, damit der
  // Client das ohne Re-Fetch anzeigen kann.
  const teamCandidates = firmaSynth.forms.map((f) => {
    const upcomingForThisTeam = flatUpcoming
      .filter(({ fixture: fx, leagueName }) => leagueName === f.league && (fx.homeTeam === f.team || fx.awayTeam === f.team))
      .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date))[0];
    const nextOpponent = upcomingForThisTeam
      ? {
          opponent: upcomingForThisTeam.fixture.homeTeam === f.team ? upcomingForThisTeam.fixture.awayTeam : upcomingForThisTeam.fixture.homeTeam,
          date: upcomingForThisTeam.fixture.date,
          isHome: upcomingForThisTeam.fixture.homeTeam === f.team
        }
      : undefined;
    return {
      team: f.team,
      league: f.league,
      form: {
        wins: f.wins, draws: f.draws, losses: f.losses,
        points: f.points, goalDiff: f.goalDiff, played: f.played,
        streak: f.streak, sequence: f.sequence,
        goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst
      },
      nextOpponent
    };
  });

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
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Vorhergesagte Ergebnisse</h1>
        <p className="text-sm text-slate-400">Jedes anstehende Spiel der nächsten 14 Tage mit voraussichtlichem Endstand — basierend auf 3 Saisons echter Daten.</p>
      </header>

      <div id="ergebnisse" />
      <WochenErgebnisse synth={firmaSynth} h2hById={h2hById} />

      <SeasonPauseBanner leagues={leagues} />

      <SportSectionNav />

      <div id="historie" />
      <LeagueSeasonStatsCard stats={leagueSeasonStats} />

      <div id="redaktion">
      <SportFirmaCard synth={firmaSynth} />
      </div>

      <div id="sicher" />
      <SafetyPicksSection synth={firmaSynth} />
      <div id="tag" />
      <DailyTopPickCard synth={firmaSynth} />

      <SportCuratorsQuote synth={firmaSynth} />

      <div id="liga" />
      <PerLeagueTopPicks synth={firmaSynth} />

      <LeagueHeatmap synth={firmaSynth} />

      <FirmaTrackRecord safetyPickerName={firmaSynth.safetyPicker.name} />

      <LeagueHitRate />

      <PendingTipsCounter />

      <div id="kombi" />
      <MultiTipCombo synth={firmaSynth} />

      <WeekHighlights synth={firmaSynth} />

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
        <p className="text-[11px] leading-snug text-slate-300">
          <span className="font-semibold text-emerald-300">{firmaSynth.scheduleGatekeeper.name}</span> ({firmaSynth.scheduleGatekeeper.role.split('·')[0].trim()}) sorgt dafür, dass auf dieser Seite ausschließlich Spiele auftauchen, die in Europe/Berlin noch nicht angefangen haben. Alles, was vorbei ist, wird unsichtbar — vergangene Begegnungen liegen nur noch hinter dem „Vergangenheit ansehen“-Aufklapper jeder Liga, falls du sie für die Tabelle brauchst.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/sport/firma"
          className="block rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 text-center text-[12px] text-emerald-300 hover:border-emerald-400/60 hover:bg-slate-900/60"
        >
          Personalakte → {firmaSynth.totalEmployees} Mitarbeiter
        </Link>
        <Link
          href="/sport/ueberblick"
          className="block rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 text-center text-[12px] text-emerald-300 hover:border-emerald-400/60 hover:bg-slate-900/60"
        >
          Überblick → was geht hier?
        </Link>
      </div>

      <div id="meine-teams" />
      <TeamWatchlistPanel candidates={teamCandidates} />

      <TeamSearch teams={teamCandidates.map((c) => ({ team: c.team, league: c.league }))} />

      <div id="woche" />
      <WeekAheadList days={firmaSynth.weekAhead} />

      <TopTipp leagues={leagues} />

      <DaySection
        title={`Heute · ${fmtDate(buckets.todayIso)}`}
        subtitle="Anstoßzeit in Europe/Berlin. Vorhersagen pro Spiel direkt aufklappbar."
        fixtures={todayFixtures}
        leagueNameById={leagueNameById}
        h2hById={h2hById}
      />

      {todayFixtures.length === 0 && tomorrowFixtures.length > 0 && (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Heute · {fmtDate(buckets.todayIso)}</h2>
          <p className="mt-1 text-[12px] leading-snug text-slate-400">
            Heute keine Spiele in den Top-Ligen. Nächste Anstöße morgen — siehe unten.
          </p>
        </section>
      )}

      {todayFixtures.length === 0 && tomorrowFixtures.length === 0 && laterFirstFixtures.length > 0 && (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Heute &amp; morgen · {fmtDate(buckets.todayIso)}</h2>
          <p className="mt-1 text-[12px] leading-snug text-slate-400">
            Spielpause. Nächster Anstoßtag: <span className="font-semibold text-emerald-300">{laterDateLabel}</span>.
          </p>
        </section>
      )}

      <DaySection
        title={`Morgen · ${fmtDate(buckets.tomorrowIso)}`}
        subtitle="Schon mal vorab planen — die Tipps werden über Nacht aktualisiert, wenn neue Form-Daten reinkommen."
        fixtures={tomorrowFixtures}
        leagueNameById={leagueNameById}
        h2hById={h2hById}
      />

      {todayFixtures.length === 0 && tomorrowFixtures.length === 0 && laterFirstFixtures.length > 0 && laterDateLabel && (
        <DaySection
          title={`Nächster Spieltag · ${laterDateLabel}`}
          subtitle="Kein Spiel heute oder morgen — hier die erste anstehende Runde."
          fixtures={laterFirstFixtures}
          leagueNameById={leagueNameById}
          h2hById={h2hById}
        />
      )}

      <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Tippspiel mit Freunden</div>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-300">
          Die Tipps pro Spiel kommen aus einem einfachen Poisson-Modell auf der letzten Liga-Form. Perfekt fürs Tippspiel im Freundeskreis — die Tagesform schlägt das Modell oft, das ist Teil des Spaßes.
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
                      {lf.next.map((f) => <UpcomingFixtureRow key={f.id} f={f} h2h={h2hById.get(f.id)} />)}
                    </ul>
                  </div>
                )}
                {lf.last.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                      ▸ Vergangenheit ansehen ({lf.last.length} Ergebnisse)
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {lf.last.map((f) => <FixtureRow key={f.id} f={f} />)}
                    </ul>
                  </details>
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
                {(() => {
                  const teams = new Set<string>();
                  for (const f of lf.last) {
                    teams.add(f.homeTeam);
                    teams.add(f.awayTeam);
                  }
                  for (const f of lf.next) {
                    teams.add(f.homeTeam);
                    teams.add(f.awayTeam);
                  }
                  if (teams.size === 0) return null;
                  return (
                    <details>
                      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-emerald-300 hover:text-emerald-200">
                        Teams folgen ({teams.size})
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Array.from(teams).sort().map((team) => (
                          <div key={team} className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10.5px] text-slate-300">
                            <span>{team}</span>
                            <TeamWatchToggle team={team} league={lf.league.name} />
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })()}
              </div>
            </details>
          );
        })}
      </div>

      <div id="tagebuch" />
      <SportTipJournal finishedFixtures={finishedLite} />

      <footer className="space-y-1 border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        <p>
          Daten: TheSportsDB (öffentlich, frei) · Zeiten in Europe/Berlin · Daten werden alle 10 Minuten aktualisiert · Stand:{' '}
          {new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' })} (Berlin).
        </p>
        <p>
          Build: <span className="font-mono text-slate-500">{process.env.BUILD_MARKER ?? '—'}</span> · Tippspiel-Modus aktiv, keine Wett-Empfehlung.
        </p>
      </footer>
    </main>
  );
}
