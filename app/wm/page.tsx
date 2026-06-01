import Link from 'next/link';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { WORLD_CUP_LEAGUE_ID } from '@/lib/sport/leagues';
import { bucketByDay } from '@/lib/sport/day-buckets';
import type { UpcomingFixture } from '@/lib/sport/fetcher';

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

interface WinnerVerdict {
  side: 'home' | 'away' | 'draw' | 'offen';
  text: string;
  confidence: number;
  tone: string;
}

function winnerVerdict(f: UpcomingFixture): WinnerVerdict {
  const p = f.prediction;
  if (!p) return { side: 'offen', text: 'Noch keine Form-Daten', confidence: 0, tone: 'border-slate-700 bg-slate-900/40 text-slate-300' };
  const pct = Math.round(p.pickConfidence * 100);
  if (p.pickConfidence < 0.45) {
    return {
      side: 'offen',
      text: `Offen — ${Math.round(p.pHome * 100)}/${Math.round(p.pDraw * 100)}/${Math.round(p.pAway * 100)}`,
      confidence: pct,
      tone: 'border-amber-400/40 bg-amber-500/10 text-amber-200'
    };
  }
  if (p.pickSide === 'home') {
    return {
      side: 'home',
      text: `${f.homeTeam} gewinnt`,
      confidence: pct,
      tone: pct >= 65 ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-sky-400/50 bg-sky-500/15 text-sky-200'
    };
  }
  if (p.pickSide === 'away') {
    return {
      side: 'away',
      text: `${f.awayTeam} gewinnt`,
      confidence: pct,
      tone: pct >= 65 ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-sky-400/50 bg-sky-500/15 text-sky-200'
    };
  }
  return {
    side: 'draw',
    text: 'Remis am wahrscheinlichsten',
    confidence: pct,
    tone: 'border-amber-400/50 bg-amber-500/15 text-amber-200'
  };
}

export default async function WorldCupPage() {
  const leagues = await getFootballFixtures();
  const wm = leagues.find((l) => l.league.id === WORLD_CUP_LEAGUE_ID) ?? null;

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <Link href="/sport" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Sport-Reiter
      </Link>

      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">FIFA World Cup 2026</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">WM-Gewinner-Vorhersage</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Pro Spiel die wahrscheinlichste Sieger-Seite. Wenn das Modell unsicher ist (≤ 45 %), wird das Spiel als „offen“ markiert mit Heim/Remis/Auswärts-Prozenten — keine erfundene Sicherheit.
        </p>
      </header>

      {!wm || (wm.next.length === 0 && wm.last.length === 0) ? (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-950/15 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">Keine WM-Daten verfügbar</h2>
          <p className="mt-1 text-[12px] leading-snug text-amber-100/90">
            TheSportsDB liefert aktuell keine Spielansetzungen für die FIFA-WM-Liga ({WORLD_CUP_LEAGUE_ID}). Möglich, dass die ID sich ändert sobald das Turnier näher rückt oder ein anderer Endpoint gepflegt wird. Sobald Daten reinkommen, erscheinen sie hier.
          </p>
        </section>
      ) : (() => {
        const buckets = bucketByDay(wm.next);
        const allDays: { date: string; fixtures: UpcomingFixture[] }[] = [];
        const byDate = new Map<string, UpcomingFixture[]>();
        for (const f of wm.next) {
          const d = f.date;
          if (!byDate.has(d)) byDate.set(d, []);
          byDate.get(d)!.push(f);
        }
        for (const [date, fxs] of Array.from(byDate.entries()).sort()) {
          allDays.push({ date, fixtures: fxs.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')) });
        }
        return (
          <>
            <section className="grid grid-cols-3 gap-2">
              <Stat label="Spiele angesetzt" value={String(wm.next.length)} />
              <Stat label="Bereits gespielt" value={String(wm.last.length)} />
              <Stat label="Heute / Morgen" value={`${buckets.today.length + buckets.tomorrow.length}`} />
            </section>

            <div className="space-y-4">
              {allDays.map(({ date, fixtures }) => (
                <section key={date} className="rounded-2xl border-2 border-emerald-400/40 bg-slate-900/40 p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{fmtDate(date)} · {fixtures.length} Spiel{fixtures.length === 1 ? '' : 'e'}</h2>
                  <ul className="mt-2 space-y-1.5">
                    {fixtures.map((f) => {
                      const v = winnerVerdict(f);
                      return (
                        <li key={f.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2 text-[11.5px]">
                          <span className="font-mono text-[10px] text-slate-500">
                            {fmtTime(f.time, f.date) || '—'}
                          </span>
                          <div>
                            <div className="text-[13px] font-semibold text-slate-100">
                              {f.homeTeam} <span className="text-slate-500">vs.</span> {f.awayTeam}
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {f.venue ? `📍 ${f.venue} · ` : ''}{f.prediction ? `Wahrscheinlichster Score: ${f.prediction.likelyScore.home}:${f.prediction.likelyScore.away}` : ''}
                            </div>
                          </div>
                          <span className={`rounded-md border-2 px-2 py-1 text-center font-mono text-[10.5px] font-bold ${v.tone}`}>
                            <div className="text-[9px] uppercase tracking-wider">Gewinner</div>
                            <div className="mt-0.5">{v.text}</div>
                            {v.confidence > 0 && <div className="text-[9px] opacity-80">{v.confidence} %</div>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            {wm.last.length > 0 && (
              <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40">
                <summary className="cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
                  ▸ Bereits gespielte Partien ({wm.last.length})
                </summary>
                <ul className="space-y-1.5 p-4 pt-0">
                  {wm.last.slice(0, 50).map((f) => (
                    <li key={f.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                      <span className="font-mono text-[10px] text-slate-500">{fmtDate(f.date)}</span>
                      <span className="text-slate-200">{f.homeTeam} {f.homeScore}:{f.awayScore} {f.awayTeam}</span>
                      <span className="text-[9.5px] uppercase text-slate-500">{f.venue ?? ''}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        );
      })()}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Modell: Poisson auf Nationalmannschafts-Form aus dem TheSportsDB-Pool. Fokus auf die Gewinner-Seite, nicht den exakten Score — bei Turnier-K.O.-Spielen ist „wer kommt weiter“ wichtiger als „2:1 oder 3:2“.
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-base font-bold text-slate-100">{value}</div>
    </div>
  );
}
