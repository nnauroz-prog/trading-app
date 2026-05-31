'use client';

import { useState } from 'react';
import { TradeMemo } from '@/lib/agents/trade-memo';

function memoToText(memo: TradeMemo): string {
  const lines: string[] = [];
  lines.push(`TRADE-MEMO — ${memo.firmaName} · ${memo.coin}`);
  lines.push('============================================');
  lines.push(`Einstieg: $${memo.entry}   Stop: $${memo.stop}   Ziel: $${memo.target1}`);
  lines.push(`Sizing:   ${memo.positionSizeAt10k}`);
  lines.push('');
  lines.push('Schritt-für-Schritt:');
  memo.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  lines.push('');
  lines.push('Was kippt das Setup:');
  memo.whatKillsIt.forEach((w) => lines.push(`  - ${w}`));
  lines.push('');
  lines.push('Keine Finanzberatung. Vergangenheit ≠ Zukunft.');
  return lines.join('\n');
}

export function TradeMemoCard({ memo }: { memo: TradeMemo }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memoToText(memo));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  };

  const accentColor =
    memo.firma === 'conservative' ? 'border-sky-400/40 bg-sky-950/15' :
    memo.firma === 'balanced' ? 'border-amber-400/40 bg-amber-950/15' :
    'border-rose-400/40 bg-rose-950/15';

  return (
    <section className={`space-y-2 rounded-2xl border-2 p-4 ${accentColor}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trade-Memo · {memo.firmaName}</span>
        <div className="flex items-baseline gap-2">
          <button
            onClick={handleCopy}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300"
          >
            {copied ? '✓ kopiert' : '📋 kopieren'}
          </button>
          <span className="font-mono text-sm font-bold text-white">{memo.coin}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center text-[11px]">
        <div><div className="text-[9px] uppercase tracking-wider text-slate-500">Einstieg</div><div className="font-mono text-slate-100">${memo.entry.toFixed(memo.entry >= 1 ? 2 : 4)}</div></div>
        <div><div className="text-[9px] uppercase tracking-wider text-rose-400">Stop</div><div className="font-mono text-rose-200">${memo.stop.toFixed(memo.stop >= 1 ? 2 : 4)}</div></div>
        <div><div className="text-[9px] uppercase tracking-wider text-emerald-400">Ziel 1</div><div className="font-mono text-emerald-200">${memo.target1.toFixed(memo.target1 >= 1 ? 2 : 4)}</div></div>
      </div>
      <div className="space-y-1">
        <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Schritt für Schritt</div>
        <ol className="space-y-1 text-[12px] text-slate-200">
          {memo.steps.map((s, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-2">
              <span className="font-mono text-slate-500">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px] text-slate-300">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Sizing:</span> {memo.positionSizeAt10k}
      </div>
      <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
        <summary className="cursor-pointer text-slate-300">Was kippt das Setup?</summary>
        <ul className="mt-1.5 space-y-1 text-slate-400">
          {memo.whatKillsIt.map((w, i) => <li key={i}>· {w}</li>)}
        </ul>
      </details>
    </section>
  );
}
