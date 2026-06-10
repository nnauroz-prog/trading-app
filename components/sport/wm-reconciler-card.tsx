// Schedule-Reconciler-Bericht: zeigt wie viele unserer internen WM-
// Fixtures durch eine externe Quelle (TheSportsDB FIFA World Cup-Liga)
// bestaetigt wurden. Ein MATCH stuft placeholder-Fixtures auf auslosung
// hoch — der Profi-Tipper laesst Picks darauf wieder durch.
//
// Wording ohne verbotene Begriffe.

import type { ReconcileResult, ReconcileStatus } from '@/lib/sport/wm-schedule-reconciler';

interface Props {
  result: ReconcileResult;
}

const STATUS_LABEL: Record<ReconcileStatus, string> = {
  MATCH: 'bestaetigt',
  MISMATCH: 'abweichend',
  UNKNOWN: 'nicht in externer Quelle'
};

const STATUS_CLASS: Record<ReconcileStatus, string> = {
  MATCH: 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100',
  MISMATCH: 'border-rose-500/40 bg-rose-950/20 text-rose-100',
  UNKNOWN: 'border-slate-700 bg-slate-900/40 text-slate-300'
};

export function WmReconcilerCard({ result }: Props) {
  if (result.internalCount === 0) return null;

  const overallCls = result.mismatched > 0
    ? 'border-rose-500/40 bg-rose-950/20'
    : result.matched > 0
      ? 'border-emerald-400/40 bg-emerald-950/15'
      : 'border-slate-700 bg-slate-900/40';

  return (
    <section className={`space-y-2 rounded-2xl border-2 p-3 ${overallCls}`} aria-label="Schedule-Reconciler">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">Schedule-Reconciler · externe Quelle</h3>
        <span className="text-[10px] text-slate-400">{result.internalCount} Fixtures · Fenster 14 Tage</span>
      </div>

      <p className="text-[11px] leading-snug text-slate-200">
        Vergleicht unser internes WM-Schedule mit der FIFA-World-Cup-Liga aus TheSportsDB.
        Wenn die externe Quelle eine placeholder-Paarung bestaetigt, wird sie automatisch hochgestuft — der Profi-Tipper laesst Picks darauf dann zu.
      </p>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded border border-emerald-500/30 bg-emerald-950/15 p-2">
          <div className="text-[9px] uppercase tracking-wider text-emerald-300/80">bestaetigt</div>
          <div className="font-mono text-lg font-bold text-emerald-200">{result.matched}</div>
        </div>
        <div className="rounded border border-rose-500/30 bg-rose-950/15 p-2">
          <div className="text-[9px] uppercase tracking-wider text-rose-300/80">abweichend</div>
          <div className="font-mono text-lg font-bold text-rose-200">{result.mismatched}</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-950/40 p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-400">offen</div>
          <div className="font-mono text-lg font-bold text-slate-300">{result.unknown}</div>
        </div>
      </div>

      <div className="rounded border border-slate-800 bg-slate-950/30 p-2 text-[10.5px] text-slate-300">
        Verifizierungsgrad: <span className="font-mono font-bold text-slate-100">{result.verifiedPct} %</span>
        {result.matched > 0 && (
          <span className="ml-2 text-emerald-200">· {result.entries.filter((e) => e.status === 'MATCH' && e.upgradeTo).length} placeholder → auslosung hochgestuft</span>
        )}
      </div>

      {result.mismatched > 0 && (
        <details className="rounded border border-rose-500/30 bg-rose-950/15 p-2">
          <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-rose-200 hover:text-rose-100">
            ▸ {result.mismatched} abweichende Paarungen anzeigen
          </summary>
          <ul className="mt-1.5 space-y-0.5 text-[10.5px]">
            {result.entries.filter((e) => e.status === 'MISMATCH').map((e) => (
              <li key={e.fixtureId} className="rounded border border-rose-500/30 bg-rose-950/15 p-1.5">
                <div className="font-mono text-[9.5px] opacity-70">{e.internalDate} · {e.fixtureId}</div>
                <div className="text-rose-100">
                  intern: <span className="font-semibold">{e.internalHome} – {e.internalAway}</span>
                </div>
                <div className="text-rose-200/80">
                  extern: <span className="font-semibold">{e.externalHome} – {e.externalAway}</span>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {result.matched > 0 && (
        <details className="rounded border border-emerald-500/30 bg-emerald-950/15 p-2">
          <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-emerald-200 hover:text-emerald-100">
            ▸ {result.matched} bestaetigte Paarungen anzeigen
          </summary>
          <ul className="mt-1.5 space-y-0.5 text-[10.5px]">
            {result.entries.filter((e) => e.status === 'MATCH').map((e) => (
              <li key={e.fixtureId} className={`rounded border px-1.5 py-1 ${STATUS_CLASS[e.status]}`}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[9.5px] opacity-70">{e.internalDate}</span>
                  <span className="font-semibold">{e.internalHome} – {e.internalAway}</span>
                  <span className="ml-auto text-[9.5px] uppercase tracking-wider opacity-70">{STATUS_LABEL[e.status]}</span>
                  {e.upgradeTo && (
                    <span className="rounded border border-emerald-400/50 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                      hochgestuft: {e.internalConfidence} → {e.upgradeTo}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
