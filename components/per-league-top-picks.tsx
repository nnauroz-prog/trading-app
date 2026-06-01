import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function PerLeagueTopPicks({ synth }: { synth: FirmaSynthesis }) {
  if (synth.perLeagueTopPicks.length === 0) return null;
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Top-Tipp pro Liga</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Aus jeder aktiven Liga das beste Setup der Woche — nach Konfidenz sortiert. Sortiert von „sicher" oben nach „offen" unten.
        </p>
      </div>
      <ul className="space-y-1.5">
        {synth.perLeagueTopPicks.map((p) => (
          <li key={p.fixture.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
            <div className="min-w-0">
              <div className="text-[9.5px] uppercase tracking-wider text-slate-500">{p.leagueName}</div>
              <div className="truncate text-[12px] font-semibold text-slate-100">
                {p.fixture.homeTeam} <span className="text-slate-500">vs.</span> {p.fixture.awayTeam}
              </div>
              <div className="text-[10px] text-slate-500">{fmtDate(p.fixture.date)} · {p.pickPlain}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-base font-bold text-emerald-100">{p.likelyScore.home}:{p.likelyScore.away}</div>
              <div className="font-mono text-[10px] text-emerald-300">{Math.round(p.confidence * 100)}%</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
