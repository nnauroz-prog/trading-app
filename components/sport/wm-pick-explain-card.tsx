// Tipp-Erklaer-Karte. Zeigt fuer den naechsten (Top-)Pick alle Faktoren
// als Liste mit kleinem Stuetz-/Gegenwind-Balken. Versteckt sich,
// wenn kein Pick freigegeben ist.

import { explainWmPick, type WmPickExplainRow } from '@/lib/sport/wm-pick-explain';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
}

function Balken({ row }: { row: WmPickExplainRow }) {
  const cells = [0, 1, 2].map((i) => {
    const active = i < row.weight;
    if (!active) return <span key={i} className="h-2 w-3 rounded-sm bg-slate-800/80" />;
    if (row.direction === 'fuer') return <span key={i} className="h-2 w-3 rounded-sm bg-emerald-400/80" />;
    if (row.direction === 'gegen') return <span key={i} className="h-2 w-3 rounded-sm bg-rose-400/80" />;
    return <span key={i} className="h-2 w-3 rounded-sm bg-slate-600/80" />;
  });
  return <div className="flex items-center gap-0.5">{cells}</div>;
}

export function WmPickExplainCard({ picks }: Props) {
  if (picks.length === 0) return null;
  const top = picks[0];
  const ex = explainWmPick(top);
  const supports = ex.rows.filter((r) => r.direction === 'fuer').length;
  const against = ex.rows.filter((r) => r.direction === 'gegen').length;

  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-950/10 p-3" aria-label="Tipp im Detail">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Tipp im Detail</h3>
        <span className="text-[10px] text-emerald-200/70">{supports} pro, {against} contra</span>
      </div>
      <div className="rounded border border-slate-800 bg-slate-950/40 p-2">
        <p className="text-[12px] font-semibold text-slate-100">{ex.pickLabel}</p>
        <p className="text-[10.5px] text-slate-400">{ex.headline} — {ex.modelProbabilityPct} %, ELO {ex.eloDiff > 0 ? '+' : ''}{ex.eloDiff.toFixed(0)}</p>
      </div>
      <details className="group rounded border border-slate-800 bg-slate-950/30 p-2 open:border-emerald-500/40">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wider text-emerald-200/90 hover:text-emerald-200">
          <span className="mr-1 inline-block transition group-open:rotate-90">{'>'}</span>
          Warum dieser Tipp? — alle Faktoren zeigen
        </summary>
        <ul className="mt-2 space-y-1">
          {ex.rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded border border-slate-800/60 bg-slate-900/40 px-2 py-1">
              <Balken row={r} />
              <span className="min-w-[8rem] text-[11px] text-slate-100">{r.label}</span>
              <span className={`font-mono text-[10.5px] ${r.direction === 'fuer' ? 'text-emerald-300' : r.direction === 'gegen' ? 'text-rose-300' : 'text-slate-400'}`}>
                {r.valueLabel}
              </span>
              {r.hint && <span className="basis-full pl-1 text-[10px] leading-snug text-slate-400">{r.hint}</span>}
            </li>
          ))}
        </ul>
      </details>
      {ex.riskNotes.length > 0 && (
        <ul className="space-y-0.5 text-[10px] leading-snug text-amber-200/80">
          {ex.riskNotes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <p className="text-[9.5px] leading-snug text-slate-500">
        Diese Aufschluesselung ist eine Lese-Hilfe — sie ersetzt kein eigenes Urteil. Auch ein Tipp mit vielen &quot;pro&quot;-Faktoren kann verlieren.
      </p>
    </section>
  );
}
