'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  loadPersonaHistory,
  sliceLastDays,
  computeStreak,
  lastBuyDateFor,
  clearPersonaHistory,
  PERSONA_HISTORY_CHANGED_EVENT,
  type HistoryEntry
} from '@/lib/agents/persona-history';
import { personaHistoryToCsv } from '@/lib/agents/persona-history-export';

const PERSONA_LABEL: Record<string, string> = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

const PERSONA_EMOJI: Record<string, string> = {
  conservative: '🛡️',
  balanced: '⚖️',
  aggressive: '⚡'
};

function buyClass(verdict: string): boolean {
  return verdict === 'KAUFEN' || verdict === 'BUY' || verdict === 'TIPPEN';
}

function tone(verdict: string): string {
  if (buyClass(verdict)) return 'bg-emerald-400';
  if (verdict === 'BEOBACHTEN') return 'bg-amber-400';
  return 'bg-slate-600';
}

const WINDOW_OPTIONS = [
  { value: 7, label: '7 Tage' },
  { value: 14, label: '14 Tage' },
  { value: 30, label: '30 Tage' },
  { value: 90, label: '90 Tage' }
] as const;

export function PersonaHistoryCard({ days = 7, todayIso }: { days?: number; todayIso: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [windowDays, setWindowDays] = useState<number>(days);

  useEffect(() => {
    const sync = () => setHistory(loadPersonaHistory());
    sync();
    setMounted(true);
    window.addEventListener(PERSONA_HISTORY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PERSONA_HISTORY_CHANGED_EVENT, sync);
  }, []);

  const slices = useMemo(() => sliceLastDays(history, windowDays, todayIso), [history, windowDays, todayIso]);

  function downloadCsv() {
    if (typeof window === 'undefined') return;
    const csv = personaHistoryToCsv(history);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `persona-history-${todayIso}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    if (typeof window === 'undefined') return;
    const ok = window.confirm('Wirklich die komplette Track-Record-Historie zurücksetzen? Das kann nicht rückgängig gemacht werden.');
    if (!ok) return;
    clearPersonaHistory();
  }

  if (!mounted) return null;
  if (slices.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">📅 Track-Record der Vorstände</h2>
        <p className="text-[10.5px] leading-snug text-slate-500">
          Noch keine Historie im gewählten Fenster. Lade die Seite an mehreren Tagen, dann sammeln sich hier die Verdicts an.
        </p>
        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
            <span>Insgesamt {history.length} Einträge gespeichert.</span>
            <button onClick={downloadCsv} className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200">⬇ CSV-Export</button>
            <button onClick={handleReset} className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-rose-400/50 hover:text-rose-200">Reset</button>
          </div>
        )}
      </section>
    );
  }

  // Gruppieren nach Klasse für ein sauberes Layout.
  const byKlass = new Map<string, typeof slices>();
  for (const s of slices) {
    const existing = byKlass.get(s.klass);
    if (existing) existing.push(s);
    else byKlass.set(s.klass, [s]);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">📅 Track-Record der Vorstände (lokal)</h2>
          <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
            Wenn du die App regelmäßig öffnest, sammelt sich hier die Verdict-Historie pro Persönlichkeit an —
            jeden Tag eine Zelle. Daten liegen nur in deinem Browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400">
          <label className="flex items-center gap-1">
            Fenster:
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10.5px] text-slate-200 focus:border-emerald-400 focus:outline-none"
            >
              {WINDOW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <button onClick={downloadCsv} className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200">⬇ CSV</button>
          <button onClick={handleReset} className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-rose-400/50 hover:text-rose-200">Reset</button>
        </div>
      </div>
      <ul className="space-y-3">
        {[...byKlass.entries()].map(([klass, list]) => (
          <li key={klass}>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{klass}</h3>
            <ul className="space-y-1">
              {list.sort((a, b) => a.personaId.localeCompare(b.personaId)).map((s) => {
                const buyDays = s.entries.filter((e) => buyClass(e.verdict)).length;
                const streak = computeStreak(s.entries);
                const lastBuy = lastBuyDateFor(history, s.klass, s.personaId);
                return (
                  <li key={s.personaId} className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                    <span className="text-base leading-none">{PERSONA_EMOJI[s.personaId] ?? ''}</span>
                    <span className="font-semibold text-slate-100">{PERSONA_LABEL[s.personaId] ?? s.personaId}</span>
                    <div className="flex items-center gap-0.5">
                      {s.entries.map((e) => (
                        <span
                          key={e.dateIso}
                          title={`${e.dateIso}: ${e.verdict}${e.targetLabel ? ` · ${e.targetLabel}` : ''}`}
                          className={`inline-block h-3 w-3 rounded-sm ${tone(e.verdict)}`}
                          aria-label={`${e.dateIso}: ${e.verdict}`}
                        />
                      ))}
                    </div>
                    {streak && streak.length >= 2 && (
                      <span className={`rounded border px-1 py-0 font-mono text-[9.5px] font-bold uppercase tracking-wider ${
                        buyClass(streak.currentVerdict)
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                          : streak.currentVerdict === 'BEOBACHTEN'
                            ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                            : 'border-slate-700 bg-slate-900 text-slate-400'
                      }`}>
                        {streak.length}× {streak.currentVerdict}
                      </span>
                    )}
                    <span className="font-mono text-[9.5px] text-emerald-300" title={lastBuy ? `Zuletzt Buy/Tipp am ${lastBuy}` : 'Bisher kein Buy/Tipp'}>
                      {buyDays}/{s.entries.length}{lastBuy && <span className="ml-1 text-slate-500">· zuletzt {lastBuy.slice(5)}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
