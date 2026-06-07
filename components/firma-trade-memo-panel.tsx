// Volles Trade-Memo der Firma: Schritte, Position-Sizing, Invalidations-Gründe.
// Wird nur bei BUY-Verdict angezeigt — sonst gibt's nichts zu beschreiben.

import type { TradeMemo } from '@/lib/agents/trade-memo';

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

export function FirmaTradeMemoPanel({ memo }: { memo: TradeMemo }) {
  return (
    <div className="space-y-2 rounded-md border border-emerald-400/30 bg-emerald-950/20 p-2.5 text-[11px]">
      <div>
        <div className="text-[9px] uppercase tracking-wider text-emerald-300">Trade-Memo · Heute kaufen: {memo.coin}</div>
        <div className="mt-1 grid grid-cols-3 gap-1 text-center text-[10px]">
          <div><div className="text-slate-500">Einstieg</div><div className="font-mono text-slate-200">${fmt(memo.entry)}</div></div>
          <div><div className="text-rose-400">Stop</div><div className="font-mono text-rose-200">${fmt(memo.stop)}</div></div>
          <div><div className="text-emerald-400">Ziel 1</div><div className="font-mono text-emerald-200">${fmt(memo.target1)}</div></div>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">{memo.positionSizeAt10k}</div>
      </div>

      <details className="rounded border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer p-2 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:text-emerald-200">
          ▸ Schritte ({memo.steps.length})
        </summary>
        <ol className="space-y-1 p-2 pt-0 text-[10.5px]">
          {memo.steps.map((step, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-2 leading-snug">
              <span className="font-mono text-[10px] text-emerald-300">{i + 1}.</span>
              <span className="text-slate-300">{step}</span>
            </li>
          ))}
        </ol>
      </details>

      <details className="rounded border border-rose-500/30 bg-rose-950/15">
        <summary className="cursor-pointer p-2 text-[10px] font-semibold uppercase tracking-wider text-rose-300 hover:text-rose-100">
          ▸ Was das Setup kaputt macht ({memo.whatKillsIt.length})
        </summary>
        <ul className="space-y-1 p-2 pt-0 text-[10.5px]">
          {memo.whatKillsIt.map((reason, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-2 leading-snug">
              <span aria-hidden className="text-rose-400">⚠</span>
              <span className="text-slate-300">{reason}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
