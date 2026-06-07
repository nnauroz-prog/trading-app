// Banner, das zeigt, wenn mindestens 2 von 3 Persönlichkeiten desselben
// Vorstands das gleiche Verdict abgeben. Verdict-Strings sind je Asset-Klasse
// anders (KAUFEN vs. TIPPEN), aber „kauft/tippt" wird einheitlich als „buy"
// gemappt.

interface Verdict {
  persona: string;
  name: string;
  verdict: string;
}

interface Props {
  verdicts: Verdict[];
  context: 'Krypto' | 'Aktien' | 'Rohstoffe' | 'WM' | 'Liga-Fußball';
}

function classify(v: string): 'buy' | 'watch' | 'wait' {
  if (v === 'KAUFEN' || v === 'BUY' || v === 'TIPPEN') return 'buy';
  if (v === 'BEOBACHTEN') return 'watch';
  return 'wait';
}

export function PersonaConsensusBanner({ verdicts, context }: Props) {
  if (verdicts.length === 0) return null;

  const counts = { buy: 0, watch: 0, wait: 0 };
  for (const v of verdicts) counts[classify(v.verdict)]++;

  const buyLabel = context === 'WM' || context === 'Liga-Fußball' ? 'TIPPEN' : 'KAUFEN';

  if (counts.buy === verdicts.length) {
    return (
      <section className="rounded-2xl border border-emerald-400/70 bg-emerald-500/15 p-3 text-[12px] text-emerald-100">
        <strong>🎯 Voller Konsens: {buyLabel}</strong>{' '}
        <span className="opacity-90">— alle drei {context}-Persönlichkeiten signalisieren grün. Sehr selten, sehr stark. Vergangenheit ≠ Zukunft.</span>
      </section>
    );
  }
  if (counts.buy === 2) {
    const dissent = verdicts.find((v) => classify(v.verdict) !== 'buy');
    return (
      <section className="rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-3 text-[12px] text-emerald-100">
        <strong>✓ Mehrheits-Konsens: {buyLabel}</strong>{' '}
        <span className="opacity-80">— 2 von 3 {context}-Persönlichkeiten sagen grün, {dissent?.name} bleibt {dissent?.verdict.toLowerCase()}.</span>
      </section>
    );
  }
  if (counts.wait === verdicts.length) {
    return (
      <section className="rounded-2xl border border-rose-400/40 bg-rose-950/15 p-3 text-[12px] text-rose-100">
        <strong>⛔ Voller Konsens: WARTEN</strong>{' '}
        <span className="opacity-90">— alle drei {context}-Persönlichkeiten lehnen heute ab. Cash bleibt eine Position.</span>
      </section>
    );
  }
  if (counts.watch >= 2) {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-amber-950/15 p-3 text-[12px] text-amber-100">
        <strong>👀 Mehrheits-Konsens: BEOBACHTEN</strong>{' '}
        <span className="opacity-90">— die {context}-Persönlichkeiten sind nicht überzeugt. Heute auf Setup-Verbesserung warten.</span>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3 text-[12px] text-slate-300">
      <strong>🟰 Kein Konsens im {context}-Vorstand</strong>{' '}
      <span className="opacity-80">— die drei Persönlichkeiten sind sich uneinig ({buyLabel} {counts.buy} · BEOBACHTEN {counts.watch} · WARTEN {counts.wait}). Vorsicht walten lassen.</span>
    </section>
  );
}
