'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, FirmaStats, clearFirmaLog, loadFirmaLog, statsPerFirma } from '@/lib/firma-memory';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
}

function StatCell({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls =
    tone === 'good' ? 'text-emerald-300' :
    tone === 'bad' ? 'text-rose-300' :
    'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function StandingsCard({ s, log }: { s: FirmaStats; log: FirmaDecision[] }) {
  const tone = s.firma === 'conservative' ? 'border-sky-500/40' : s.firma === 'balanced' ? 'border-amber-500/40' : 'border-rose-500/40';
  const buyShare = s.totalDays > 0 ? Math.round((s.buyDays / s.totalDays) * 100) : 0;
  // Last 5 entries for this firma to show recent activity.
  const recent = log.filter((d) => d.firma === s.firma).slice(-5).reverse();
  return (
    <div className={`space-y-2 rounded-2xl border-2 bg-slate-900/40 p-3 ${tone}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">{s.firmaName}</h3>
        <span className="text-[10px] text-slate-500">{s.totalDays} {s.totalDays === 1 ? 'Tag' : 'Tage'}</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        <StatCell label="Kaufen" value={s.buyDays} tone="good" />
        <StatCell label="Warten" value={s.waitDays} />
        <StatCell label="Coins" value={s.uniqueCoins} />
        <StatCell label="Kauf-%" value={`${buyShare}%`} />
      </div>
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
          <div className="uppercase tracking-wider text-slate-500">Letzter Kauf</div>
          <div className="mt-0.5 font-mono text-slate-200">
            {s.lastBuyDate ? `${fmtDate(s.lastBuyDate)} · ${s.lastCoin ?? '—'}` : 'noch keiner'}
          </div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
          <div className="uppercase tracking-wider text-slate-500">Konsens mit anderen</div>
          <div className="mt-0.5 font-mono text-slate-200">{s.agreementWithOthers}%</div>
        </div>
      </div>
      {recent.length > 0 && (
        <div>
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Letzte Entscheidungen</div>
          <ul className="space-y-0.5">
            {recent.map((d) => (
              <li key={`${d.date}-${d.firma}`} className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10px]">
                <span className="font-mono text-slate-500">{fmtDate(d.date)}</span>
                <span className={`font-bold uppercase ${d.verdict === 'BUY' ? 'text-emerald-300' : 'text-slate-500'}`}>
                  {d.verdict === 'BUY' ? 'KAUFEN' : 'WARTEN'}
                </span>
                <span className="font-mono text-slate-300">{d.coin ?? '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FirmaStandings() {
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
  const stats = statsPerFirma(log);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Firmen-Bilanz (lokal, in diesem Browser)</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Jedes Mal, wenn du diese Seite öffnest, wird die heutige Entscheidung jeder Firma festgehalten. So siehst du über Wochen, wie oft jede Firma kaufen wollte, wie einig sie sich sind und welche Coins sie bevorzugen. <span className="text-amber-400/80">Das ist KEIN realisiertes P/L</span> — wir tracken Entscheidungen, nicht echte Trades.
          </p>
        </div>
        {log.length > 0 && (
          <button
            onClick={() => { if (window.confirm('Firmen-Bilanz wirklich löschen? Das lässt sich nicht rückgängig machen.')) clearFirmaLog(); }}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
          >
            Bilanz löschen
          </button>
        )}
      </div>

      {stats.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-[12px] text-slate-500">
          Noch keine Firmen-Entscheidungen — sobald du diese Seite öffnest, wird hier pro Firma eine Zeile pro Tag geschrieben.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {stats.map((s) => <StandingsCard key={s.firma} s={s} log={log} />)}
        </div>
      )}
    </section>
  );
}
