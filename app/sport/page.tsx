import Link from 'next/link';
import { getFootballFixtures, Fixture } from '@/lib/sport/fetcher';

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

export default async function SportPage() {
  const leagues = await getFootballFixtures();
  const anyData = leagues.some((l) => l.next.length > 0 || l.last.length > 0);

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

      <section className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/20 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-200">Wichtig — bitte ernst nehmen</div>
        <p className="mt-1 text-[12px] leading-relaxed text-amber-100/90">
          Diese Seite zeigt <strong>nur Spielpläne und Ergebnisse</strong>. <strong>Keine Quoten, keine Wett-Tipps, keine Vorhersagen.</strong>
          Sportwetten haben eine eingebaute Haus-Marge (üblich 5–10 %) — über viele Wetten verlierst du systematisch. Das ist
          mathematisch, nicht meine Meinung. Wenn du wettest, dann nur mit Geld, das du komplett verlieren kannst, und niemals
          aus dem Trading-Budget.
        </p>
      </section>

      {!anyData && (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          Spielplan-Daten gerade nicht verfügbar — versuch&apos;s in ein paar Minuten nochmal.
        </p>
      )}

      <div className="space-y-3">
        {leagues.map((lf) => {
          if (lf.next.length === 0 && lf.last.length === 0) return null;
          return (
            <details key={lf.league.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <summary className="cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100">
                ▸ {lf.league.name} <span className="text-slate-500">· {lf.league.country}</span>
              </summary>
              <div className="space-y-4 p-4 pt-0">
                {lf.next.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Nächste Spiele</h3>
                    <ul className="space-y-1.5">
                      {lf.next.map((f) => <FixtureRow key={f.id} f={f} />)}
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
              </div>
            </details>
          );
        })}
      </div>

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Daten: TheSportsDB (öffentlich, frei) · Zeiten in Europe/Berlin · Aktualisierung max. stündlich · keine Garantie auf Vollständigkeit/Korrektheit.
      </footer>
    </main>
  );
}
