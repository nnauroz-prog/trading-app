import Link from 'next/link';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { WORLD_CUP_LEAGUE_IDS } from '@/lib/sport/leagues';
import type { UpcomingFixture, Fixture } from '@/lib/sport/fetcher';
import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictMatch } from '@/lib/sport/predictor';

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

function winnerVerdict(home: string, away: string, finishedPool: Fixture[]): WinnerVerdict {
  if (!isKnownTeam(home) || !isKnownTeam(away)) {
    return { text: 'Paarung noch offen', confidence: 0, tone: 'border-slate-700 bg-slate-900/40 text-slate-400', knownPair: false };
  }
  const pred = predictMatch(home, away, finishedPool);
  if (!pred) return { text: 'Keine Form-Daten im Pool', confidence: 0, tone: 'border-slate-700 bg-slate-900/40 text-slate-400', knownPair: true };
  const pct = Math.round(pred.pickConfidence * 100);
  if (pred.pickConfidence < 0.45) {
    return {
      text: `Offen — Heim ${Math.round(pred.pHome * 100)} %, Remis ${Math.round(pred.pDraw * 100)} %, Auswärts ${Math.round(pred.pAway * 100)} %`,
      confidence: pct, tone: 'border-amber-400/40 bg-amber-500/10 text-amber-200', knownPair: true
    };
  }
  if (pred.pickSide === 'home') {
    return {
      text: `${home} gewinnt`, confidence: pct,
      tone: pct >= 65 ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-sky-400/50 bg-sky-500/15 text-sky-200',
      knownPair: true
    };
  }
  if (pred.pickSide === 'away') {
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
                const v = winnerVerdict(f.homeTeam, f.awayTeam, fullPool);
                return (
                  <li key={f.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2 text-[11.5px]">
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
