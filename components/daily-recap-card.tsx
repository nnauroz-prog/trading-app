'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';

interface Props {
  todayIso: string;
}

// Tages-Rückblick: was wurde heute getippt, was wurde aufgelöst, was steht
// noch aus. Reines Read-Modell aus localStorage — server-seitig würde es
// keinen Sinn ergeben (Tipps sind privat).
export function DailyRecapCard({ todayIso }: Props) {
  const [today, setToday] = useState({ pending: 0, wins: 0, losses: 0, qualityScores: [] as number[] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const log = loadTipJournal().filter((e) => e.date === todayIso);
      const pending = log.filter((e) => e.outcome === 'pending').length;
      const wins = log.filter((e) => e.outcome === 'win').length;
      const losses = log.filter((e) => e.outcome === 'loss').length;
      const qualityScores = log.map((e) => e.qualityScore).filter((s): s is number => typeof s === 'number');
      setToday({ pending, wins, losses, qualityScores });
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, [todayIso]);

  if (!mounted) return null;
  const total = today.pending + today.wins + today.losses;
  if (total === 0) return null;

  const avgScore = today.qualityScores.length > 0
    ? Math.round(today.qualityScores.reduce((a, b) => a + b, 0) / today.qualityScores.length)
    : null;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Heute getippt</h2>
        <span className="text-[10px] text-slate-500">{total} Tipps</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="offen" value={String(today.pending)} tone="amber" />
        <Stat label="Treffer" value={String(today.wins)} tone="emerald" />
        <Stat label="daneben" value={String(today.losses)} tone="rose" />
        <Stat label="Ø Quality" value={avgScore !== null ? `${avgScore}/100` : '—'} tone="slate" />
      </dl>
      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Tagessicht aus deinem lokalen Tipp-Tagebuch. Aktualisiert sich automatisch, sobald ein Spiel zu Ende geht.
      </p>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'emerald' | 'rose' | 'slate' }) {
  const cls =
    tone === 'amber' ? 'text-amber-200'
    : tone === 'emerald' ? 'text-emerald-200'
    : tone === 'rose' ? 'text-rose-200'
    : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <dt className="text-[9px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</dd>
    </div>
  );
}
