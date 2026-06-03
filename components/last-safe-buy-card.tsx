'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { findLastSafeBuy } from '@/lib/last-safe-buy';
import { todayIsoBerlin } from '@/lib/agent-memory';

function relativeWord(daysAgo: number): string {
  if (daysAgo === 0) return 'heute';
  if (daysAgo === 1) return 'gestern';
  if (daysAgo < 7) return `vor ${daysAgo} Tagen`;
  if (daysAgo < 14) return `vor 1 Woche`;
  if (daysAgo < 30) return `vor ${Math.round(daysAgo / 7)} Wochen`;
  return `vor ${Math.round(daysAgo / 30)} Monaten`;
}

export function LastSafeBuyCard() {
  const [log, setLog] = useState<FirmaDecision[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadFirmaLog());
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  if (log.length === 0) return null;

  const today = todayIsoBerlin();
  const last = findLastSafeBuy(log, today);

  if (!last) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Letzter sicherer Kauf</h2>
        <p className="mt-1 text-[12px] leading-snug text-slate-300">
          Noch keiner. Bis jetzt hat keine der drei Firmen ein Grade-A-Setup gemeldet — das ist Absicht, der Filter ist streng.
        </p>
        <p className="mt-1 text-[10px] text-slate-500">Sobald irgendwo Grade A fällt, taucht der Eintrag hier auf.</p>
      </section>
    );
  }

  const fresh = last.daysAgo <= 2;
  const accent = fresh ? 'border-emerald-400/50 bg-emerald-950/20' : 'border-slate-800';
  const dateLabel = relativeWord(last.daysAgo);

  return (
    <section className={`rounded-2xl border p-3 ${accent}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Letzter sicherer Kauf</h2>
        <span className="font-mono text-[10px] text-slate-500">{last.date}</span>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-slate-100">
        <span className="font-semibold text-emerald-300">{dateLabel}</span> bei{' '}
        <span className="font-semibold text-white">{last.firmaName}</span>
        {last.coin ? <> — Coin <span className="font-mono">{last.coin}</span></> : null}.
      </p>
      <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
        Grade A = alle harten Kriterien gepasst. Keine Garantie für Gewinn, aber strengster verfügbarer Filter.
      </p>
    </section>
  );
}
