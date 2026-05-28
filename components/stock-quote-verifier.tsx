'use client';

import { useEffect, useState } from 'react';

interface QuoteResult {
  ok: boolean;
  verified: boolean;
  reason?: string;
  symbol?: string;
  quote?: { symbol: string; price: number; change24hPct: number; high52: number | null; low52: number | null } | null;
}

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v.toFixed(2);
}

export function StockQuoteVerifier({ underlying, mentionedPrice }: { underlying: string; mentionedPrice: number | null }) {
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/stock-quote?underlying=${encodeURIComponent(underlying)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: QuoteResult) => {
        if (!cancelled) setResult(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [underlying]);

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-500">Live-Kurs wird geprüft…</div>;
  }
  if (!result) return null;

  if (!result.verified) {
    const msg = result.reason === 'no_api_key'
      ? 'Live-Kurs nicht verifiziert — FINNHUB_API_KEY nicht gesetzt. Die App nutzt nur den im Text genannten Kurs.'
      : result.reason === 'no_symbol_mapping'
      ? `Kein bekanntes Börsensymbol für „${underlying}" — Live-Kurs nicht verifizierbar.`
      : `Live-Kurs für ${result.symbol ?? underlying} aktuell nicht abrufbar (Finnhub Free-Tier deckt manche Börsen nicht ab).`;
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-950/15 px-3 py-2 text-[11px] text-amber-200/80">
        <span className="font-semibold text-amber-300">Nicht verifiziert:</span> {msg}
      </div>
    );
  }

  const q = result.quote!;
  const diff = mentionedPrice !== null && mentionedPrice > 0 ? ((q.price - mentionedPrice) / mentionedPrice) * 100 : null;
  const range52 = q.high52 !== null && q.low52 !== null && q.high52 > q.low52 ? ((q.price - q.low52) / (q.high52 - q.low52)) * 100 : null;

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 px-3 py-2 text-[11px]">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold text-emerald-300">Live-Kurs verifiziert ({q.symbol}):</span>
        <span className="font-mono text-white">${fmt(q.price)}</span>
        <span className={`font-mono ${q.change24hPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {q.change24hPct >= 0 ? '+' : ''}{q.change24hPct.toFixed(2)}% 24h
        </span>
        {diff !== null && (
          <span className="font-mono text-slate-400">
            Text sagte ${fmt(mentionedPrice!)} → {Math.abs(diff) < 1 ? 'stimmt überein' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}% Abweichung`}
          </span>
        )}
      </div>
      {q.high52 !== null && q.low52 !== null && (
        <div className="mt-1 font-mono text-[10px] text-slate-500">
          52W-Spanne ${fmt(q.low52)} – ${fmt(q.high52)}{range52 !== null ? ` · Kurs bei ${range52.toFixed(0)}% der Range` : ''}
        </div>
      )}
    </div>
  );
}
