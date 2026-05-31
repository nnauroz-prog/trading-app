'use client';

import { useEffect, useState } from 'react';
import { VORSTAND_LOG_CHANGED_EVENT, VorstandSnapshot, clearVorstandLog, loadVorstandLog, summariseVorstand } from '@/lib/agents/vorstand-memory';
import { VorstandVerdict } from '@/lib/agents/vorstand';

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
}

function badge(v: VorstandVerdict): string {
  if (v === 'KLARER_KAUF') return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  if (v === 'KAUFEN_VORSICHTIG') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
  if (v === 'WATCHLIST') return 'border-amber-400/50 bg-amber-500/15 text-amber-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
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

export function VorstandLog() {
  const [log, setLog] = useState<VorstandSnapshot[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadVorstandLog());
    sync();
    setMounted(true);
    window.addEventListener(VORSTAND_LOG_CHANGED_EVENT, sync);
    return () => window.removeEventListener(VORSTAND_LOG_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const stats = summariseVorstand(log);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vorstand-Tagebuch (lokal)</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Jeden Besuch wird die Vorstand-Entscheidung festgehalten. Über Zeit zeigt sich, wie oft Konsens entsteht — und wann der Markt einfach unklar war.
          </p>
        </div>
        {log.length > 0 && (
          <button
            onClick={() => { if (window.confirm('Vorstand-Tagebuch wirklich löschen?')) clearVorstandLog(); }}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
          >
            Löschen
          </button>
        )}
      </div>

      {log.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-center text-[11px] text-slate-500">
          Noch keine Einträge — wird mit jedem Besuch gefüllt.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Tage" value={String(stats.totalDays)} />
            <Stat label="Konsens-Tage" value={`${stats.consensusRate}%`} tone={stats.consensusRate >= 30 ? 'good' : 'neutral'} />
            <Stat label="Klare Käufe" value={String(stats.klarerKauf)} tone={stats.klarerKauf > 0 ? 'good' : 'neutral'} />
            <Stat label="Cash-Tage" value={String(stats.cashHalten)} />
          </div>
          {stats.mostFrequentCoin && (
            <p className="text-[11px] text-slate-300">
              Häufigster Konsens-Coin: <span className="font-mono font-bold text-white">{stats.mostFrequentCoin.coin}</span> ({stats.mostFrequentCoin.days}× empfohlen).
            </p>
          )}
          {stats.daysSinceLastBuy !== null && stats.daysSinceLastBuy > 0 && (
            <p className="text-[11px] text-slate-400">
              Letzte Kauf-Empfehlung war vor {stats.daysSinceLastBuy} {stats.daysSinceLastBuy === 1 ? 'Tag' : 'Tagen'}.
            </p>
          )}
          <ul className="space-y-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            {[...log].reverse().slice(0, 30).map((e) => (
              <li key={e.date} className="grid grid-cols-[auto_auto_1fr] items-baseline gap-2 border-b border-slate-900 py-1 last:border-b-0 text-[11px]">
                <span className="font-mono text-[10px] text-slate-500">{fmtDate(e.date)}</span>
                <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge(e.verdict)}`}>
                  {e.verdict.replace(/_/g, ' ')}
                </span>
                <span className="truncate text-slate-300">
                  {e.consensusCoin ? <span className="font-mono">{e.consensusCoin}</span> : <span className="text-slate-500">—</span>}
                  {e.conflictCount > 0 && <span className="ml-2 text-[10px] text-slate-500">· {e.conflictCount} Konflikte</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
