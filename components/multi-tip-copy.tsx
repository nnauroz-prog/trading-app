'use client';

import { useState } from 'react';

interface Props {
  text: string;
}

// Kleiner Copy-to-clipboard-Button für den Spielschein-Text. Zeigt
// Bestätigung an, fällt nach 2s zurück.
export function MultiTipCopy({ text }: Props) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard might not be available — silently ignore.
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition ${copied ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200'}`}
    >
      {copied ? '✓ kopiert' : '📋 Spielschein kopieren'}
    </button>
  );
}
