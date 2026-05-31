'use client';

import { useState } from 'react';
import { addAlert } from '@/lib/price-alerts';

interface Props {
  coinId: string;
  symbol: string;
  currentPrice: number;
}

export function CoinAlertForm({ coinId, symbol, currentPrice }: Props) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [target, setTarget] = useState<string>(currentPrice.toFixed(currentPrice >= 1 ? 2 : 4));
  const [note, setNote] = useState('');
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    const t = parseFloat(target);
    if (!Number.isFinite(t) || t <= 0) return;
    addAlert(coinId, symbol, direction, t, note || undefined);
    // Beim ersten Alert nach Erlaubnis für Browser-Benachrichtigungen fragen.
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
    setAdded(true);
    setTimeout(() => { setAdded(false); setOpen(false); }, 1500);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-amber-400/40 hover:text-amber-200"
      >
        🔔 Alert setzen
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-400/30 bg-amber-950/20 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-amber-200">Alert für {symbol}</span>
        <button onClick={() => setOpen(false)} className="text-[10px] text-slate-400 hover:text-slate-200">✕</button>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => setDirection('above')}
          className={`flex-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${direction === 'above' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
        >
          steigt über
        </button>
        <button
          onClick={() => setDirection('below')}
          className={`flex-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${direction === 'below' ? 'border-rose-400/50 bg-rose-500/15 text-rose-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
        >
          fällt unter
        </button>
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[12px] text-slate-100"
        placeholder="Schwellwert"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
        placeholder="Notiz (optional)"
      />
      <button
        onClick={handleAdd}
        disabled={added}
        className={`w-full rounded-md border px-2 py-1.5 text-[11px] font-semibold transition ${added ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-amber-400/40 bg-amber-500/15 text-amber-100 hover:border-amber-300'}`}
      >
        {added ? '✓ Alert angelegt' : 'Alert speichern'}
      </button>
    </div>
  );
}
