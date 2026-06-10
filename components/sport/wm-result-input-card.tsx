'use client';

// Optionale Selbst-Pflege-Karte: User kann WM-Final-Scores fuer geloggte
// Picks selbst eintragen, falls die externe Datenquelle den Spieltag
// nicht direkt mitliefert.
//
// Zeigt nur Picks deren Outcome noch 'pending' ist und das Spieldatum
// in der Vergangenheit liegt. Damit bleibt die Liste fokussiert.
//
// Wording strikt neutral.

import { useEffect, useMemo, useState } from 'react';
import {
  loadWmPickLog,
  WM_PICK_LEARNING_CHANGED_EVENT
} from '@/lib/sport/wm-pick-learning-store';
import {
  loadManualWmResults,
  setManualWmResult,
  WM_MANUAL_RESULTS_CHANGED_EVENT
} from '@/lib/sport/wm-results-store';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WmResultInputCard() {
  const [log, setLog] = useState<WmPickLogEntry[]>([]);
  const [manual, setManual] = useState<Record<string, { home: number; away: number }>>({});
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadWmPickLog());
    const syncManual = () => {
      const list = loadManualWmResults();
      const map: Record<string, { home: number; away: number }> = {};
      for (const m of list) map[m.fixtureId] = { home: m.homeScore, away: m.awayScore };
      setManual(map);
    };
    sync();
    syncManual();
    setMounted(true);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, syncManual);
    return () => {
      window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
      window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, syncManual);
    };
  }, []);

  const pendingPastPicks = useMemo(() => {
    if (!mounted) return [];
    const today = todayIso();
    // Zeige Picks, deren Datum heute oder in der Vergangenheit liegt und
    // die noch nicht resolved sind. Dedupliziere pro fixtureId.
    const seen = new Set<string>();
    return log.filter((p) => {
      if (p.outcome !== 'pending') return false;
      if (p.dateIso > today) return false;
      if (seen.has(p.fixtureId)) return false;
      seen.add(p.fixtureId);
      return true;
    });
  }, [log, mounted]);

  if (!mounted) return null;
  if (pendingPastPicks.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-amber-400/30 bg-amber-950/15 p-3" aria-label="WM Ergebnis-Eingabe">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Ergebnisse nachpflegen</h3>
        <span className="text-[10px] text-amber-200/70">{pendingPastPicks.length} offen</span>
      </div>
      <p className="text-[11px] leading-snug text-amber-100/80">
        Wenn die externe Datenquelle den Spielausgang noch nicht hat, kannst Du den Final-Score hier kurz eintragen. Damit lernt das System sofort dazu.
      </p>
      <ul className="space-y-1.5">
        {pendingPastPicks.map((p) => {
          const m = manual[p.fixtureId];
          const draft = drafts[p.fixtureId] ?? { home: m ? String(m.home) : '', away: m ? String(m.away) : '' };
          return (
            <li key={p.id} className="rounded border border-slate-800 bg-slate-950/40 p-2">
              <div className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
                <span className="font-semibold text-slate-100">{p.homeTeam}</span>
                <span className="text-slate-500">vs.</span>
                <span className="font-semibold text-slate-100">{p.awayTeam}</span>
                <span className="ml-auto text-[9.5px] text-slate-500">{p.dateIso}</span>
              </div>
              <div className="mt-1 text-[10px] text-emerald-300">→ {p.winnerTeam} ({p.modelProbabilityPct} %)</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={20}
                  inputMode="numeric"
                  value={draft.home}
                  onChange={(e) => setDrafts((s) => ({ ...s, [p.fixtureId]: { ...draft, home: e.target.value } }))}
                  className="w-12 rounded border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-center text-[12px] text-slate-100"
                  aria-label={`${p.homeTeam} Tore`}
                />
                <span className="text-slate-500">:</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  inputMode="numeric"
                  value={draft.away}
                  onChange={(e) => setDrafts((s) => ({ ...s, [p.fixtureId]: { ...draft, away: e.target.value } }))}
                  className="w-12 rounded border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-center text-[12px] text-slate-100"
                  aria-label={`${p.awayTeam} Tore`}
                />
                <button
                  type="button"
                  className="rounded border border-emerald-500/40 bg-emerald-950/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200 hover:border-emerald-400"
                  onClick={() => {
                    const h = parseInt(draft.home, 10);
                    const a = parseInt(draft.away, 10);
                    if (!Number.isFinite(h) || !Number.isFinite(a) || h < 0 || a < 0) return;
                    setManualWmResult(p.fixtureId, h, a);
                  }}
                >Speichern</button>
                {m && <span className="text-[9.5px] text-slate-400">Gespeichert: {m.home}:{m.away}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
