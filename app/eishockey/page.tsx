import { LiveScoreboard } from '@/components/sport/live-scoreboard';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getHockeyFixtures } from '@/lib/sport/multi-sport-fetcher';

export const metadata: Metadata = {
  title: 'Eishockey · NHL, DEL, KHL, SHL',
  description: 'Eishockey-Tageswerte fuer NHL, DEL, KHL und SHL. Modell-Tendenz pro Spiel, keine Wettempfehlung.'
};
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

export default async function HockeyPage() {
  const leagues = await getHockeyFixtures();
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-8 md:p-6">
      <Link href="/" className="inline-flex min-h-9 items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-[#65e6ff]">
        ← zurück zum Trading Desk
      </Link>
      <header className="relative overflow-hidden border-b border-white/10 pb-6 pt-2 sm:pb-8">
        <p className="section-kicker text-[#65e6ff]">Sport / Eishockey</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Eishockey. Im Fokus.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">NHL-Ergebnisse von ESPN, alle 30 Sekunden aktualisiert. Ergänzende Spielpläne für DEL, KHL und SHL von TheSportsDB, soweit verfügbar.</p>
        <div className="mt-5 inline-flex items-center gap-2 border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500"><span className="h-1 w-1 bg-[#65e6ff]" />Ergebnisse · Spielplan · Modell-Tendenzen</div>
      </header>
      <LiveScoreboard initialSport="hockey" />

      {leagues.every((l) => l.next.length === 0 && l.last.length === 0) && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4 text-[11.5px] leading-snug text-amber-100/85">
          Aktuell keine Eishockey-Matches im Datenpool. Sommerpause oder TheSportsDB pflegt die Liga gerade nicht. Im Herbst/Winter füllt es sich.
        </section>
      )}

      {leagues.map((lf) => {
        if (lf.next.length === 0 && lf.last.length === 0) return null;
        const today = lf.next.filter((f) => f.date === todayIso);
        const rest = lf.next.filter((f) => f.date !== todayIso);
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
                      homeTeam: f.homeTeam, awayTeam: f.awayTeam,
                      prediction: null, h2h: null,
                      finishedPool: lf.last, sport: 'hockey'
                    });
                    return (
                      <li key={f.id} className="space-y-1.5 rounded-md border border-amber-400/40 bg-amber-950/20 px-2.5 py-2">
                        <div className="grid grid-cols-[auto_1fr] gap-2 text-[11.5px]">
                          <span className="font-mono text-[10px] text-amber-300">{fmtTime(f.time, f.date)}</span>
                          <span className="text-slate-100">{f.homeTeam} <span className="text-slate-500">vs.</span> {f.awayTeam}</span>
                        </div>
                        <WinnerVerdictCard verdict={verdict} homeTeam={f.homeTeam} awayTeam={f.awayTeam} showExtraTime />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {rest.length > 0 && (
              <ul className="space-y-1">
                {rest.map((f) => (
                  <li key={f.id} className="grid grid-cols-[auto_1fr] gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                    <span className="font-mono text-[10px] text-slate-500">{fmtDate(f.date)} {fmtTime(f.time, f.date)}</span>
                    <span className="text-slate-200">{f.homeTeam} vs. {f.awayTeam}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </main>
  );
}
