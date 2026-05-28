'use client';

import { useState } from 'react';
import { backupSummary, exportData, exportToString, importData } from '@/lib/data-backup';

export function DataBackupPanel() {
  const [exported, setExported] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [mode, setMode] = useState<'replace' | 'merge'>('merge');
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  const handleExport = () => {
    const env = exportData();
    setExported(exportToString());
    setSummary(backupSummary(env));
    setStatus(null);
  };

  const handleCopy = () => {
    if (exported && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(exported).then(() => setStatus('In Zwischenablage kopiert.')).catch(() => setStatus('Kopieren fehlgeschlagen — Text manuell markieren.'));
    }
  };

  const handleDownload = () => {
    if (!exported) return;
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-app-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    if (mode === 'replace' && !window.confirm('Im Modus „Ersetzen" werden deine aktuellen Daten überschrieben. Wirklich fortfahren?')) return;
    const result = importData(importText, mode);
    if (result.ok) {
      setStatus(`✓ Wiederhergestellt: ${result.restoredKeys.map((k) => k.replace('trading-app.', '')).join(', ')}`);
      setImportText('');
    } else {
      setStatus(`✗ Fehler: ${result.error}`);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => setImportText(t));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daten-Backup &amp; Übertragung</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Alle deine Daten (Positionen, Journal, Watchlist, Alerts, DCA, Config) als Datei sichern oder auf ein anderes Gerät übertragen. Funktioniert offline, ohne Account. Daten liegen sonst nur in diesem Browser.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Export (Backup erstellen)</h3>
        <button onClick={handleExport} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30">
          Daten exportieren
        </button>
        {exported && (
          <div className="mt-3 space-y-2">
            {summary && (
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {Object.entries(summary).map(([k, n]) => (
                  <span key={k} className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-slate-300">{k}: {n}</span>
                ))}
              </div>
            )}
            <textarea readOnly value={exported} className="h-28 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[10px] text-slate-300" />
            <div className="flex gap-2">
              <button onClick={handleCopy} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200">Kopieren</button>
              <button onClick={handleDownload} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200">Als Datei laden</button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Import (Backup einspielen)</h3>
        <div className="mb-2 flex items-center gap-3 text-[11px]">
          <label className="flex items-center gap-1 text-slate-400">
            <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Zusammenführen (empfohlen)
          </label>
          <label className="flex items-center gap-1 text-slate-400">
            <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Ersetzen
          </label>
        </div>
        <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Backup-JSON hier einfügen…" className="h-24 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[10px] text-slate-300" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={handleImport} disabled={!importText.trim()} className="rounded-md border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-40">
            Importieren
          </button>
          <label className="cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300 hover:border-slate-600">
            Datei wählen
            <input type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
          </label>
        </div>
      </div>

      {status && <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-[11px] text-slate-300">{status}</p>}

      <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-[10px] leading-relaxed text-slate-500">
        {`So überträgst du auf ein neues Gerät: Hier exportieren → Datei/Text auf das andere Gerät bringen → dort unter /settings importieren. „Zusammenführen" behält bestehende Einträge und fügt neue hinzu (per ID), „Ersetzen" überschreibt alles. Echte automatische Cloud-Sync (Supabase) folgt — dafür brauchst du ein Supabase-Projekt.`}
      </p>
    </section>
  );
}
