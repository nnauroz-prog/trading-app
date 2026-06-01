import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

// Kombi-Tipp der Woche: die drei sichersten Picks zu einem Schein
// gerechnet. Multipliziert die Einzel-Konfidenzen. Spielspaß-Feature, kein
// Wettrechner.
export function MultiTipCombo({ synth }: { synth: FirmaSynthesis }) {
  const top3 = synth.highConfidencePicks.slice(0, 3);
  if (top3.length < 2) return null;
  const product = top3.reduce((acc, p) => acc * p.confidence, 1);
  const pct = Math.round(product * 100);
  return (
    <section className="space-y-2 rounded-2xl border border-sky-400/40 bg-sky-950/15 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Kombi-Tipp der Woche</h2>
        <span className="rounded-md border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] text-sky-200">{pct}%</span>
      </header>
      <p className="text-[10.5px] leading-snug text-slate-400">
        Die {top3.length} sichersten Tipps der Woche zusammen. Trifft nur, wenn alle stimmen — Wahrscheinlichkeit fällt deshalb steil ab. Ideal für „all or nothing“-Tippspiele unter Freunden.
      </p>
      <ul className="space-y-1">
        {top3.map((p, i) => (
          <li key={p.fixture.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
            <span className="font-mono text-[10px] text-sky-300">#{i + 1}</span>
            <span className="text-slate-100">
              <span className="font-semibold">{p.fixture.homeTeam}</span>{' '}vs.{' '}
              <span className="font-semibold">{p.fixture.awayTeam}</span>
              <span className="ml-1 text-[9.5px] uppercase tracking-wider text-slate-500">{p.leagueName}</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-300">
              {p.likelyScore.home}:{p.likelyScore.away} · {Math.round(p.confidence * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
