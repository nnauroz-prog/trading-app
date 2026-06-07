// Persona-Kompass: wie verteilen sich die 15 Vorstands-Verdicts heute?

import Link from 'next/link';
import type { PersonaCompassResult } from '@/lib/daily/daily-decision-engine';

export function DailyPersonaCompass({ compass }: { compass: PersonaCompassResult }) {
  if (compass.totalPersonas === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">🧭 Persona-Kompass</h2>
        <p className="text-[11px] leading-snug text-slate-500">Keine Vorstands-Daten heute.</p>
      </section>
    );
  }
  const buyPct = Math.round((compass.buyCount / compass.totalPersonas) * 100);
  const watchPct = Math.round((compass.watchCount / compass.totalPersonas) * 100);
  const waitPct = 100 - buyPct - watchPct;
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">🧭 Persona-Kompass</h2>
        <Link href="/agenten" className="text-[10px] text-sky-300 hover:text-sky-200">alle Vorstände →</Link>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        {compass.totalPersonas} Persönlichkeiten quer durch alle Vorstände.
        {compass.strongestKlassesAll.length > 0 && compass.strongestBuyShare > 0 && (
          <> Stärkster Konsens:{' '}
            <span className="font-semibold text-emerald-300">
              {compass.strongestKlassesAll.join(' + ')}
            </span>
            {' '}({Math.round(compass.strongestBuyShare * 100)} % kaufen/tippen).
            {compass.strongestKlassesAll.length > 1 && ' (Gleichstand)'}
          </>
        )}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <Stat label="Kaufen / Tippen" value={`${compass.buyCount}`} sub={`${buyPct} %`} tone="good" />
        <Stat label="Beobachten" value={`${compass.watchCount}`} sub={`${watchPct} %`} tone="warn" />
        <Stat label="Warten" value={`${compass.waitCount}`} sub={`${waitPct} %`} tone="bad" />
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden>
        {buyPct > 0 && <div style={{ width: `${buyPct}%` }} className="bg-emerald-400/80" />}
        {watchPct > 0 && <div style={{ width: `${watchPct}%` }} className="bg-amber-400/70" />}
        {waitPct > 0 && <div style={{ width: `${waitPct}%` }} className="bg-slate-600" />}
      </div>
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'good' | 'warn' | 'bad' }) {
  const cls = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-300';
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-bold">{value}</div>
      <div className="text-[9px] opacity-80">{sub}</div>
    </div>
  );
}
