'use client';

import { useState } from 'react';
import type { OptionsscheinSuggestion } from '@/lib/optionsscheine/suggest';

interface Props {
  underlyingName: string;
  underlyingPrice: number;
  suggestions: OptionsscheinSuggestion[];
  assetClass: 'aktie' | 'krypto';
}

function formatPlan(underlyingName: string, underlyingPrice: number, suggestions: OptionsscheinSuggestion[], assetClass: 'aktie' | 'krypto'): string {
  const currency = assetClass === 'krypto' ? 'USD' : 'EUR';
  const ratio = assetClass === 'krypto' ? 100 : 10;
  const sigma = suggestions[0]?.analysis.sigmaUsed;
  const sigmaLine = sigma ? `\nModell-Vola: ${Math.round(sigma * 100)} % p.a. (aus den letzten Handelstagen)` : '';

  const blocks = suggestions.map((s) => {
    const lev = s.analysis.estimatedLeverage ? `~${s.analysis.estimatedLeverage.toFixed(1)}x` : 'unbekannt';
    const delta = s.analysis.estimatedDelta?.toFixed(2) ?? '—';
    const be = s.analysis.approxBreakeven !== null ? s.analysis.approxBreakeven.toFixed(2) : '—';
    const beMove = s.analysis.breakevenMovePct?.toFixed(1) ?? '—';
    const risk = s.risk.toUpperCase();
    return [
      `[${risk}] Strike ${s.strike} ${currency} · Verfall ${s.expiryIso} (${s.monthsToExpiry} Monate)`,
      `   Moneyness ${s.moneynessLabel} · Delta ${delta} · Hebel ${lev}`,
      `   Break-even ${be} ${currency} (${beMove} % am Basiswert)`,
      `   Risiko-Klasse: ${s.analysis.riskClass}`
    ].join('\n');
  }).join('\n\n');

  return [
    `Optionsschein-Setups · ${underlyingName} ${s_dir(suggestions)}`,
    `Basiswert: ${underlyingPrice.toFixed(2)} ${currency} · Bezugsverhaeltnis ${ratio}:1${sigmaLine}`,
    '',
    blocks,
    '',
    'Modell-Schaetzungen. Echter Schein-Hebel beim Emittenten kann abweichen.',
    'Optionsscheine koennen ihren gesamten Wert verlieren. Max. 1-3 % Kapital pro Position.'
  ].join('\n');
}

function s_dir(suggestions: OptionsscheinSuggestion[]): string {
  if (suggestions.length === 0) return '';
  return suggestions[0].direction === 'call' ? '(Call · long)' : '(Put · short)';
}

export function OptionsscheineTradePlanCopy({ underlyingName, underlyingPrice, suggestions, assetClass }: Props) {
  const [copied, setCopied] = useState(false);
  if (suggestions.length === 0) return null;

  const text = formatPlan(underlyingName, underlyingPrice, suggestions, assetClass);

  function handleCopy() {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {/* clipboard verweigert */});
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
      >
        {copied ? '✓ kopiert' : '📋 Plan kopieren'}
      </button>
      <span className="text-[9.5px] text-slate-500">Klartext fuer WhatsApp/Notes/Broker-Suche</span>
    </div>
  );
}
