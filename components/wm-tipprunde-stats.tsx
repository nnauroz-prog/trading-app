'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { wmTipStats, type WmStats } from '@/lib/sport/wm-tipprunde-stats';

interface Props {
  todayIso: string;
  openingIso?: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

export function WmTipprundeStats({ todayIso, openingIso = '2026-06-11' }: Props) {
  const [stats, setStats] = useState<WmStats | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setStats(wmTipStats(loadTipJournal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || !stats || stats.total === 0) return null;
  const days = daysBetween(todayIso, openingIso);
  if (days > 30 || days < -60) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-yellow-400/30 bg-yellow-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">🏆 WM-Tipprunde</h2>
        <span className="text-[10px] text-yellow-200/70">{stats.total} {stats.total === 1 ? 'Tipp' : 'Tipps'}</span>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="offen" value={String(stats.pending)} tone="amber" />
        <Stat label="Treffer" value={String(stats.wins)} tone="emerald" />
        <Stat label="daneben" value={String(stats.losses)} tone="rose" />
        <Stat label="Quote" value={stats.hitRatePct !== null ? `${stats.hitRatePct}%` : '—'} tone="yellow" />
      </dl>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'emerald' | 'rose' | 'yellow' }) {
  const cls =
    tone === 'amber' ? 'text-amber-200'
    : tone === 'emerald' ? 'text-emerald-200'
    : tone === 'rose' ? 'text-rose-200'
    : 'text-yellow-200';
  return (
    <div className="rounded-md border border-yellow-400/20 bg-yellow-500/5 p-2 text-center">
      <dt className="text-[9px] uppercase tracking-wider text-yellow-200/60">{label}</dt>
      <dd className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</dd>
    </div>
  );
}
