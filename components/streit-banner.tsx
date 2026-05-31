'use client';

import { useEffect, useState } from 'react';
import { VORSTAND_LOG_CHANGED_EVENT, VorstandSnapshot, loadVorstandLog } from '@/lib/agents/vorstand-memory';
import { detectStreitPhase, StreitPhase } from '@/lib/agents/streit-detector';

function tone(phase: StreitPhase): string {
  if (phase === 'streit') return 'border-amber-400/50 bg-amber-950/20 text-amber-100';
  if (phase === 'lange_pause') return 'border-slate-700 bg-slate-900/60 text-slate-200';
  if (phase === 'konsens') return 'border-emerald-400/50 bg-emerald-950/20 text-emerald-100';
  return 'border-slate-800 bg-slate-950 text-slate-400';
}

function label(phase: StreitPhase): string {
  if (phase === 'streit') return 'Streit-Phase';
  if (phase === 'lange_pause') return 'Lange Pause';
  if (phase === 'konsens') return 'Konsens-Phase';
  return 'Unklar';
}

export function StreitBanner() {
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
  const r = detectStreitPhase(log);
  if (r.phase === 'unklar') return null;

  return (
    <section className={`space-y-1 rounded-2xl border-2 p-3 ${tone(r.phase)}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider">{label(r.phase)}</span>
        <span className="text-[9px] uppercase tracking-wider opacity-70">{r.consecutiveDays} Tage in Folge</span>
      </div>
      <p className="text-[12px] leading-relaxed">{r.message}</p>
    </section>
  );
}
