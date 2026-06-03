// Kleine Legende zum Quality-Score — gehört in die Haupt-Seite, damit ein
// neuer User auf einen Blick versteht, was die Farben bedeuten.

export function ScoreColorKey() {
  const items = [
    { score: '85–100', label: 'sehr stark', cls: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' },
    { score: '70–84', label: 'stark', cls: 'border-sky-400/40 bg-sky-500/10 text-sky-200' },
    { score: '55–69', label: 'brauchbar', cls: 'border-amber-400/40 bg-amber-500/10 text-amber-100' },
    { score: '40–54', label: 'Orientierung', cls: 'border-slate-700 bg-slate-800/40 text-slate-300' },
    { score: '0–39', label: 'nicht verwenden', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-200' }
  ];
  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Was bedeutet der Quality-Score?
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-[11px] leading-snug text-slate-400">
          Der Score (0–100) fasst fünf Faktoren zusammen — Modell-Wahrscheinlichkeit, Confidence,
          Datenqualität, Marktart-Risiko und Aktualität. Hoher Score heißt nicht „Spiel ist
          gewonnen“, sondern „Daten und Markt passen zusammen“. Fußball bleibt zufällig.
        </p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {items.map((i) => (
            <li key={i.score} className={`rounded-md border px-2 py-1.5 text-[10.5px] ${i.cls}`}>
              <span className="font-mono font-bold">{i.score}</span>
              <span className="ml-1.5 opacity-80">{i.label}</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">
          Hartdeckel: schwache Datenlage cappt bei 60, instabile Märkte (enge 1X2) bei 70, beendete Spiele bei 0.
        </p>
      </div>
    </details>
  );
}
