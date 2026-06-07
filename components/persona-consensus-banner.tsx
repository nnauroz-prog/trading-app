// Banner, das zeigt, wenn mindestens 2 von 3 Persönlichkeiten desselben
// Vorstands das gleiche Verdict abgeben. Funktioniert für Aktien und Rohstoffe
// gleichermaßen, weil Verdict-Strings identisch sind.

interface Verdict {
  persona: string;
  name: string;
  verdict: 'KAUFEN' | 'BEOBACHTEN' | 'WARTEN';
}

interface Props {
  verdicts: Verdict[];
  context: 'Aktien' | 'Rohstoffe';
}

export function PersonaConsensusBanner({ verdicts, context }: Props) {
  if (verdicts.length === 0) return null;

  const counts: Record<string, number> = { KAUFEN: 0, BEOBACHTEN: 0, WARTEN: 0 };
  for (const v of verdicts) counts[v.verdict] = (counts[v.verdict] ?? 0) + 1;

  const buyCount = counts['KAUFEN'] ?? 0;
  const waitCount = counts['WARTEN'] ?? 0;
  const watchCount = counts['BEOBACHTEN'] ?? 0;

  if (buyCount === verdicts.length) {
    return (
      <section className="rounded-2xl border border-emerald-400/70 bg-emerald-500/15 p-3 text-[12px] text-emerald-100">
        <strong>🎯 Voller Konsens: KAUFEN</strong>{' '}
        <span className="opacity-90">— alle drei {context}-Persönlichkeiten signalisieren grün. Sehr selten, sehr stark. Vergangenheit ≠ Zukunft.</span>
      </section>
    );
  }
  if (buyCount === 2) {
    const dissent = verdicts.find((v) => v.verdict !== 'KAUFEN');
    return (
      <section className="rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-3 text-[12px] text-emerald-100">
        <strong>✓ Mehrheits-Konsens: KAUFEN</strong>{' '}
        <span className="opacity-80">— 2 von 3 {context}-Persönlichkeiten sagen grün, {dissent?.name} bleibt {dissent?.verdict.toLowerCase()}.</span>
      </section>
    );
  }
  if (waitCount === verdicts.length) {
    return (
      <section className="rounded-2xl border border-rose-400/40 bg-rose-950/15 p-3 text-[12px] text-rose-100">
        <strong>⛔ Voller Konsens: WARTEN</strong>{' '}
        <span className="opacity-90">— alle drei {context}-Persönlichkeiten lehnen heute ab. Cash bleibt eine Position.</span>
      </section>
    );
  }
  if (watchCount >= 2) {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-amber-950/15 p-3 text-[12px] text-amber-100">
        <strong>👀 Mehrheits-Konsens: BEOBACHTEN</strong>{' '}
        <span className="opacity-90">— die {context}-Persönlichkeiten sind nicht überzeugt. Heute auf Setup-Verbesserung warten.</span>
      </section>
    );
  }
  // Gemischt — kein eindeutiger Konsens
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3 text-[12px] text-slate-300">
      <strong>🟰 Kein Konsens im {context}-Vorstand</strong>{' '}
      <span className="opacity-80">— die drei Persönlichkeiten sind sich uneinig (KAUFEN {buyCount} · BEOBACHTEN {watchCount} · WARTEN {waitCount}). Vorsicht walten lassen.</span>
    </section>
  );
}
