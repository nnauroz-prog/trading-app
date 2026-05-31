'use client';

import { useEffect, useState } from 'react';
import {
  AKADEMIE_LOG_CHANGED_EVENT,
  AkademieSnapshot,
  clearAkademieLog,
  lehrlingStability,
  loadAkademieLog,
  spaeherTrend
} from '@/lib/akademie/memory';

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
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

export function AkademieLog() {
  const [log, setLog] = useState<AkademieSnapshot[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadAkademieLog());
    sync();
    setMounted(true);
    window.addEventListener(AKADEMIE_LOG_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AKADEMIE_LOG_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;

  const lehrStab = lehrlingStability(log);
  const spTrend = spaeherTrend(log);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Akademie-Tagebuch (lokal)</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Bei jedem Besuch wird die Bestvariante des Lehrlings und die Späher-Stimmung festgehalten. Über Tage siehst du, ob die beste Konfiguration stabil bleibt oder schwankt — und wie sich die Nachrichtenlage entwickelt.
          </p>
        </div>
        {log.length > 0 && (
          <button
            onClick={() => { if (window.confirm('Akademie-Tagebuch wirklich löschen? Das lässt sich nicht rückgängig machen.')) clearAkademieLog(); }}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
          >
            Tagebuch löschen
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tage" value={String(log.length)} />
        <Stat
          label="Stabil seit"
          value={lehrStab.daysStable > 0 ? `${lehrStab.daysStable} ${lehrStab.daysStable === 1 ? 'Tag' : 'Tagen'}` : '—'}
          tone={lehrStab.daysStable >= 3 ? 'good' : lehrStab.daysStable === 0 ? 'bad' : 'neutral'}
        />
        <Stat label="Wechsel" value={String(lehrStab.totalSwitches)} tone={lehrStab.totalSwitches === 0 ? 'good' : lehrStab.totalSwitches > 5 ? 'bad' : 'neutral'} />
        <Stat label="Bester Lauf" value={`${lehrStab.bestEverNetReturnPct >= 0 ? '+' : ''}${lehrStab.bestEverNetReturnPct}%`} tone={lehrStab.bestEverNetReturnPct > 0 ? 'good' : 'neutral'} />
      </div>

      {log.length >= 2 && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-300">
          <span className="font-semibold text-slate-200">Lehrling-Lernkurve:</span>{' '}
          {lehrStab.daysStable >= 3
            ? `Die beste Variante (${lehrStab.currentBestId}) ist seit ${lehrStab.daysStable} Tagen unverändert — das spricht für einen echten Edge, nicht für Glück.`
            : lehrStab.totalSwitches > log.length / 2
            ? `Die Bestvariante wechselt häufig (${lehrStab.totalSwitches} Wechsel in ${log.length} Tagen) — vorsichtig sein, die Daten reichen für eine klare Aussage noch nicht.`
            : `Die Bestvariante ist ${lehrStab.currentBestId}. Stabilität wächst — gib dem Lehrling noch ein paar Tage.`}
        </div>
      )}

      {spTrend.totalDays >= 2 && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-300">
          <span className="font-semibold text-slate-200">Späher-Trend:</span>{' '}
          Durchschnittlich {spTrend.avgBullish} bullische vs {spTrend.avgBearish} bärische Headlines pro Tag — Bias: {spTrend.bias}.
          {spTrend.recentShift && spTrend.recentShift !== 'stabil' && (
            <> Zuletzt: <span className={spTrend.recentShift === 'stärker bullisch' ? 'text-emerald-300' : 'text-rose-300'}>{spTrend.recentShift}</span>.</>
          )}
        </div>
      )}

      {log.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-[12px] text-slate-500">
          Noch keine Einträge — sobald du diese Seite öffnest, wird hier eine Zeile pro Tag geschrieben.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40">
          <table className="w-full text-[11px]">
            <thead className="border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left">Datum</th>
                <th className="px-2 py-1.5 text-left">Beste Variante</th>
                <th className="px-2 py-1.5 text-right">Netto</th>
                <th className="px-2 py-1.5 text-right">Treffer</th>
                <th className="px-2 py-1.5 text-right">News +/−</th>
              </tr>
            </thead>
            <tbody>
              {[...log].reverse().slice(0, 30).map((e) => (
                <tr key={e.date} className="border-b border-slate-900 last:border-b-0">
                  <td className="px-2 py-1.5 font-mono text-slate-500">{fmtDate(e.date)}</td>
                  <td className="px-2 py-1.5 font-mono text-slate-200">{e.bestVariantId}</td>
                  <td className={`px-2 py-1.5 text-right font-mono ${e.bestNetReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {e.bestNetReturnPct >= 0 ? '+' : ''}{e.bestNetReturnPct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">{e.bestWinRatePct.toFixed(0)}%</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">
                    <span className="text-emerald-400">{e.newsBullish}</span>
                    <span className="mx-0.5 text-slate-600">/</span>
                    <span className="text-rose-400">{e.newsBearish}</span>
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
