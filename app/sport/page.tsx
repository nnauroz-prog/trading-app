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
import { SquadOverridePanel } from '@/components/squad-override-panel';
import { ModifierTransparencyStrip } from '@/components/modifier-transparency-strip';
import { RefreshSportButton } from '@/components/refresh-sport-button';
import { ModifierBacktestCard } from '@/components/modifier-backtest-card';
import { backtestModifiers } from '@/lib/sport/modifier-backtest';
import { computeHeadToHead } from '@/lib/sport/h2h';
import { predictWinner } from '@/lib/sport/winner-verdict';
import { WinnerVerdictCard } from '@/components/winner-verdict-card';
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
import { WochenErgebnisse } from '@/components/wochen-ergebnisse';
import { SportTodayLive } from '@/components/sport-today-live';
import { SportTodayResolved } from '@/components/sport-today-resolved';
import { SportYesterdayResolved } from '@/components/sport-yesterday-resolved';
import { SportLeagueFilter } from '@/components/sport-league-filter';
import { DataRefreshIndicator } from '@/components/data-refresh-indicator';
import { ManualRefreshButton } from '@/components/manual-refresh-button';
import { LeagueSeasonStatsCard } from '@/components/league-season-stats';
import { computeLeagueSeasonStats } from '@/lib/sport/firma/season-stats';
import { computeConsensus } from '@/lib/sport/firma/consensus';
import { ConsensusPicks } from '@/components/consensus-picks';
import { Tier90Picks } from '@/components/tier-90-picks';
import { SportTier90Recorder } from '@/components/sport-tier-90-recorder';
import { SportTier90History } from '@/components/sport-tier-90-history';
import { SportTier90HistoryStrip } from '@/components/sport-tier-90-history-strip';
import { getEmployeeBacktest } from '@/lib/sport/firma/employee-backtest-cache';
import { rankPredictionsByQuality, summarizeLeagueQuality } from '@/lib/sport/quality-ranking';
import { summarizeAllLeagueDataQuality } from '@/lib/sport/league-data-quality';
import { BestPredictionCard } from '@/components/best-prediction-card';
import { TopPredictionsRanking } from '@/components/top-predictions-ranking';
import { StableOnlyToggle } from '@/components/stable-only-toggle';
import { QualityBandDistribution } from '@/components/quality-band-distribution';
import { QualityScoreFilter } from '@/components/quality-score-filter';
import { QualityCompare } from '@/components/quality-compare';
import { LigaSpotlight } from '@/components/liga-spotlight';
import { TipprundeCard } from '@/components/tipprunde-card';
import { WochenzielCard } from '@/components/wochenziel-card';
import { HitRateSparkline } from '@/components/hit-rate-sparkline';
import { TipprundeWeeklyHistory } from '@/components/tipprunde-weekly-history';
import { TipprundeByLeague } from '@/components/tipprunde-by-league';
import { TipprundeByMarket } from '@/components/tipprunde-by-market';
import { AchievementsCard } from '@/components/achievements-card';
import { WeekdayHeatmap } from '@/components/weekday-heatmap';
import { BestWeekdayHint } from '@/components/best-weekday-hint';
import { SanityHints } from '@/components/sanity-hints';
import { FriendsLeaderboard } from '@/components/friends-leaderboard';
import { DailyRecapCard } from '@/components/daily-recap-card';
import { LigaAccordionControls } from '@/components/liga-accordion-controls';
import { LigaSearch } from '@/components/liga-search';
import { ScoreColorKey } from '@/components/score-color-key';
import { SportTopNav } from '@/components/sport-top-nav';
import { SportOnboardingHint } from '@/components/sport-onboarding-hint';
import { LigaTop3Snapshot } from '@/components/liga-top3-snapshot';
import { LigaPhaseBadge } from '@/components/liga-phase-badge';
import { SportQuickFilter } from '@/components/sport-quick-filter';
import { SummerModeBanner } from '@/components/summer-mode-banner';
import { WmCountdownBanner } from '@/components/wm-countdown-banner';
import { WmNextMatches } from '@/components/wm-next-matches';
import { WmDayPicker } from '@/components/wm-day-picker';
import { WmTopTips } from '@/components/wm-top-tips';
import { WmSafeMarketTips } from '@/components/wm-safe-market-tips';
import { SafeFootballTips } from '@/components/safe-football-tips';
import { evaluateFootballPersonas } from '@/lib/agents/football-personas';
import { FootballPersonaPanel } from '@/components/football-persona-panel';
import { PersonaConsensusBanner } from '@/components/persona-consensus-banner';
import { WmOutrightCard } from '@/components/wm-outright-card';
import { WmEngineHonesty } from '@/components/wm-engine-honesty';
import { WmGroupsOverview } from '@/components/wm-groups-overview';
import { WmVenuesList } from '@/components/wm-venues-list';
import { WmCitiesCard } from '@/components/wm-cities-card';
import { WmTipprundeStats } from '@/components/wm-tipprunde-stats';
import { WmPhasesTimeline } from '@/components/wm-phases-timeline';
import { SportDataReset } from '@/components/sport-data-reset';
import { SportFaq } from '@/components/sport-faq';
import { SportTabTitle } from '@/components/sport-tab-title';
import { SportTabsDock } from '@/components/sport-tabs-dock';
import { OtherSportsShortcut } from '@/components/other-sports-shortcut';
import { SeasonStartsCard } from '@/components/season-starts-card';
import { PendingTipsReminder } from '@/components/pending-tips-reminder';
import { LastResolvedStrip } from '@/components/last-resolved-strip';
import { NotificationOptIn } from '@/components/notification-opt-in';
import { SportPrecisionDesk } from '@/components/sport/sport-precision-desk';
import { SportPrecisionCalibrationHydrator } from '@/components/sport/sport-precision-calibration-hydrator';
import { SportCollapsibleLegacySection } from '@/components/sport/sport-collapsible-legacy-section';
import { buildLeaguePrecisionPicks } from '@/lib/sport/sport-precision-bridge';
import { buildWmPrecisionPicks } from '@/lib/sport/wm-precision-bridge';

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
      {p.weather && p.weather.riskLabel !== 'normal' && (
        <p className="rounded-md border border-amber-400/40 bg-amber-950/15 px-2 py-1.5 text-[11px] leading-snug text-amber-100">
          <span className="font-semibold">🌦 Wetter-Einfluss:</span>{' '}
          {p.weather.factors.join(' · ')}. Modell rechnet mit{' '}
          <span className="font-mono">×{p.weather.lambdaMultiplier.toFixed(2)}</span>{' '}
          weniger Toren als sonst — Unter-2.5-Tipps haben heute mehr Wert.
        </p>
      )}
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
          {f.prediction.weather && (
            <span
              className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                f.prediction.weather.riskLabel === 'sehr tor-arm'
                  ? 'border-rose-400/50 bg-rose-500/15 text-rose-200'
                  : f.prediction.weather.riskLabel === 'tor-arm-erwartet'
                  ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
              title={f.prediction.weather.factors.join(' · ')}
            >
              🌦 {f.prediction.weather.riskLabel === 'normal' ? 'Wetter ok' : f.prediction.weather.riskLabel}
            </span>
          )}
          {f.prediction.h2hMod && (
            <span
              className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                f.prediction.h2hMod.homeMultiplier > f.prediction.h2hMod.awayMultiplier
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  : f.prediction.h2hMod.awayMultiplier > f.prediction.h2hMod.homeMultiplier
                  ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
              title={f.prediction.h2hMod.factors.join(' · ')}
            >
              ⚔ H2H ×{Math.max(f.prediction.h2hMod.homeMultiplier, f.prediction.h2hMod.awayMultiplier).toFixed(2)}
            </span>
          )}
          {f.prediction.refereeTendencies && (
            <span
              className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300"
              title={f.prediction.refereeTendencies.summary}
            >
              ⚖ {f.prediction.refereeTendencies.name.split(' ').slice(-1)[0]} ({f.prediction.refereeTendencies.games})
            </span>
          )}
        </div>
      )}
      {h2h && (
        <div className="mt-1.5">
          <H2HBadge h2h={h2h} />
        </div>
      )}
      {f.prediction && (
        <div className="mt-1.5 space-y-1.5">
          <ModifierTransparencyStrip fixtureId={f.id} prediction={f.prediction} />
          <SquadOverridePanel
            fixtureId={f.id}
            homeTeam={f.homeTeam}
            awayTeam={f.awayTeam}
            baseLambdaHome={f.prediction.lambdaHome}
            baseLambdaAway={f.prediction.lambdaAway}
            basePHome={f.prediction.pHome}
            basePDraw={f.prediction.pDraw}
            basePAway={f.prediction.pAway}
          />
        </div>
      )}
      {(() => {
        const verdict = predictWinner({
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          prediction: f.prediction,
          h2h: h2h ?? null,
          finishedPool: [],
          sport: 'football'
        });
        return (
          <div className="mt-3">
            <WinnerVerdictCard
              verdict={verdict}
              homeTeam={f.homeTeam}
              awayTeam={f.awayTeam}
            />
          </div>
        );
      })()}
      {f.probabilities && f.tips ? (
        <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40">
          <summary className="cursor-pointer p-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
            ▸ Mehr Wahrscheinlichkeiten (Tor-Markt, BTTS, Ergebnis-Tendenz)
          </summary>
          <div className="px-2 pb-2">
          <ProbabilityCard
            homeTeam={f.homeTeam}
            awayTeam={f.awayTeam}
            model={f.probabilities}
            tips={f.tips}
            saveContext={{ fixtureId: f.id, date: f.date, league: f.league }}
          />
          </div>
        </details>
      ) : (
        <div className="mt-1.5 space-y-1 border-t border-amber-500/30 pt-1.5">
          <div className="text-[11px] font-semibold text-amber-200">
            Kein klares Signal — nicht tippen empfohlen.
          </div>
          <p className="text-[10px] leading-snug text-slate-400">
            Zu wenig Spiele in dieser Liga für ein verlässliches Modell (Saison gerade gestartet, Pokal-Modus, oder ID-Konflikt bei TheSportsDB).
            Ohne Form-Daten ist jeder Tipp Glücksspiel — überspringen ist die ehrliche Antwort.
          </p>
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
  const leagueStatsMap = new Map<string, { homeWinPct: number; goalsPerMatch: number }>();
  for (const s of leagueSeasonStats) leagueStatsMap.set(s.league, { homeWinPct: s.homeWinPct, goalsPerMatch: s.goalsPerMatch });

  // Hit-Rate-Map aus dem Mitarbeiter-Backtest: jede Stimme wird mit dieser
  // historischen Trefferquote gewichtet (Welle 227).
  const backtestStats = await getEmployeeBacktest();
  const hitRates = new Map<string, number>();
  for (const s of backtestStats) {
    if (s.hitRatePct !== null && s.totalVotes >= 15) hitRates.set(s.employeeId, s.hitRatePct);
  }

  // Sigrid Achterberg (H2H-Spezialistin) gräbt für jedes upcoming-Fixture den
  // Direktvergleich aus den letzten Liga-Spielen.
  const h2hById = new Map<string, import('@/lib/sport/h2h').HeadToHeadResult>();
  for (const lf of leagues) {
    for (const f of lf.next) {
      h2hById.set(f.id, computeHeadToHead(f.homeTeam, f.awayTeam, lf.last));
    }
  }

  // Consensus-Engine: 5-Signal-Konsens pro upcoming Fixture aus 3 Saisons.
  const consensusEnriched: { verdict: import('@/lib/sport/firma/consensus').ConsensusVerdict; fixture: import('@/lib/sport/fetcher').UpcomingFixture; leagueName: string }[] = [];
  for (const lf of leagues) {
    for (const f of lf.next) {
      const homeForm = firmaSynth.forms.find((x) => x.team === f.homeTeam && x.league === lf.league.name) ?? null;
      const awayForm = firmaSynth.forms.find((x) => x.team === f.awayTeam && x.league === lf.league.name) ?? null;
      const h2h = h2hById.get(f.id) ?? null;
      const lstats = leagueStatsMap.get(lf.league.name) ?? null;
      const fullLstats = leagueSeasonStats.find((s) => s.league === lf.league.name) ?? null;
      const verdict = computeConsensus({
        fixture: f,
        homeForm,
        awayForm,
        h2h,
        leagueHomeWinPct: lstats?.homeWinPct ?? null,
        leagueGoalsPerMatch: lstats?.goalsPerMatch ?? null,
        finishedPool: lf.last,
        leagueName: lf.league.name,
        leagueStats: fullLstats,
        hitRates
      });
      consensusEnriched.push({ verdict, fixture: f, leagueName: lf.league.name });
    }
  }
  consensusEnriched.sort((a, b) => b.verdict.consensusScore - a.verdict.consensusScore);
  const consensusById = new Map<string, import('@/lib/sport/firma/consensus').ConsensusVerdict>();
  for (const c of consensusEnriched) consensusById.set(c.fixture.id, c.verdict);

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

  // Quality-Score-Ranking: alle anstehenden Spiele gerankt — beste Einzel-Prognose
  // (BestPredictionCard) und Top-5 (TopPredictionsRanking) lesen daraus.
  const rankedPredictions = rankPredictionsByQuality({ leagues });
  const leagueQuality = summarizeLeagueQuality(leagues);
  const leagueDataQualityMap = summarizeAllLeagueDataQuality(leagues);

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
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Sport · Fußball-Prognosen</div>
          <RefreshSportButton />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Fußball-Prognosen für Tipprunden</h1>
        <p className="text-sm text-slate-400">Modell-Tendenz pro Spiel mit Quality-Score 0–100 — basierend auf 3 Saisons echter Daten. Keine Wettempfehlung, keine Garantien.</p>
      </header>

      <SportTabTitle />
      <SportTopNav todayIso={buckets.todayIso} />
      <SportTabsDock />
      <SportOnboardingHint />

      {/* SPORT PRECISION DESK — fuehrender Entscheidungs-Filter ganz oben.
          Alle alten Bereiche sind darunter eingeklappt und tragen klar das
          Etikett „Rohdaten / Modell-Uebersicht", damit kein widersprueliches
          Wording uebrig bleibt. */}

      {/* WM-Countdown ganz oben, solange < 30 Tage bis Start oder waehrend
          der laufenden WM. Mountet vor den Picks, damit der User sofort
          weiss „WM-Modus aktiv". */}
      <WmCountdownBanner todayIso={buckets.todayIso} />

      {/* WM Precision Desk: dasselbe 3-Verdict-Pattern, aber auf die WM-
          Fixtures der naechsten 14 Tage angewendet. TBD-Teams werden hart
          blockiert, Spielort + bestaetigte Teams = hasOfficialFixture. */}
      {(() => {
        const wmPicks = buildWmPrecisionPicks({ todayIso: buckets.todayIso, horizonDays: 14 });
        if (wmPicks.length === 0) return null;
        const overallCoverage = (() => {
          if (wmPicks.length === 0) return 0;
          const sum = wmPicks.reduce((s, p) => s + (p.dataLabel === 'VOLLSTAENDIG' ? 100 : p.dataLabel === 'TEILWEISE' ? 60 : 30), 0);
          return Math.round(sum / wmPicks.length);
        })();
        return (
          <SportPrecisionDesk
            title="WM Precision Desk"
            picks={wmPicks}
            calibrationLabel="UNKLAR"
            dataCoveragePct={overallCoverage}
          />
        );
      })()}

      {(() => {
        const precisionPicks = buildLeaguePrecisionPicks(leagues, { todayIso: buckets.todayIso });
        const overallCoverage = (() => {
          if (precisionPicks.length === 0) return 0;
          const sum = precisionPicks.reduce((s, p) => s + (p.dataLabel === 'VOLLSTAENDIG' ? 100 : p.dataLabel === 'TEILWEISE' ? 60 : 30), 0);
          return Math.round(sum / precisionPicks.length);
        })();
        return (
          <SportPrecisionDesk
            title="Liga Precision Desk"
            picks={precisionPicks}
            calibrationLabel="UNKLAR"
            dataCoveragePct={overallCoverage}
          />
        );
      })()}
      <SportPrecisionCalibrationHydrator />

      {/* Sommer-Banner steht VOR der besten Prognose: wenn nichts läuft,
          braucht der User die ehrliche Antwort zuerst statt eine leere Top-Karte. */}
      <SummerModeBanner leagues={leagues} todayIso={buckets.todayIso} />
      {rankedPredictions.length < 5 && <SeasonStartsCard todayIso={buckets.todayIso} />}
      <OtherSportsShortcut upcomingFootballCount={rankedPredictions.length} />
      <PendingTipsReminder />
      <LastResolvedStrip />
      <NotificationOptIn />

      <SportCollapsibleLegacySection
        title="Liga-Rohranking und Modellübersicht"
        subtitle="ungefilterte Modell-Tendenzen, Quality-Score-Ranking"
        hint="Rohdaten-Ansicht — der Precision Desk filtert oben strenger. Diese Karten zeigen ungefilterte Modell-Tendenzen und sind keine Freigabe."
      >
        {(() => {
          const footballVerdicts = evaluateFootballPersonas(leagues, buckets.todayIso);
          return (
            <>
              <PersonaConsensusBanner verdicts={footballVerdicts} context="Liga-Fußball" />
              <FootballPersonaPanel verdicts={footballVerdicts} />
            </>
          );
        })()}
        <SafeFootballTips leagues={leagues} todayIso={buckets.todayIso} />
        <div id="top" />
        <BestPredictionCard ranked={rankedPredictions} todayIso={buckets.todayIso} />
        <div id="top-prognosen" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Top-Ranking-Filter:</span>
          <StableOnlyToggle />
        </div>
        <TopPredictionsRanking ranked={rankedPredictions} limit={5} />
        <ScoreColorKey />
        <div id="verteilung" />
        <QualityBandDistribution ranked={rankedPredictions} todayIso={buckets.todayIso} />
        <div id="schwelle" />
        <SportQuickFilter ranked={rankedPredictions} todayIso={buckets.todayIso} tomorrowIso={buckets.tomorrowIso} />
        <QualityScoreFilter ranked={rankedPredictions} />
        <QualityCompare ranked={rankedPredictions} />
        <LigaSpotlight leagues={leagues} />
      </SportCollapsibleLegacySection>

      <SportCollapsibleLegacySection
        title="WM-Rohdaten und Turnierübersicht"
        subtitle="Spielplan, Gruppen, Phasen, Stadien"
        hint="Modell-Rohdaten zur WM — Spiele in der Zukunft sind oft noch nicht freigabefähig. Der Precision Desk oben filtert auf Datenqualität."
      >
        <WmSafeMarketTips todayIso={buckets.todayIso} />
        <WmTopTips todayIso={buckets.todayIso} />
        <WmOutrightCard todayIso={buckets.todayIso} />
        <WmNextMatches todayIso={buckets.todayIso} />
        <WmDayPicker todayIso={buckets.todayIso} />
        <WmEngineHonesty todayIso={buckets.todayIso} />
        <WmGroupsOverview todayIso={buckets.todayIso} />
        <WmPhasesTimeline todayIso={buckets.todayIso} />
        <WmCitiesCard todayIso={buckets.todayIso} />
        <WmVenuesList todayIso={buckets.todayIso} />
      </SportCollapsibleLegacySection>

      <SportCollapsibleLegacySection
        title="Tipprunde und Verlauf"
        subtitle="Tipp-Tagebuch, Hit-Rate, Wochenstatistik"
        hint="Tipprunde mit Freunden — diese Bereiche zaehlen nicht zur Freigabe-Logik, sie sind Tagebuch und Spass-Faktor."
      >
        <div id="tipprunde" />
        <TipprundeCard />
        <WochenzielCard />
        <HitRateSparkline />
        <TipprundeWeeklyHistory />
        <TipprundeByLeague />
        <TipprundeByMarket />
        <WmTipprundeStats todayIso={buckets.todayIso} />
        <WeekdayHeatmap />
        <BestWeekdayHint />
        <SanityHints />
        <AchievementsCard />
        <FriendsLeaderboard />
        <DailyRecapCard todayIso={buckets.todayIso} />
      </SportCollapsibleLegacySection>

      <SportCollapsibleLegacySection
        title="Konsens-Picks, Live-Spiele und Wochenergebnisse"
        subtitle="Tier-90, Heute Live, Resolver"
        hint="Modell-Konsens und Resolver — Live-Stand und Ergebnis-Tracking laufen hier."
      >
        <div id="tier-90" />
        <Tier90Picks picks={consensusEnriched} />
        <SportTier90Recorder picks={consensusEnriched} />

        <SportTodayLive leagues={leagues} />

        <SportYesterdayResolved leagues={leagues} />
        <SportTodayResolved leagues={leagues} />

        <div id="ergebnisse" />
        <WochenErgebnisse synth={firmaSynth} h2hById={h2hById} consensusById={consensusById} />

        <SeasonPauseBanner leagues={leagues} />
      </SportCollapsibleLegacySection>

      <div className="flex items-center gap-2">
        <DataRefreshIndicator initialTimestamp={Date.now()} refreshIntervalMs={600_000} />
        <ManualRefreshButton />
      </div>

      <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40">
        <summary className="cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Mehr Details (Filter, Maximal-Sicher, Tipp-Tagebuch, Liga-Statistik, Redaktion …)
        </summary>
        <div className="space-y-4 p-4 pt-0">
          <SportLeagueFilter leagues={leagues} />

          <div id="maximal-sicher" />
          <ConsensusPicks picks={consensusEnriched} />

          <SportTier90HistoryStrip />
          <SportTier90History finishedFixtures={finishedLite} />

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
        </div>
      </details>

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

      <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40">
        <summary className="cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Meine Teams & Mannschafts-Suche
        </summary>
        <div className="space-y-4 p-4 pt-0">
          <div id="meine-teams" />
          <TeamWatchlistPanel candidates={teamCandidates} />
          <TeamSearch teams={teamCandidates.map((c) => ({ team: c.team, league: c.league }))} />
          <div id="woche" />
          <WeekAheadList days={firmaSynth.weekAhead} />
        </div>
      </details>

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

      <div id="ligen" />
      <LigaSearch />
      <LigaAccordionControls />
      <div className="space-y-3">
        {(() => {
          // Sortierung: Ligen mit anstehenden Spielen zuerst, dann Saisonpause
          // (haben mindestens last-Pool), dann „keine Daten" (komplett leer).
          const sortedLeagues = [...leagues].sort((a, b) => b.next.length - a.next.length);
          const active = sortedLeagues.filter((lf) => lf.next.length > 0 || lf.last.length > 0);
          const noData = sortedLeagues.filter((lf) => lf.next.length === 0 && lf.last.length === 0);
          return (
            <>
              {active.map((lf, leagueIdx) => {
          const hasNext = lf.next.length > 0;
          return (
            <details
              key={lf.league.id}
              open={hasNext && leagueIdx < 3}
              data-liga-accordion="1"
              data-liga-top={hasNext && leagueIdx < 3 ? '1' : '0'}
              className={`rounded-2xl border bg-slate-900/40 ${hasNext ? 'border-emerald-400/40' : 'border-slate-800/80'}`}
            >
              <summary className="cursor-pointer p-4 hover:text-slate-100">
                <span className={`text-xs font-semibold uppercase tracking-wider ${hasNext ? 'text-emerald-300' : 'text-slate-500'}`}>
                  ▸ {lf.league.name} <span className="text-slate-500">· {lf.league.country}</span>
                </span>
                {hasNext && (() => {
                  const q = leagueQuality.get(lf.league.id);
                  const dq = leagueDataQualityMap.get(lf.league.id);
                  const dqColor = dq?.grade === 'A' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                    : dq?.grade === 'B' ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                    : dq?.grade === 'C' ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                    : 'border-rose-400/40 bg-rose-500/10 text-rose-200';
                  return (
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] normal-case">
                      <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">{lf.next.length} Spiele</span>
                      {q?.bestLabel && q.bestMarketLabel && (
                        <span className="rounded-md border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-slate-300">
                          bester Tipp: <span className="text-slate-100">{q.bestMarketLabel}</span>
                        </span>
                      )}
                      {q?.bestScore !== null && q?.bestScore !== undefined && (
                        <span className="rounded-md border border-sky-400/40 bg-sky-500/10 px-1.5 py-0.5 font-mono text-sky-200">Score {q.bestScore}/100</span>
                      )}
                      <LigaPhaseBadge league={lf} />
                      {dq && (
                        <span className={`rounded-md border px-1.5 py-0.5 font-mono ${dqColor}`} title={dq.gradeLabel}>
                          Datenlage {dq.grade} ({dq.goodDataPct}% gut)
                        </span>
                      )}
                    </span>
                  );
                })()}
                {!hasNext && <span className="ml-2 text-[9px] uppercase tracking-wider text-slate-600">· Saisonpause</span>}
              </summary>
              <div className="space-y-4 p-4 pt-0">
                {hasNext ? (
                  <div className="space-y-3">
                    <LigaTop3Snapshot league={lf} />
                    <div>
                      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Alle Begegnungen · {lf.next.length} Spiele</h3>
                      <ul className="space-y-1.5">
                        {lf.next.map((f) => <UpcomingFixtureRow key={f.id} f={f} h2h={h2hById.get(f.id)} />)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-3 text-[11.5px] leading-snug text-amber-100/90">
                    Aktuell keine anstehenden Spiele in dieser Liga (Sommerpause / Pokal-Modus). Die Vergangenheit ist unten ausklappbar, die Liga-Tabelle ebenfalls. Sobald Spiele wieder angesetzt sind, erscheinen hier voraussagene Ergebnisse.
                  </p>
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
              {noData.length > 0 && (
                <details className="rounded-2xl border border-slate-800/60 bg-slate-900/30">
                  <summary className="cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    ▸ Ligen ohne Daten ({noData.length})
                    <span className="ml-2 text-[10px] normal-case text-slate-600">TheSportsDB liefert für diese gerade nichts</span>
                  </summary>
                  <ul className="space-y-0.5 px-4 pb-4 pt-1 text-[11px]">
                    {noData.map((lf) => (
                      <li key={lf.league.id} className="grid grid-cols-[1fr_auto] gap-2">
                        <span className="truncate text-slate-500">{lf.league.name} <span className="text-slate-600">· {lf.league.country}</span></span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-600">keine Daten</span>
                      </li>
                    ))}
                  </ul>
                  <p className="px-4 pb-4 text-[10px] leading-snug text-slate-600">
                    Sobald TheSportsDB für eine dieser Ligen wieder Daten liefert, taucht sie automatisch oben mit Spielen auf.
                  </p>
                </details>
              )}
            </>
          );
        })()}
      </div>

      <div id="tagebuch" />
      <SportTipJournal finishedFixtures={finishedLite} />

      {/* Ehrlicher Modifier-Self-Check pro Liga: bringen die H2H- und
          Schiri-Anpassungen tatsaechlich Lift im Backtest? Wenn negativ,
          wird das hier offen gezeigt. */}
      {(() => {
        const allResults = leagues.map((lf) => ({ league: lf.league, result: backtestModifiers(lf.last) }));
        const evaluated = allResults.filter((x) => x.result.matchesEvaluated >= 20);
        const h2hPositive = evaluated.filter((x) => x.result.matchesWithH2hSignal > 0 && x.result.liftH2hPct >= 0).length;
        const refPositive = evaluated.filter((x) => x.result.matchesWithRefereeSignal > 0 && x.result.liftRefereePct >= 0).length;
        const summary = evaluated.length === 0
          ? 'Pools noch nicht gross genug fuer einen aussagekraeftigen Backtest.'
          : `H2H positiv in ${h2hPositive} von ${evaluated.length} Ligen, Schiri positiv in ${refPositive} von ${evaluated.length} Ligen.`;
        return (
          <details className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
              🔬 Modifier-Backtest pro Liga (ehrlicher Self-Check)
              <span className="ml-2 normal-case text-[10px] tracking-normal text-slate-500">· {summary}</span>
            </summary>
            <div className="mt-2 space-y-1.5">
              {allResults.map(({ league, result }) => (
                <ModifierBacktestCard key={league.id} result={result} leagueName={league.name} />
              ))}
            </div>
          </details>
        );
      })()}

      <SportFaq />
      <SportDataReset />

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
