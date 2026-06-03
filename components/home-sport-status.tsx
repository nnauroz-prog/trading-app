'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { WOCHENZIEL_CHANGED_EVENT, computeWochenzielProgress, type WochenzielProgress } from '@/lib/sport/wochenziel';
import { TIPPRUNDE_CHANGED_EVENT, loadProfile, type TipprundeProfile } from '@/lib/sport/tipprunde';

interface State {
  profile: TipprundeProfile | null;
  pending: number;
  progress: WochenzielProgress | null;
}

// Schmaler Status-Block für die Startseite: zeigt Tipprunde-Name (falls
// gesetzt), offene Tipps und Wochenziel-Fortschritt — alles, was den User
// jeden Morgen interessiert, in einer Karte.
export function HomeSportStatus() {
  const [state, setState] = useState<State>({ profile: null, pending: 0, progress: null });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setState({
        profile: loadProfile(),
        pending: loadTipJournal().filter((e) => e.outcome === 'pending').length,
        progress: computeWochenzielProgress()
      });
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    window.addEventListener(WOCHENZIEL_CHANGED_EVENT, sync);
    window.addEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
      window.removeEventListener(WOCHENZIEL_CHANGED_EVENT, sync);
      window.removeEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;
  if (!state.profile && state.pending === 0 && !state.progress) return null;

  return (
    <Link
      href="/sport"
      className="block space-y-1.5 rounded-2xl border border-emerald-400/30 bg-emerald-950/10 p-3 transition hover:border-emerald-400/50"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
          ⚽ deine Tipprunde
        </span>
        {state.profile && (
          <span className="text-[10px] text-emerald-200">{state.profile.displayName}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 p-1.5">
          <div className="text-[9px] uppercase tracking-wider text-emerald-200/70">offene Tipps</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-emerald-100">{state.pending}</div>
        </div>
        {state.progress ? (
          <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 p-1.5">
            <div className="text-[9px] uppercase tracking-wider text-emerald-200/70">Wochen-Ziel</div>
            <div className="mt-0.5 font-mono text-sm font-bold text-emerald-100">
              {state.progress.currentWins}/{state.progress.targetWins}
              <span className="ml-1 text-[10px] font-normal text-emerald-200/60">{state.progress.percent}%</span>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-slate-700 bg-slate-900/60 p-1.5">
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Wochen-Ziel</div>
            <div className="mt-0.5 text-[10px] text-slate-500">noch nicht gesetzt</div>
          </div>
        )}
      </div>
      <div className="text-[10px] text-emerald-300/80">zum Sport-Reiter →</div>
    </Link>
  );
}
