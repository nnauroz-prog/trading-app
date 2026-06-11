import Link from 'next/link';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { WORLD_CUP_LEAGUE_IDS } from '@/lib/sport/leagues';
import type { UpcomingFixture, Fixture } from '@/lib/sport/fetcher';
import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';
import { WmOutrightCard } from '@/components/wm-outright-card';
import { WmSafeMarketTips } from '@/components/wm-safe-market-tips';
import { evaluateWmPersonas } from '@/lib/agents/wm-personas';
import { WmPersonaPanel } from '@/components/wm-persona-panel';
import { PersonaConsensusBanner } from '@/components/persona-consensus-banner';
import { rankWmWinnerPicks } from '@/lib/sport/wm-winner-picks';
import { fetchWmWeatherByFixture } from '@/lib/sport/wm-live-weather-fetch';
import { reconcileWmSchedule, verifiedFixtureIds, mismatchedFixtureIds } from '@/lib/sport/wm-schedule-reconciler';
import { buildWmDayPlan } from '@/lib/sport/wm-day-plan';
import { evaluateIntegrityAction } from '@/lib/sport/wm-data-integrity-action';
import { getCachedWmBacktest } from '@/lib/sport/wm-backtest-runner';
import { WmDayPlanCard } from '@/components/sport/wm-day-plan-card';
import { WmReconcilerCard } from '@/components/sport/wm-reconciler-card';
import { WmDataIntegrityLive } from '@/components/sport/wm-data-integrity-live';
import { WmSystemGuide } from '@/components/sport/wm-system-guide';
import { WmBacktestReportCard } from '@/components/sport/wm-backtest-report-card';
import { WmWinnerPicksWithLearning } from '@/components/sport/wm-winner-picks-with-learning';
import { WmBankrollCard } from '@/components/sport/wm-bankroll-card';
import { WmBankrollLedgerCard } from '@/components/sport/wm-bankroll-ledger-card';
import { WmComboPicksCard } from '@/components/sport/wm-combo-picks-card';
import { WmJetztCard } from '@/components/sport/wm-jetzt-card';
import { WmWeekPlanCard } from '@/components/sport/wm-week-plan-card';
import { buildWmWeekPlan } from '@/lib/sport/wm-week-plan';
import { WmPickExplainCard } from '@/components/sport/wm-pick-explain-card';
import { WmResultsBoardCard } from '@/components/sport/wm-results-board-card';
import { WmTrefferquoteCard } from '@/components/sport/wm-trefferquote-card';
import { WmTagesHeldCard } from '@/components/sport/wm-tagesheld-card';
import { WmOddsCompareCard } from '@/components/sport/wm-odds-compare-card';
import { WmPickNotesCard } from '@/components/sport/wm-pick-notes-card';
import { WmBackupCard } from '@/components/sport/wm-backup-card';
import { WmErsteSchritte } from '@/components/sport/wm-erste-schritte';
import { WmOpeningBanner } from '@/components/sport/wm-opening-banner';
import { WmSection } from '@/components/sport/wm-section';
import { WmHeuteZusammenfassung } from '@/components/sport/wm-heute-zusammenfassung';
import { WmAnstossWarnungCard } from '@/components/sport/wm-anstoss-warnung-card';
import { WmErgebnisNachtragCard } from '@/components/sport/wm-ergebnis-nachtrag-card';
import { WmHeuteBilanzStrip } from '@/components/sport/wm-heute-bilanz-strip';
import { WmGlossarCard } from '@/components/sport/wm-glossar-card';
import { PlainHint } from '@/components/sport/plain-hint';
import { WmLearningStatusCard } from '@/components/sport/wm-learning-status-card';
import { WmCalibrationCard } from '@/components/sport/wm-calibration-card';
import { WmEloDriftCard } from '@/components/sport/wm-elo-drift-card';
import { WmPickResolver } from '@/components/sport/wm-pick-resolver';
import { WmResultInputCard } from '@/components/sport/wm-result-input-card';
import { SportCollapsibleLegacySection } from '@/components/sport/sport-collapsible-legacy-section';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtTime(time: string | null, date: string): string {
  if (!time) return '';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

const PHASE_TONE: Record<WmFixture['phase'], string> = {
  Gruppe: 'border-slate-700 bg-slate-900/40 text-slate-300',
  Achtelfinale: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  Viertelfinale: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  Halbfinale: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
  'Spiel um Platz 3': 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  Finale: 'border-yellow-300/70 bg-yellow-500/20 text-yellow-100'
};

interface WinnerVerdict {
  text: string;
  confidence: number;
  tone: string;
  knownPair: boolean;
}

function isKnownTeam(name: string): boolean {
  // Alles was nicht mit "Sieger", "Verlierer", "Zweiter", "TBD" beginnt = echtes Team
  return !/^(Sieger|Verlierer|Zweiter|TBD)/i.test(name);
}

function winnerVerdict(home: string, away: string, venue: string, phase: WmFixture['phase'], _finishedPool: Fixture[]): WinnerVerdict {
  void _finishedPool;
  if (!isKnownTeam(home) || !isKnownTeam(away)) {
    return { text: 'Paarung noch offen', confidence: 0, tone: 'border-slate-700 bg-slate-900/40 text-slate-400', knownPair: false };
  }
  // Profi-WM-Engine: ELO + Form-Index + xG + Spielort. Funktioniert
  // ohne TheSportsDB-Form-Pool, weil ELO-Datenbasis intern gepflegt ist.
  const p = predictWmMatch({ homeTeam: home, awayTeam: away, venue, phase });
  const pct = p.pick.confidencePct;
  if (p.pick.winner === 'undecided' || p.pick.clarity === 'open') {
    return {
      text: `Offen — Heim ${p.regular.homePct} %, Remis ${p.regular.drawPct} %, Auswärts ${p.regular.awayPct} %`,
      confidence: pct, tone: 'border-amber-400/40 bg-amber-500/10 text-amber-200', knownPair: true
    };
  }
  if (p.pick.winner === 'home') {
    return {
      text: `${home} gewinnt`, confidence: pct,
      tone: pct >= 65 ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-sky-400/50 bg-sky-500/15 text-sky-200',
      knownPair: true
    };
  }
  if (p.pick.winner === 'away') {
    return {
      text: `${away} gewinnt`, confidence: pct,
      tone: pct >= 65 ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-sky-400/50 bg-sky-500/15 text-sky-200',
      knownPair: true
    };
  }
  return { text: 'Remis wahrscheinlich', confidence: pct, tone: 'border-amber-400/50 bg-amber-500/15 text-amber-200', knownPair: true };
}

export default async function WorldCupPage() {
  const leagues = await getFootballFixtures();
  const wmCandidates = leagues.filter((l) => WORLD_CUP_LEAGUE_IDS.includes(l.league.id));
  const liveNext: UpcomingFixture[] = [];
  const liveLast: Fixture[] = [];
  for (const lf of wmCandidates) {
    for (const f of lf.next) liveNext.push(f);
    for (const f of lf.last) liveLast.push(f);
  }
  const hasLiveData = liveNext.length > 0 || liveLast.length > 0;

  // Pool aller Liga-Vergangenheits-Spiele für die Nationalmannschafts-Form.
  // Da TheSportsDB Nationalmannschaften eher dünn pflegt, ist die Trefferquote
  // hier niedriger als bei Vereins-Ligen — ehrlich gesagt.
  const fullPool = leagues.flatMap((lf) => lf.last);

  const byPhase = new Map<WmFixture['phase'], WmFixture[]>();
  for (const f of WM_2026_FIXTURES) {
    if (!byPhase.has(f.phase)) byPhase.set(f.phase, []);
    byPhase.get(f.phase)!.push(f);
  }
  const phaseOrder: WmFixture['phase'][] = ['Gruppe', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Spiel um Platz 3', 'Finale'];

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <Link href="/sport" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Sport-Reiter
      </Link>

      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">FIFA World Cup 2026</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">WM-Gewinner-Vorhersage</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          11. Juni – 19. Juli 2026 in USA, Kanada, Mexiko. Pro Spiel die wahrscheinlichste Sieger-Seite. Wo Paarungen noch offen sind („Sieger Gruppe A“ usw.), wird das ehrlich markiert.
        </p>
      </header>

      {/* === NEUER PRECISION-STACK — identisch zu /sport und / === */}
      <WmSystemGuide />
      <WmDataIntegrityLive initial={evaluateIntegrityAction()} />
      <WmBacktestReportCard report={await getCachedWmBacktest()} />
      {await (async () => {
        const todayIso = new Date().toISOString().slice(0, 10);
        const horizonDays = 7;
        const weatherByFixtureId = await fetchWmWeatherByFixture({ todayIso, horizonDays });
        const wmExternalFixtures = [...liveNext, ...liveLast].map((f) => ({
          date: f.date, time: f.time ?? null, homeTeam: f.homeTeam, awayTeam: f.awayTeam
        }));
        const horizonEndIso = (() => {
          const d = new Date(`${todayIso}T00:00:00`);
          d.setUTCDate(d.getUTCDate() + 14);
          return d.toISOString().slice(0, 10);
        })();
        const reconcile = reconcileWmSchedule({ external: wmExternalFixtures, fromIso: todayIso, toIso: horizonEndIso });
        const verifiedIds = verifiedFixtureIds(reconcile);
        const mismatchedIds = mismatchedFixtureIds(reconcile);
        const winnerPicks = rankWmWinnerPicks({
          todayIso, horizonDays, weatherByFixtureId,
          verifiedFixtureIds: verifiedIds, mismatchedFixtureIds: mismatchedIds
        });
        const dayPlan = buildWmDayPlan({
          todayIso, picks: winnerPicks, weatherByFixtureId,
          verifiedFixtureIds: verifiedIds, mismatchedFixtureIds: mismatchedIds
        });
        return (
          <>
            <WmOpeningBanner todayIso={todayIso} />
            <WmJetztCard todayIso={todayIso} plan={dayPlan} />
            <WmSection title="Heute" hint="Was los ist + Tipps" defaultOpen>
              <WmAnstossWarnungCard picks={winnerPicks} />
              <WmErgebnisNachtragCard picks={winnerPicks} />
              <WmHeuteZusammenfassung picks={winnerPicks} todayIso={todayIso} />
              <WmHeuteBilanzStrip todayIso={todayIso} />
              <PlainHint id="day-plan" />
              <WmDayPlanCard plan={dayPlan} />
              <PlainHint id="winner-picks" />
              <WmWinnerPicksWithLearning serverPicks={winnerPicks} todayIso={todayIso} horizonDays={horizonDays} />
              <WmPickExplainCard picks={winnerPicks} />
              <PlainHint id="bankroll" />
              <WmBankrollCard picks={winnerPicks} />
              <WmOddsCompareCard picks={winnerPicks} />
            </WmSection>
            <WmSection title="Bilanz & Verlauf" hint="wie laeuft es bisher">
              <WmTrefferquoteCard todayIso={todayIso} />
              <WmTagesHeldCard todayIso={todayIso} />
              <WmResultsBoardCard todayIso={todayIso} lookbackDays={7} />
              <WmWeekPlanCard plan={buildWmWeekPlan({ todayIso, horizonDays: 7, picks: winnerPicks })} />
              <PlainHint id="ledger" />
              <WmBankrollLedgerCard />
            </WmSection>
            <WmSection title="Werkzeuge & Daten" hint="Notizen, Ergebnisse pflegen, Glossar">
              <WmErsteSchritte />
              <WmPickNotesCard picks={winnerPicks} />
              <PlainHint id="reconciler" />
              <WmReconcilerCard result={reconcile} />
              <PlainHint id="combo" />
              <WmComboPicksCard picks={winnerPicks} />
              <WmPickResolver externalFinished={liveLast
                .filter((f) => f.homeScore !== null && f.awayScore !== null)
                .map((f) => ({ homeTeam: f.homeTeam, awayTeam: f.awayTeam, homeScore: f.homeScore as number, awayScore: f.awayScore as number, date: f.date }))}
              />
              <PlainHint id="result-input" />
              <WmResultInputCard />
              <PlainHint id="learning" />
              <WmLearningStatusCard />
              <PlainHint id="calibration" />
              <WmCalibrationCard />
              <PlainHint id="elo-drift" />
              <WmEloDriftCard />
              <WmBackupCard />
              <WmGlossarCard />
            </WmSection>
          </>
        );
      })()}

      <SportCollapsibleLegacySection
        title="WM-Rohranking und Modellübersicht"
        subtitle="Multi-Markt-Picks, Personas, Turniersieger"
        hint="Rohdaten-Ansicht — der Precision-Stack oben filtert strenger. Diese Karten zeigen ungefilterte Modell-Tendenzen und sind keine Freigabe."
      >
        <WmSafeMarketTips todayIso={new Date().toISOString().slice(0, 10)} />
        {(() => {
          const wmVerdicts = evaluateWmPersonas(new Date().toISOString().slice(0, 10));
          return (
            <>
              <PersonaConsensusBanner verdicts={wmVerdicts} context="WM" />
              <WmPersonaPanel verdicts={wmVerdicts} />
            </>
          );
        })()}
        <WmOutrightCard todayIso={new Date().toISOString().slice(0, 10)} />
      </SportCollapsibleLegacySection>

      <section className="rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3 text-[11.5px] leading-snug text-emerald-100/90">
        <span className="font-semibold">Datenquelle: </span>
        Festgelegter FIFA-Spielplan mit allen 16 Standorten und Anstoßzeiten. Für Begegnungen mit feststehenden Mannschaften wird ein Poisson-Modell auf Nationalmannschafts-Form aus dem TheSportsDB-Pool gerechnet. {hasLiveData ? `Plus ${liveNext.length} Live-Spiele aus dem TheSportsDB-Feed.` : 'TheSportsDB-Live-Feed für die WM ist aktuell noch nicht aktiv — wir nutzen den festen Spielplan.'}
      </section>

      {phaseOrder.map((phase) => {
        const fixtures = byPhase.get(phase) ?? [];
        if (fixtures.length === 0) return null;
        return (
          <section key={phase} className={`space-y-2 rounded-2xl border-2 p-4 ${PHASE_TONE[phase]}`}>
            <h2 className="text-xs font-semibold uppercase tracking-wider">{phase} · {fixtures.length} Spiel{fixtures.length === 1 ? '' : 'e'}</h2>
            <ul className="space-y-1.5">
              {fixtures.map((f) => {
                const v = winnerVerdict(f.homeTeam, f.awayTeam, f.venue, f.phase, fullPool);
                return (
                  <li key={f.id}>
                    <Link href={`/wm/${encodeURIComponent(f.id)}`} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2 text-[11.5px] transition hover:brightness-110">
                    <span className="font-mono text-[10px] text-slate-400">
                      {fmtDate(f.date)}
                      <br />
                      {fmtTime(f.time, f.date) || '—'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-100">
                        {f.homeTeam} <span className="text-slate-500">vs.</span> {f.awayTeam}
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-slate-500">📍 {f.venue}{f.group ? ` · Gruppe ${f.group}` : ''}</div>
                    </div>
                    <span className={`rounded-md border-2 px-2 py-1 text-center font-mono text-[10.5px] font-bold ${v.tone}`}>
                      <div className="text-[9px] uppercase tracking-wider">{v.knownPair ? 'Gewinner' : 'Status'}</div>
                      <div className="mt-0.5">{v.text}</div>
                      {v.confidence > 0 && <div className="text-[9px] opacity-80">{v.confidence} %</div>}
                    </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {hasLiveData && (
        <section className="rounded-2xl border border-sky-400/40 bg-sky-950/15 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Zusätzlich aus dem Live-Feed ({liveNext.length})</h2>
          <ul className="mt-2 space-y-1">
            {liveNext.map((f) => (
              <li key={f.id} className="grid grid-cols-[auto_1fr] gap-2 rounded border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                <span className="font-mono text-[10px] text-slate-500">{fmtDate(f.date)}</span>
                <span className="text-slate-200">{f.homeTeam} vs. {f.awayTeam}{f.prediction ? ` · Tipp: ${f.prediction.likelyScore.home}:${f.prediction.likelyScore.away} (${Math.round(f.prediction.pickConfidence * 100)} %)` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Spielplan-Daten manuell aus offiziellen FIFA-Quellen gepflegt (Stand: vor Turnier-Beginn). Sobald TheSportsDB die WM live führt, fließen deren Daten ergänzend mit ein. Modell: Poisson auf Nationalmannschafts-Form — Trefferquote dünner als bei Vereins-Ligen, weil Länderspiele seltener sind.
      </footer>
    </main>
  );
}
