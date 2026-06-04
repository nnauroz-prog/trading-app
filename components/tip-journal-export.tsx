'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { tipJournalToCsv } from '@/lib/sport/tip-journal-csv';
import { IcsExportButton } from '@/components/ics-export-button';

// Tipp-Tagebuch-Daten als JSON oder CSV exportieren — fürs Backup oder fürs
// Vergleichen mit Freunden. Kein Server, alles client-seitig via Blob-URL.
export function TipJournalExport() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setCount(loadTipJournal().length);
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  const download = (mime: string, ext: string, data: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tipp-tagebuch-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => download('application/json', 'json', JSON.stringify(loadTipJournal(), null, 2));
  const downloadCsv = () => download('text/csv;charset=utf-8', 'csv', tipJournalToCsv(loadTipJournal()));

  if (!mounted || count === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={downloadJson}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
      >
        JSON ({count})
      </button>
      <button
        type="button"
        onClick={downloadCsv}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
      >
        CSV ({count})
      </button>
      <IcsExportButton />
    </div>
  );
}
