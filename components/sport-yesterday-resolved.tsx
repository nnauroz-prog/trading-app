// Gestern abgeschlossene Spiele — prominent direkt über der Heute-Karte.
// Schließt die Lücke, dass Freundschaftsspiele und Pokal-Begegnungen
// (z. B. USA vs. Deutschland 6.6.2026 in Chicago) sonst tief im Liga-
// Accordion versteckt waren und der User sie übersehen hat.

import type { Fixture, LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';

interface ResolvedFixture {
  fixture: Fixture;
  league: string;
  modelPickSide: 'home' | 'away' | 'draw' | null;
  modelScoreHome: number | null;
  modelScoreAway: number | null;
  hit: boolean | null;
}

interface Props {
  leagues: LeagueFixtures[];
  daysBack?: number;        // wie viele Tage rückwärts (default 1 = gestern)
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function SportYesterdayResolved({ leagues, daysBack = 1 }: Props) {
  const targetIso = isoDaysAgo(daysBack);

  const predictionByPairKey = new Map<string, UpcomingFixture['prediction']>();
  for (const lf of leagues) {
    for (const f of lf.next) {
      predictionByPairKey.set(`${f.homeTeam}|${f.awayTeam}|${f.date}`, f.prediction);
    }
  }

  const resolved: ResolvedFixture[] = [];
  for (const lf of leagues) {
    for (const f of lf.last) {
      if (f.date !== targetIso) continue;
      if (f.homeScore === null || f.awayScore === null) continue;
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

  resolved.sort((a, b) => a.fixture.homeTeam.localeCompare(b.fixture.homeTeam));
  const hits = resolved.filter((r) => r.hit === true).length;
  const losses = resolved.filter((r) => r.hit === false).length;
  const decisive = hits + losses;

  const headlineLabel = daysBack === 1 ? 'Gestern' : `Vor ${daysBack} Tagen`;

  return (
    <section className="space-y-2 rounded-2xl border border-sky-400/40 bg-slate-900/60 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300">✓ {headlineLabel} abgeschlossen</div>
          <h2 className="text-lg font-bold tracking-tight text-white">{fmtDate(targetIso)} · {resolved.length} {resolved.length === 1 ? 'Spiel' : 'Spiele'}</h2>
        </div>
        {decisive > 0 && (
          <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            Modell {hits}/{decisive}
          </span>
        )}
      </header>
      <ul className="space-y-1">
        {resolved.map((r) => {
          const { fixture: f, modelPickSide, hit } = r;
          const score = `${f.homeScore}:${f.awayScore}`;
          const tone = hit === true ? 'border-emerald-400/50 bg-emerald-500/10'
            : hit === false ? 'border-rose-400/40 bg-rose-500/10'
            : 'border-slate-700 bg-slate-950/40';
          return (
            <li key={f.id} className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11.5px] ${tone}`}>
              <span className="font-mono text-[10px] text-slate-400">{r.league}</span>
              <span className="min-w-0 truncate text-slate-100">
                <span className="font-semibold">{f.homeTeam}</span>
                <span className="mx-1 text-slate-500">vs.</span>
                <span className="font-semibold">{f.awayTeam}</span>
              </span>
              <span className="rounded-md border border-slate-600 bg-slate-900 px-2 py-0.5 font-mono text-sm font-bold text-white">{score}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-wider">
                {modelPickSide === null ? <span className="text-slate-500">—</span>
                  : hit === true ? <span className="text-emerald-300">✓ Tipp</span>
                  : <span className="text-rose-300">✗ Tipp</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Schließt internationale Freundschaftsspiele, Pokal-Begegnungen und alle Liga-Spiele dieses Tages ein — egal wie tief sie sonst in den Accordions stecken.
      </p>
    </section>
  );
}
