// Empty-State: zeigt warum heute kein Pick freigegeben wurde.
// Top 3 Blocker + fehlende Datenquellen + welche Maerkte blockiert sind +
// was passieren muesste, damit ein Pick freigegeben wird.

interface BlockerEntry { label: string; count: number; }

interface Props {
  topBlockers: BlockerEntry[];
  missingDataKinds: string[]; // z. B. ['Aufstellungen', 'Verletzungsdaten']
  blockedMarkets: string[];   // z. B. ['BTTS', '1X2']
  whatWouldUnblock: string[]; // Anforderungen fuer FREIGABE
}

export function SportBlockerList({ topBlockers, missingDataKinds, blockedMarkets, whatWouldUnblock }: Props) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-4" aria-label="Heute keine Modell-Freigabe">
      <h2 className="text-base font-bold text-slate-100">Heute keine Modell-Freigabe</h2>
      <p className="text-[12px] leading-snug text-slate-300">
        Die Pflichtkriterien wurden heute von keinem Pick erfuellt. Lieber kein Tipp als ein erzwungener.
      </p>

      {topBlockers.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Top-Blocker</div>
          <ul className="mt-1 space-y-0.5 text-[11px] text-slate-200">
            {topBlockers.map((b) => (
              <li key={b.label} className="grid grid-cols-[1fr_auto] gap-2">
                <span className="truncate">{b.label}</span>
                <span className="font-mono text-slate-500">{b.count}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingDataKinds.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fehlende Daten</div>
          <ul className="mt-1 flex flex-wrap gap-1.5 text-[10.5px]">
            {missingDataKinds.map((k) => (
              <li key={k} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-0.5 text-slate-300">{k}</li>
            ))}
          </ul>
        </div>
      )}

      {blockedMarkets.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Blockierte Maerkte</div>
          <ul className="mt-1 flex flex-wrap gap-1.5 text-[10.5px]">
            {blockedMarkets.map((m) => (
              <li key={m} className="rounded border border-rose-500/30 bg-rose-950/15 px-2 py-0.5 text-rose-200">{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Was muesste passieren?</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-300">
          {whatWouldUnblock.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
