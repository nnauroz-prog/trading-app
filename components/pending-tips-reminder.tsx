'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal, type TipJournalEntry } from '@/lib/sport/tip-journal';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

// Wenn der User offene Tipps hat, oben im Sport-Reiter eine kleine
// Erinnerung — keine Push-Benachrichtigung, einfach „du hast X offene Tipps".
export function PendingTipsReminder() {
  const [pending, setPending] = useState<TipJournalEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setPending(loadTipJournal().filter((e) => e.outcome === 'pending'));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || pending.length === 0) return null;
  const sorted = [...pending].sort((a, b) => a.date.localeCompare(b.date));
  const next = sorted[0];

  return (
    <section className="rounded-2xl border border-emerald-400/30 bg-emerald-950/10 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">offene Tipps</span>
        <a href="#tagebuch" className="text-[10px] text-emerald-300 hover:text-emerald-200">→ Tagebuch</a>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-emerald-50">
        <span className="font-semibold">{pending.length} {pending.length === 1 ? 'Tipp' : 'Tipps'}</span> warten auf Auflösung.
        Nächster Anstoß: <span className="font-semibold">{next.homeTeam} – {next.awayTeam}</span>
        <span className="text-emerald-200/60"> · {fmtDate(next.date)} · {next.market}</span>
      </p>
    </section>
  );
}
