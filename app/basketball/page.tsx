import Link from 'next/link';
import { getBasketballFixtures } from '@/lib/sport/basketball-fetcher';
import { predictWinner } from '@/lib/sport/winner-verdict';
import { WinnerVerdictCard } from '@/components/winner-verdict-card';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtTime(time: string | null, date: string): string {
  if (!time) return '—';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

export default async function BasketballPage() {
  const leagues = await getBasketballFixtures();
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Basketball</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">NBA, EuroLeague, BBL, NCAA</h1>
        <p className="text-sm text-slate-400">
          Kommende Basketball-Spiele aus den größten Wett-Märkten. Live-Daten von TheSportsDB, alle 10 Minuten aktualisiert.
        </p>
      </header>

      {leagues.map((lf) => {
        const today = lf.next.filter((f) => f.date === todayIso);
        const rest = lf.next.filter((f) => f.date !== todayIso).slice(0, 10);
        if (lf.next.length === 0 && lf.last.length === 0) return null;
        return (
          <section key={lf.league.id} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{lf.league.name}</h2>
              <span className="text-[10px] text-slate-500">{lf.league.country} · {lf.next.length} anstehend</span>
            </div>
            {today.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Heute</div>
                <ul className="space-y-2">
                  {today.map((f) => {
                    const verdict = predictWinner({
                      homeTeam: f.homeTeam,
                      awayTeam: f.awayTeam,
                      prediction: null,
                      h2h: null,
                      finishedPool: lf.last
                    });
                    return (
                      <li key={f.id} className="space-y-1.5 rounded-md border border-amber-400/40 bg-amber-950/20 px-2.5 py-2">
                        <div className="grid grid-cols-[auto_1fr_auto] gap-2 text-[11.5px]">
                          <span className="font-mono text-[10px] text-amber-300">{fmtTime(f.time, f.date)}</span>
                          <span className="text-slate-100">{f.homeTeam} <span className="text-slate-500">vs.</span> {f.awayTeam}</span>
                          <span className="text-[9.5px] uppercase tracking-wider text-slate-500">{f.venue ?? ''}</span>
                        </div>
                        <WinnerVerdictCard verdict={verdict} homeTeam={f.homeTeam} awayTeam={f.awayTeam} showExtraTime />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {rest.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Demnächst</div>
                <ul className="space-y-1">
                  {rest.map((f) => (
                    <li key={f.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                      <span className="font-mono text-[10px] text-slate-500">{fmtDate(f.date)} {fmtTime(f.time, f.date)}</span>
                      <span className="text-slate-200">{f.homeTeam} vs. {f.awayTeam}</span>
                      <span className="text-[9.5px] uppercase tracking-wider text-slate-500">{f.venue ?? ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lf.last.length > 0 && (
              <details>
                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                  ▸ Letzte {Math.min(lf.last.length, 10)} Ergebnisse
                </summary>
                <ul className="mt-2 space-y-1">
                  {lf.last.slice(0, 10).map((f) => (
                    <li key={f.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                      <span className="font-mono text-[10px] text-slate-500">{fmtDate(f.date)}</span>
                      <span className="text-slate-200">{f.homeTeam} {f.homeScore ?? '—'}:{f.awayScore ?? '—'} {f.awayTeam}</span>
                      <span className="text-[9.5px] uppercase tracking-wider text-slate-500">{f.venue ?? ''}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Datenquelle: TheSportsDB. Anstoßzeiten in Europe/Berlin. Aktualisierung alle 10 Minuten.
      </footer>
    </main>
  );
}
