'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { tipsToIcs } from '@/lib/sport/ics-export';

// Erzeugt eine .ics mit allen offenen Tipps + 60-Min-Erinnerung. Import in
// Google/Apple Kalender möglich, rein client-seitig.
export function IcsExportButton() {
  const [pending, setPending] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setPending(loadTipJournal().filter((e) => e.outcome === 'pending').length);
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || pending === 0) return null;

  const download = () => {
    const ics = tipsToIcs(loadTipJournal());
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tipps-${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={download}
      title="Offene Tipps als Kalender-Datei (.ics) exportieren"
      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
    >
      ICS ({pending} offen)
    </button>
  );
}
