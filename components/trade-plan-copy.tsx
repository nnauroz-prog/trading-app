'use client';

import { useState } from 'react';

interface Props {
  symbol: string;
  name: string;
  grade: string;
  score: number;
  price: number;
  stop: number;
  tp1: number;
  tp2: number;
  currency: string;
}

function fmt(value: number, currency: string): string {
  const safe = currency && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'USD';
  const decimals = Math.abs(value) >= 100 ? 2 : Math.abs(value) >= 1 ? 2 : 4;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: safe,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch {
    return `${value.toFixed(decimals)} ${safe}`;
  }
}

export function TradePlanCopy({ symbol, name, grade, score, price, stop, tp1, tp2, currency }: Props) {
  const [copied, setCopied] = useState(false);

  const stopDistPct = ((price - stop) / price) * 100;
  const tp1DistPct = ((tp1 - price) / price) * 100;
  const tp2DistPct = ((tp2 - price) / price) * 100;
  const rr1 = tp1DistPct / stopDistPct;
  const rr2 = tp2DistPct / stopDistPct;

  const text = [
    `Trade-Plan · ${name} (${symbol})`,
    ``,
    `Sicherheits-Grade: ${grade} (${score}/100)`,
    `Einstieg: ${fmt(price, currency)}`,
    `Stop-Loss: ${fmt(stop, currency)}  (−${stopDistPct.toFixed(2)} %)`,
    `Ziel 1: ${fmt(tp1, currency)}  (+${tp1DistPct.toFixed(2)} % · R/R 1:${rr1.toFixed(1)})`,
    `Ziel 2: ${fmt(tp2, currency)}  (+${tp2DistPct.toFixed(2)} % · R/R 1:${rr2.toFixed(1)})`,
    ``,
    `Plan: bei Ziel 1 die Hälfte verkaufen und Stop auf Einstieg nachziehen.`,
    `Risiko: nie mehr als 1–2 % vom Konto pro Trade. Keine Garantie — Modell-Hinweis.`
  ].join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Trade-Plan zum Kopieren</h2>
        <button
          onClick={copy}
          className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
            copied
              ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200'
          }`}
        >
          {copied ? '✓ kopiert' : '📋 kopieren'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[10.5px] leading-snug text-slate-200">
{text}
      </pre>
    </section>
  );
}
