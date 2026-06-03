import Link from 'next/link';
import type { Fixture, UpcomingFixture, LeagueFixtures } from '@/lib/sport/fetcher';

interface Props {
  leagues: LeagueFixtures[];
}

function fmtTime(time: string | null, date: string): string {
  if (!time) return '—';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

interface ResolvedFixture {
  fixture: Fixture;
  league: string;
  modelPickSide: 'home' | 'away' | 'draw' | null;
  modelScoreHome: number | null;
  modelScoreAway: number | null;
  hit: boolean | null;
}

// Zeigt heute bereits abgeschlossene Spiele mit Endstand UND dem Modell-Tipp.
// Wenn die Tipp-Richtung trifft → grüner Haken. Wenn nicht → rotes X.
// User-Anforderung: "markier mir dann, welches wirklich am Ende kommt".
export function SportTodayResolved({ leagues }: Props) {
  const todayIso = new Date().toISOString().slice(0, 10);

  // upcoming (mit Predictions) als Lookup für Modell-Tipps zu finished Fixtures
  const predictionByPairKey = new Map<string, UpcomingFixture['prediction']>();
  for (const lf of leagues) {
    for (const f of lf.next) {
      const key = `${f.homeTeam}|${f.awayTeam}|${f.date}`;
      predictionByPairKey.set(key, f.prediction);
    }
  }

  const resolved: ResolvedFixture[] = [];
  for (const lf of leagues) {
    for (const f of lf.last) {
      if (f.date !== todayIso) continue;
      if (f.homeScore === null || f.awayScore === null) continue;
      // Modell-Tipp aus dem next-pool des selben Tages mit gleichem Paar (selten,
      // weil finished-Spiele meist schon nicht mehr in next stehen). Wenn nicht
      // vorhanden, kein Tipp-Markierung — Spiel wird trotzdem mit Score gezeigt.
      const pred = predictionByPairKey.get(`${f.homeTeam}|${f.awayTeam}|${f.date}`) ?? null;
      const actual: 'home' | 'away' | 'draw' = f.homeScore > f.awayScore ? 'home' : f.homeScore < f.awayScore ? 'away' : 'draw';
      const hit = pred ? pred.pickSide === actual : null;
      resolved.push({
        fixture: f,
        league: lf.league.name,
        modelPickSide: pred?.pickSide ?? null,
        modelScoreHome: pred?.likelyScore.home ?? null,
        modelScoreAway: pred?.likelyScore.away ?? null,
        hit
      });
    }
  }

  if (resolved.length === 0) return null;
  resolved.sort((a, b) => (a.fixture.time ?? '').localeCompare(b.fixture.time ?? ''));

  const withModel = resolved.filter((r) => r.modelPickSide !== null);
  const hits = withModel.filter((r) => r.hit === true).length;
  const total = withModel.length;
  const todayHitRate = total > 0 ? Math.round((hits / total) * 100) : null;

  return (
    <section className="space-y-3 rounded-2xl border-2 border-sky-400/40 bg-slate-900/60 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300">⚡ Heute schon fertig</div>
          <h2 className="text-xl font-bold tracking-tight text-white">{resolved.length} Spiele beendet</h2>
        </div>
        {todayHitRate !== null && (
          <span className={`rounded-md border px-2 py-1 font-mono text-[11px] ${todayHitRate >= 60 ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : todayHitRate >= 50 ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-rose-400/40 bg-rose-500/10 text-rose-200'}`}>
            Modell heute: {hits}/{total} · {todayHitRate} %
          </span>
        )}
      </header>
      <ul className="space-y-1.5">
        {resolved.map((r) => {
          const score = `${r.fixture.homeScore}:${r.fixture.awayScore}`;
          const accent = r.hit === true ? 'border-emerald-400/60 bg-emerald-500/10'
            : r.hit === false ? 'border-rose-400/50 bg-rose-500/10'
            : 'border-slate-700 bg-slate-900/40';
          return (
            <li key={r.fixture.id} className={`grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-[11.5px] ${accent}`}>
              <span className="font-mono text-[10px] text-slate-400">{fmtTime(r.fixture.time, r.fixture.date)}</span>
              <Link href={`/sport/team/${encodeURIComponent(r.fixture.homeTeam)}`} className="truncate text-right font-semibold text-slate-100 hover:text-emerald-300">{r.fixture.homeTeam}</Link>
              <div className="text-center">
                <div className="font-mono text-base font-bold text-white">{score}</div>
                {r.modelPickSide !== null && r.modelScoreHome !== null && r.modelScoreAway !== null && (
                  <div className="text-[9px] text-slate-400">Modell: {r.modelScoreHome}:{r.modelScoreAway}</div>
                )}
              </div>
              <Link href={`/sport/team/${encodeURIComponent(r.fixture.awayTeam)}`} className="truncate font-semibold text-slate-100 hover:text-emerald-300">{r.fixture.awayTeam}</Link>
              <span className={`text-center text-[10px] font-bold uppercase tracking-wider ${r.hit === true ? 'text-emerald-300' : r.hit === false ? 'text-rose-300' : 'text-slate-500'}`}>
                {r.hit === true ? '✓ Treffer' : r.hit === false ? '✗ Daneben' : '—'}
                <div className="text-[8.5px] font-normal normal-case tracking-normal text-slate-500">{r.league}</div>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Grüner Rahmen = Modell-Tipp lag richtig. Roter Rahmen = daneben. Grau = kein Modell-Tipp verfügbar (Spiel war nicht im Vorhersage-Pool). Live-Trefferquote heute oben rechts.
      </p>
    </section>
  );
}
