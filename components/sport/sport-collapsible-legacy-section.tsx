// Wrapper fuer alte Sport-Bereiche, die sich dem Precision Desk
// unterordnen. Default geschlossen. Header sagt klar „Rohdaten /
// Modell-Uebersicht" — keine Freigabe-Sprache.

import React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  // Default false. Wenn true, Section ist offen.
  defaultOpen?: boolean;
  // Optional: einen Banner-Text einblenden („Rohdaten-Ansicht — der
  // Precision Desk filtert oben strenger.").
  hint?: string;
}

export function SportCollapsibleLegacySection({ title, subtitle, children, defaultOpen = false, hint }: Props) {
  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/30" {...(defaultOpen ? { open: true } : {})}>
      <summary className="cursor-pointer p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ {title}
        {subtitle && <span className="ml-2 normal-case tracking-normal text-[10px] text-slate-500">· {subtitle}</span>}
      </summary>
      <div className="space-y-3 p-3 pt-0">
        {hint && (
          <p className="rounded border border-slate-800 bg-slate-950/40 p-2 text-[10.5px] leading-snug text-slate-400">
            {hint}
          </p>
        )}
        {children}
      </div>
    </details>
  );
}
