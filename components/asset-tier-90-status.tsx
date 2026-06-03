import type { TradeTier90Result } from '@/lib/agents/trade-tier-90';

interface Props {
  result: TradeTier90Result;
  coinSymbol: string;
}

// Kompakte Anzeige des Tier-90-Status für eine spezifische Coin-Detail-Seite.
// Wenn alle 5 Säulen grün sind und dieser Coin ist Empfehlung: groß goldener
// Hinweis. Wenn nicht qualifiziert: aufgelistet was fehlt — als Mini-Karte.
export function AssetTier90Status({ result, coinSymbol }: Props) {
  if (result.qualified) {
    return (
      <section className="rounded-2xl border-2 border-yellow-300/70 bg-yellow-950/15 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-300">⚜ Tier 90 · {coinSymbol}</div>
        <p className="mt-1 text-[12.5px] leading-snug text-yellow-100">
          Alle 5 Analyse-Säulen sind aktuell grün für {coinSymbol} — höchstes Vertrauen. Trotzdem: Stop einhalten, Position klein, kein Einzelspiel ist garantiert.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tier-90-Status · {coinSymbol}</div>
      <div className="mt-1 text-[12px] leading-snug text-slate-200">
        Nicht qualifiziert: {result.pillarsHit}/{result.pillarsTotal} Säulen erfüllt.
      </div>
      <ul className="mt-2 space-y-1 text-[10.5px]">
        {result.pillars.map((p) => (
          <li key={p.id} className="grid grid-cols-[auto_1fr] gap-1.5">
            <span className={p.passed ? 'text-emerald-400' : 'text-rose-400'}>{p.passed ? '✓' : '✗'}</span>
            <span className="text-slate-300">{p.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
