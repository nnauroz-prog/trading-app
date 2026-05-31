'use client';

import { useEffect, useState } from 'react';
import { INTEL_LOG_CHANGED_EVENT, IntelSnapshot, clearIntelLog, computeIntelAccuracy, loadIntelLog } from '@/lib/intel/memory';

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
}

function signalBadge(signal: IntelSnapshot['netSignal']): string {
  if (signal === 'risk-on') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  if (signal === 'risk-off') return 'border-rose-400/50 bg-rose-500/15 text-rose-200';
  if (signal === 'neutral') return 'border-slate-700 bg-slate-900 text-slate-300';
  return 'border-slate-800 bg-slate-950 text-slate-500';
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</div>
    </div>
  );
}

export function IntelLog() {
  const [log, setLog] = useState<IntelSnapshot[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadIntelLog());
    sync();
    setMounted(true);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    return () => window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const acc = computeIntelAccuracy(log);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chefredakteur-Tagebuch (lokal)</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Bei jedem Besuch wird der Lagebericht festgehalten. Sobald der nächste Tag vorbei ist, vergleichen wir die Tendenz mit dem tatsächlichen BTC-Move — so siehst du, ob die Recherche wirklich vorausschaut oder nur Bauchgefühl ist.
          </p>
        </div>
        {log.length > 0 && (
          <button
            onClick={() => { if (window.confirm('Chefredakteur-Tagebuch wirklich löschen? Das lässt sich nicht rückgängig machen.')) clearIntelLog(); }}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
          >
            Tagebuch löschen
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tage" value={String(log.length)} />
        <Stat label="Auswertbar" value={String(acc.evaluated)} />
        <Stat label="Trefferquote" value={acc.hitRatePct !== null ? `${acc.hitRatePct}%` : '—'} tone={acc.hitRatePct !== null && acc.hitRatePct >= 55 ? 'good' : acc.hitRatePct !== null && acc.hitRatePct < 40 ? 'bad' : 'neutral'} />
        <Stat label="Spezialisten gemessen" value={String(acc.perSpecialist.length)} />
      </div>

      {acc.evaluated < 5 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-[11px] text-slate-500">
          Trefferquote braucht mindestens 5 auswertbare Tagespaare — komm in ein paar Tagen wieder, dann zeigt sich, ob die Recherche wirklich vorausschaut.
        </p>
      ) : (
        <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-200">
          Bisher {acc.rightCalls}/{acc.evaluated} richtig getippt ({acc.hitRatePct}%). {(acc.hitRatePct ?? 0) >= 55
            ? 'Solide Trefferquote — die Recherche hat Aussagekraft.'
            : (acc.hitRatePct ?? 0) >= 45
            ? 'Etwa Münzwurf-Niveau — noch keine klare Edge.'
            : 'Treffer unter 50% — wäre als Kontra-Indikator interessanter.'}
        </p>
      )}

      {acc.perSpecialist.length > 0 && (
        <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
          <summary className="cursor-pointer text-slate-300">Ranking der Spezialisten</summary>
          <ul className="mt-2 space-y-1">
            {acc.perSpecialist.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-2">
                <span className="text-slate-300">{s.title}</span>
                <span className="font-mono text-slate-400">
                  {s.rightCalls}/{s.evaluated} ({s.hitRatePct}%)
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {log.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-center text-[12px] text-slate-500">
          Noch keine Einträge — sobald du diese Seite öffnest, wird hier eine Zeile pro Tag geschrieben.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40">
          <table className="w-full text-[11px]">
            <thead className="border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left">Datum</th>
                <th className="px-2 py-1.5 text-left">Tendenz</th>
                <th className="px-2 py-1.5 text-right">on / off</th>
                <th className="px-2 py-1.5 text-right">BTC-Preis</th>
              </tr>
            </thead>
            <tbody>
              {[...log].reverse().slice(0, 30).map((e) => (
                <tr key={e.date} className="border-b border-slate-900 last:border-b-0">
                  <td className="px-2 py-1.5 font-mono text-slate-500">{fmtDate(e.date)}</td>
                  <td className="px-2 py-1.5">
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${signalBadge(e.netSignal)}`}>
                      {e.netSignal === 'kein_signal' ? 'keine' : e.netSignal}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">
                    <span className="text-emerald-400">{e.riskOnCount}</span>
                    <span className="mx-0.5 text-slate-600">/</span>
                    <span className="text-rose-400">{e.riskOffCount}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                    {e.btcPriceAtRecord !== null ? `$${Math.round(e.btcPriceAtRecord).toLocaleString('en-US')}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
