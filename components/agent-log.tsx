'use client';

import { useEffect, useState } from 'react';
import { AGENT_DECISIONS_CHANGED_EVENT, AgentDecision, clearDecisionLog, loadDecisionLog, summarize } from '@/lib/agent-memory';

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
}

function verdictBadge(v: AgentDecision['verdict']) {
  if (v === 'BUY_NOW') return <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">Kaufen</span>;
  if (v === 'WAIT') return <span className="rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">Warten</span>;
  return <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Kein Setup</span>;
}

function gradeBadge(g: AgentDecision['safetyGrade']) {
  if (!g) return null;
  const cls = g === 'A' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : g === 'B' ? 'border-amber-400/50 bg-amber-500/15 text-amber-200' : 'border-rose-500/50 bg-rose-500/15 text-rose-200';
  return <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls}`}>{g}</span>;
}

export function AgentLog() {
  const [log, setLog] = useState<AgentDecision[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadDecisionLog());
    sync();
    setMounted(true);
    window.addEventListener(AGENT_DECISIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AGENT_DECISIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const stats = summarize(log);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mein Tagebuch (lokal, in diesem Browser)</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Jeder Tag, an dem du die Seite öffnest, wird hier festgehalten — Verdikt, empfohlener Coin, Sicherheits-Note. Wächst über Zeit zu deinem persönlichen Track-Record.
          </p>
        </div>
        {log.length > 0 && (
          <button
            onClick={() => { if (window.confirm('Tagebuch wirklich löschen? Das lässt sich nicht rückgängig machen.')) clearDecisionLog(); }}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
          >
            Tagebuch löschen
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-center">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Tage</div>
          <div className="font-mono text-sm font-bold text-slate-100">{stats.total}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Kauf-Tage</div>
          <div className="font-mono text-sm font-bold text-emerald-300">{stats.buys}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Warte-Tage</div>
          <div className="font-mono text-sm font-bold text-amber-300">{stats.waits}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Coins empfohlen</div>
          <div className="font-mono text-sm font-bold text-slate-100">{stats.uniqueCoinsRecommended}</div>
        </div>
      </div>

      {log.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-[12px] text-slate-500">
          Noch keine Einträge — sobald du die Startseite öffnest, wird hier eine Zeile pro Tag geschrieben.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40">
          {[...log].reverse().slice(0, 50).map((d) => (
            <li key={d.date} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 px-3 py-2 text-[12px]">
              <span className="font-mono text-[10px] text-slate-500">{fmtDate(d.date)}</span>
              {verdictBadge(d.verdict)}
              <span className="text-slate-300">
                {d.coin ? (
                  <>
                    <span className="font-mono font-bold text-white">{d.coin}</span>
                    {d.entry !== null && <span className="ml-2 font-mono text-[10px] text-slate-500">@${d.entry.toFixed(2)}</span>}
                    {d.passedCount !== null && d.totalCount !== null && (
                      <span className="ml-2 font-mono text-[10px] text-slate-500">{d.passedCount}/{d.totalCount}</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </span>
              {gradeBadge(d.safetyGrade)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
