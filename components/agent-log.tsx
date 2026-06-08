'use client';

import { useEffect, useState } from 'react';
import { AGENT_DECISIONS_CHANGED_EVENT, AgentDecision, clearDecisionLog, loadDecisionLog, summarize } from '@/lib/agent-memory';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeFirmaAccuracy, MIN_EVAL_FOR_SKILL, type FirmaAccuracy } from '@/lib/firma-accuracy';

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
  const [firmaAccuracy, setFirmaAccuracy] = useState<FirmaAccuracy[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const syncLog = () => setLog(loadDecisionLog());
    const syncAcc = () => {
      const firmaLog = loadFirmaLog();
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      setFirmaAccuracy(computeFirmaAccuracy(firmaLog, (d) => priceMap.get(d) ?? null));
    };
    syncLog();
    syncAcc();
    setMounted(true);
    window.addEventListener(AGENT_DECISIONS_CHANGED_EVENT, syncLog);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, syncAcc);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, syncAcc);
    return () => {
      window.removeEventListener(AGENT_DECISIONS_CHANGED_EVENT, syncLog);
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, syncAcc);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, syncAcc);
    };
  }, []);

  if (!mounted) return null;
  const stats = summarize(log);
  const trained = firmaAccuracy.filter((a) => a.evaluated >= MIN_EVAL_FOR_SKILL);

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

      {/* Track-Record-Block: was hat der Agent aus dem Tagebuch gelernt? Wird
          aus dem getrennten Firma-Decisions-Log + BTC-Preis-Snapshots gespeist
          und zeigt pro Firma die historische Trefferquote. */}
      {trained.length > 0 && (
        <div className="space-y-2 rounded-lg border border-sky-400/30 bg-sky-950/15 p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">Was die Agenten gelernt haben</div>
          <ul className="grid grid-cols-3 gap-1.5">
            {firmaAccuracy.map((a) => {
              const enough = a.evaluated >= MIN_EVAL_FOR_SKILL;
              const pct = a.hitRatePct ?? 0;
              const tone = !enough ? 'text-slate-500 border-slate-800 bg-slate-950/40'
                : pct >= 60 ? 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10'
                : pct >= 45 ? 'text-slate-200 border-slate-700 bg-slate-900/40'
                : 'text-rose-200 border-rose-400/40 bg-rose-500/10';
              return (
                <li key={a.firma} className={`rounded border px-2 py-1.5 ${tone}`}>
                  <div className="text-[9.5px] uppercase tracking-wider opacity-80">{a.firmaName}</div>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="font-mono text-sm font-bold">
                      {enough && a.hitRatePct !== null ? `${a.hitRatePct} %` : '—'}
                    </span>
                    <span className="text-[9px] opacity-70">{a.rightCalls}/{a.evaluated}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] leading-snug text-sky-100/70">
            Aus deinem Firma-Tagebuch berechnet. Je mehr Tage du die App nutzt, desto belastbarer das Signal — bisher {firmaAccuracy.reduce((s, a) => s + a.evaluated, 0)} bewertete Entscheidungen.
          </p>
        </div>
      )}

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
                      <span className="ml-2 font-mono text-[10px] text-slate-500" title="Erfüllte von 12 Kriterien">{d.passedCount} Häkchen</span>
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
