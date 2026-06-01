import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

// Welche Liga liefert in den nächsten 7 Tagen am meisten klare Tipps?
// Reine Übersicht, damit man weiß, wo es sich gerade lohnt zu schauen.
export function LeagueHeatmap({ synth }: { synth: FirmaSynthesis }) {
  if (synth.weekAhead.length === 0) return null;

  const byLeague = new Map<string, { fixtures: number; safe: number; bestConf: number }>();
  for (const day of synth.weekAhead) {
    for (const { fixture, leagueName } of day.fixtures) {
      const entry = byLeague.get(leagueName) ?? { fixtures: 0, safe: 0, bestConf: 0 };
      entry.fixtures++;
      if (fixture.prediction) {
        if (fixture.prediction.pickConfidence >= synth.safetyPickThreshold) entry.safe++;
        if (fixture.prediction.pickConfidence > entry.bestConf) entry.bestConf = fixture.prediction.pickConfidence;
      }
      byLeague.set(leagueName, entry);
    }
  }

  const rows = Array.from(byLeague.entries())
    .map(([league, data]) => ({ league, ...data }))
    .sort((a, b) => b.safe - a.safe || b.bestConf - a.bestConf);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Liga-Heatmap (7 Tage)</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Wo gibt es jetzt klare Tipps? Sortiert nach Anzahl sicherer Tipps in dieser Liga, dann nach bester Konfidenz.
        </p>
      </div>
      <ul className="space-y-1">
        {rows.map((r) => {
          const tone = r.safe > 0 ? 'text-emerald-300' : r.bestConf >= 0.5 ? 'text-amber-300' : 'text-slate-500';
          return (
            <li key={r.league} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
              <span className="text-slate-200">{r.league}</span>
              <span className="text-[10px] text-slate-500">{r.fixtures} Spiele</span>
              <span className={`font-mono text-[10.5px] ${tone}`}>
                {r.safe} sicher · best {Math.round(r.bestConf * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
