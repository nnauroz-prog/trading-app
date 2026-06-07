// Eine einzelne Quote-Zeile — sauberes Listen-Item für Aktien und Rohstoffe.
// Klare „Live-Daten verfügbar"-Anzeige, ehrlicher Empty-State.

import { fmtChange, fmtCurrency, type MarketQuote } from '@/lib/market/yahoo-quote';

interface Props {
  quote: MarketQuote | null;
  fallbackName: string;
  fallbackSymbol: string;
  unit?: string;
  emoji?: string;
}

export function QuoteRow({ quote, fallbackName, fallbackSymbol, unit, emoji }: Props) {
  if (!quote) {
    return (
      <li className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-[11.5px]">
        {emoji ? <span className="text-base leading-none">{emoji}</span> : <span className="font-mono text-[10px] text-slate-500">{fallbackSymbol}</span>}
        <span className="min-w-0">
          <span className="block truncate font-semibold text-slate-300">{fallbackName}</span>
          {unit && <span className="block truncate text-[9.5px] text-slate-600">{unit}</span>}
        </span>
        <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wider text-slate-500">
          gerade nicht verfügbar
        </span>
      </li>
    );
  }
  const positive = quote.changePct >= 0;
  return (
    <li className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11.5px]">
      {emoji ? <span className="text-base leading-none">{emoji}</span> : <span className="font-mono text-[10px] text-slate-500">{quote.symbol}</span>}
      <span className="min-w-0">
        <span className="block truncate font-semibold text-slate-100">{quote.name}</span>
        {unit && <span className="block truncate text-[9.5px] text-slate-500">{unit}</span>}
      </span>
      <span className="font-mono text-[12px] font-bold text-slate-100">
        {fmtCurrency(quote.last, quote.currency)}
      </span>
      <span className={`font-mono text-[10.5px] font-semibold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
        {fmtChange(quote.changePct)}
      </span>
    </li>
  );
}
