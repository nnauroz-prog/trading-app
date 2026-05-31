'use client';

import { useState } from 'react';
import { loadDecisionLog } from '@/lib/agent-memory';
import { loadFirmaLog } from '@/lib/firma-memory';
import { loadIntelLog } from '@/lib/intel/memory';
import { loadAkademieLog } from '@/lib/akademie/memory';
import { loadTipJournal } from '@/lib/sport/tip-journal';

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const lines: string[] = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => {
      const v = r[h];
      if (v === undefined || v === null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    }).join(','));
  }
  return lines.join('\n');
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type ExportKind = 'agent' | 'firma' | 'intel' | 'akademie' | 'sport' | 'all-json';

const KINDS: Array<{ id: ExportKind; label: string }> = [
  { id: 'agent', label: 'Master-Signal-Tagebuch (CSV)' },
  { id: 'firma', label: 'Firmen-Tagebuch (CSV)' },
  { id: 'intel', label: 'Chefredakteur-Tagebuch (CSV)' },
  { id: 'akademie', label: 'Akademie-Snapshots (CSV)' },
  { id: 'sport', label: 'Sport-Tipp-Tagebuch (CSV)' },
  { id: 'all-json', label: 'Alles als JSON' }
];

export function DataExport() {
  const [last, setLast] = useState<ExportKind | null>(null);

  const handleExport = (kind: ExportKind) => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === 'agent') downloadBlob(rowsToCsv(loadDecisionLog() as unknown as Array<Record<string, unknown>>), `agent-${stamp}.csv`, 'text/csv');
    else if (kind === 'firma') downloadBlob(rowsToCsv(loadFirmaLog() as unknown as Array<Record<string, unknown>>), `firma-${stamp}.csv`, 'text/csv');
    else if (kind === 'intel') downloadBlob(rowsToCsv(loadIntelLog() as unknown as Array<Record<string, unknown>>), `intel-${stamp}.csv`, 'text/csv');
    else if (kind === 'akademie') downloadBlob(rowsToCsv(loadAkademieLog() as unknown as Array<Record<string, unknown>>), `akademie-${stamp}.csv`, 'text/csv');
    else if (kind === 'sport') downloadBlob(rowsToCsv(loadTipJournal() as unknown as Array<Record<string, unknown>>), `sport-tipps-${stamp}.csv`, 'text/csv');
    else if (kind === 'all-json') {
      const payload = {
        exportedAt: new Date().toISOString(),
        agent: loadDecisionLog(),
        firma: loadFirmaLog(),
        intel: loadIntelLog(),
        akademie: loadAkademieLog(),
        sport: loadTipJournal()
      };
      downloadBlob(JSON.stringify(payload, null, 2), `trading-app-export-${stamp}.json`, 'application/json');
    }
    setLast(kind);
    setTimeout(() => setLast(null), 2000);
  };

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daten-Export</h2>
      <p className="text-[11px] text-slate-500">
        Alle Tagebücher als CSV / JSON exportieren — für Sicherung, Excel-Analyse oder Datentransfer auf ein anderes Gerät.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => handleExport(k.id)}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${last === k.id ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200'}`}
          >
            {last === k.id ? '✓ heruntergeladen' : k.label}
          </button>
        ))}
      </div>
    </section>
  );
}
