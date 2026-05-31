'use client';

import { useState } from 'react';

interface Props {
  symbol: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
}

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

export function CopyTradeLevels({ symbol, entry, stopLoss, takeProfit }: Props) {
  const [copied, setCopied] = useState(false);
  const text = `${symbol} — Einstieg $${fmt(entry)} · Stop $${fmt(stopLoss)} · Ziel $${fmt(takeProfit)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context); fail silently.
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
      title={text}
    >
      {copied ? '✓ Levels kopiert' : '📋 Levels für Broker kopieren'}
    </button>
  );
}
