'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { PersonaId } from '@/lib/agents/personas';

const FIRMA_ORDER: PersonaId[] = ['conservative', 'balanced', 'aggressive'];
const WINDOW_DAYS = 14;

function gradeColor(grade: FirmaDecision['safetyGrade'] | undefined): string {
  if (grade === 'A') return 'bg-emerald-500/80 text-emerald-50';
  if (grade === 'B') return 'bg-sky-500/70 text-sky-50';
  if (grade === 'C') return 'bg-amber-500/70 text-amber-50';
  if (grade === 'D') return 'bg-rose-500/60 text-rose-50';
  return 'bg-slate-800 text-slate-500';
}

function gradeLabel(grade: FirmaDecision['safetyGrade'] | undefined): string {
  if (!grade) return '–';
  return grade;
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function SafetyHistoryStrip() {
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
  if (log.length === 0) return null;

  const dates = lastNDates(WINDOW_DAYS);
  const byKey = new Map<string, FirmaDecision>();
  for (const e of log) byKey.set(`${e.date}|${e.firma}`, e);

  const rows = FIRMA_ORDER.map((firma) => {
    const cells = dates.map((d) => ({ date: d, decision: byKey.get(`${d}|${firma}`) }));
    const firmaName = cells.find((c) => c.decision)?.decision?.firmaName ?? firma;
    const aDays = cells.filter((c) => c.decision?.safetyGrade === 'A').length;
    const recordedDays = cells.filter((c) => c.decision).length;
    return { firma, firmaName, cells, aDays, recordedDays };
  }).filter((r) => r.recordedDays > 0);

  if (rows.length === 0) return null;

  const totalA = rows.reduce((s, r) => s + r.aDays, 0);

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sicherheits-Verlauf (14 Tage)</h2>
        <span className="text-[10px] text-slate-500">{totalA === 0 ? 'keine Grade-A-Tage' : `${totalA}× Grade A`}</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Jede Zelle = ein Tag. Grade A nur, wenn alle harten Kriterien gepasst haben. So siehst du schwarz auf weiß, wie selten ein wirklich sicheres Setup auftaucht — das ist Absicht.
      </p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.firma} className="flex items-center gap-2">
            <div className="w-24 shrink-0 truncate text-[10.5px] text-slate-400" title={r.firmaName}>{r.firmaName}</div>
            <div className="flex flex-1 gap-0.5">
              {r.cells.map((c) => (
                <div
                  key={c.date}
                  title={`${c.date}: ${c.decision?.safetyGrade ? `Grade ${c.decision.safetyGrade}` : 'keine Aufzeichnung'}`}
                  className={`h-5 flex-1 rounded-sm text-center text-[9px] font-bold leading-5 ${gradeColor(c.decision?.safetyGrade)}`}
                >
                  {gradeLabel(c.decision?.safetyGrade)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[9.5px] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/80" />A: sicher</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sky-500/70" />B: fast</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-500/70" />C: lückenhaft</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500/60" />D: unsicher</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-800" />keine Daten</span>
      </div>
    </section>
  );
}
