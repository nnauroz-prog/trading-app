// Aufklappbarer WM-Abschnitt. Default offen oder geschlossen je nach
// Wichtigkeit. Mit klarer Header-Zeile + Counter, damit der User
// sieht was im zugeklappten Bereich steckt.

import type { ReactNode } from 'react';

interface Props {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function WmSection({ title, hint, defaultOpen = false, children }: Props) {
  return (
    <details
      className="group rounded-2xl border border-slate-700 bg-slate-950/30 open:border-emerald-400/30"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2 px-3 py-2 hover:bg-slate-900/40">
        <span className="flex items-baseline gap-2">
          <span className="text-[9.5px] uppercase tracking-wider text-slate-500 transition group-open:rotate-90 inline-block">▸</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">{title}</span>
          {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
        </span>
        <span className="text-[9.5px] uppercase tracking-wider text-slate-500 group-open:hidden">aufklappen</span>
        <span className="hidden text-[9.5px] uppercase tracking-wider text-slate-500 group-open:inline">zuklappen</span>
      </summary>
      <div className="space-y-2 border-t border-slate-800 p-3">
        {children}
      </div>
    </details>
  );
}
