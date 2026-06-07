'use client';

import { useEffect, useState } from 'react';
import {
  loadPersonaHistory,
  sliceLastDays,
  PERSONA_HISTORY_CHANGED_EVENT,
  type HistoryEntry
} from '@/lib/agents/persona-history';

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

export function PersonaHistoryCard({ days = 7, todayIso }: { days?: number; todayIso: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setHistory(loadPersonaHistory());
    sync();
    setMounted(true);
    window.addEventListener(PERSONA_HISTORY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PERSONA_HISTORY_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;

  const slices = sliceLastDays(history, days, todayIso);
  if (slices.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">📅 Track-Record der Vorstände</h2>
        <p className="text-[10.5px] leading-snug text-slate-500">
          Noch keine Historie. Lade die Seite an mehreren Tagen, dann sammeln sich hier die Verdicts an.
        </p>
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
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">📅 Track-Record der Vorstände (lokal)</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Letzte {days} Tage. Wenn du die App regelmäßig öffnest, sammelt sich hier die Verdict-Historie pro Persönlichkeit an —
          jeden Tag eine Zelle. Daten liegen nur in deinem Browser.
        </p>
      </div>
      <ul className="space-y-3">
        {[...byKlass.entries()].map(([klass, list]) => (
          <li key={klass}>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{klass}</h3>
            <ul className="space-y-1">
              {list.sort((a, b) => a.personaId.localeCompare(b.personaId)).map((s) => {
                const buyDays = s.entries.filter((e) => buyClass(e.verdict)).length;
                return (
                  <li key={s.personaId} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
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
                    <span className="font-mono text-[9.5px] text-emerald-300">{buyDays}/{s.entries.length}</span>
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
