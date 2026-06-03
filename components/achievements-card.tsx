'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { achievementSummary, computeAchievements, type Achievement } from '@/lib/sport/achievements';

// Schmale Meilenstein-Karte: zeigt erreichte und offene Achievements als
// kleine Chips. Blendet sich aus, wenn der User noch keinen einzigen Tipp
// hat — dann gibt's auch nichts zu feiern.
export function AchievementsCard() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setAchievements(computeAchievements(loadTipJournal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const summary = achievementSummary(achievements);
  if (summary.earned === 0) return null;

  const earned = achievements.filter((a) => a.earned);
  const open = achievements.filter((a) => !a.earned);

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <summary className="cursor-pointer">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          🏅 Meilensteine
        </span>
        <span className="ml-2 font-mono text-[10px] text-slate-400">
          {summary.earned}/{summary.total} · {summary.percent}%
        </span>
      </summary>
      <div className="mt-2 space-y-3">
        <ul className="flex flex-wrap gap-1.5">
          {earned.map((a) => (
            <li
              key={a.id}
              title={a.description}
              className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-100"
            >
              ✓ {a.label}
            </li>
          ))}
        </ul>
        {open.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">noch offen</div>
            <ul className="space-y-1">
              {open.map((a) => (
                <li key={a.id} className="grid grid-cols-[1fr_auto] gap-2 text-[10.5px]">
                  <span className="text-slate-400">
                    <span className="text-slate-200">{a.label}</span>
                    <span className="ml-1 text-slate-500">· {a.description}</span>
                  </span>
                  {a.progressLabel && <span className="font-mono text-slate-400">{a.progressLabel}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
