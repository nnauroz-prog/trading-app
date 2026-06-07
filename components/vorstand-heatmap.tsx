// Kompakte 5×3-Matrix-Visualisierung aller Vorstands-Verdicts.
// Jede Zeile = Asset-Klasse, jede Spalte = Persona-Typ (Konservativ/Balanciert/Aggressiv).

interface MatrixCell {
  klass: string;
  persona: string;
  verdict: string;
  emoji?: string;
}

interface Props {
  cells: MatrixCell[];
  // Asset-Klassen in der gewünschten Zeilen-Reihenfolge.
  klassOrder: string[];
  // Persona-Typen in der gewünschten Spalten-Reihenfolge.
  personaOrder: string[];
}

function tone(verdict: string): string {
  if (verdict === 'KAUFEN' || verdict === 'BUY' || verdict === 'TIPPEN') {
    return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  }
  if (verdict === 'BEOBACHTEN') {
    return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
  }
  return 'border-slate-700 bg-slate-900/40 text-slate-400';
}

const PERSONA_LABEL: Record<string, string> = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

export function VorstandHeatmap({ cells, klassOrder, personaOrder }: Props) {
  // Indexierte Map für schnellen Zugriff.
  const map = new Map<string, MatrixCell>();
  for (const c of cells) map.set(`${c.klass}::${c.persona}`, c);

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">🗺️ Vorstand-Heatmap</h2>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Alle {cells.length} Verdicts auf einen Blick. Grün = kaufen/tippen, gelb = beobachten, grau = warten.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9.5px] uppercase tracking-wider text-slate-500">
              <th className="py-1.5 text-left font-semibold">Asset</th>
              {personaOrder.map((p) => (
                <th key={p} className="py-1.5 px-1 text-center font-semibold">{PERSONA_LABEL[p] ?? p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {klassOrder.map((k) => (
              <tr key={k} className="border-t border-slate-800/60">
                <td className="py-1.5 pr-2 font-semibold text-slate-100">{k}</td>
                {personaOrder.map((p) => {
                  const c = map.get(`${k}::${p}`);
                  return (
                    <td key={p} className="py-1 px-1">
                      <div className={`rounded border px-1.5 py-1 text-center font-mono text-[9.5px] font-bold uppercase tracking-wider ${tone(c?.verdict ?? '')}`}>
                        {c?.verdict ?? '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
