// Zeigt für ein spezifisches Asset, welche Persönlichkeiten es als ihren
// Top-Pick gewählt haben. Hilft dem User zu sehen: "Auf diese Aktie schauen
// X Vorstände — egal welcher Risiko-Charakter".

interface Pick {
  persona: string;
  name: string;
  verdict: string;
}

const PERSONA_EMOJI: Record<string, string> = {
  conservative: '🛡️',
  balanced: '⚖️',
  aggressive: '⚡'
};

function tone(verdict: string): string {
  if (verdict === 'KAUFEN' || verdict === 'BUY' || verdict === 'TIPPEN') {
    return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  }
  if (verdict === 'BEOBACHTEN') {
    return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
  }
  return 'border-slate-700 bg-slate-900/40 text-slate-300';
}

export function PersonaPickStrip({ picks, assetName }: { picks: Pick[]; assetName: string }) {
  if (picks.length === 0) return null;
  const buys = picks.filter((p) => p.verdict === 'KAUFEN' || p.verdict === 'BUY' || p.verdict === 'TIPPEN').length;
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">👥 Vorstands-Picks für {assetName}</h2>
        <span className="text-[10px] text-slate-500">{buys}/{picks.length} kaufen/tippen</span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {picks.map((p) => (
          <li key={p.persona} className={`inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1 text-[11px] ${tone(p.verdict)}`}>
            <span>{PERSONA_EMOJI[p.persona] ?? ''}</span>
            <span className="font-semibold">{p.name}</span>
            <span className="font-mono text-[9.5px] opacity-80">{p.verdict}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
