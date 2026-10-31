'use client';

import { useRef, useState } from 'react';
import { backupSummary, exportData, exportToString, importData } from '@/lib/data-backup';

export function DataBackupPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'replace' | 'merge'>('merge');
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  const handleExport = () => {
    const data = exportData();
    setExported(exportToString());
    setSummary(backupSummary(data));
    setStatus(null);
  };

  const handleCopy = () => {
    if (exported && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(exported)
        .then(() => setStatus('Der Sicherungstext wurde kopiert.'))
        .catch(() => setStatus('Kopieren hat nicht geklappt. Du kannst den Text selbst markieren und kopieren.'));
    } else {
      setStatus('Automatisches Kopieren ist hier nicht verfügbar. Du kannst den Text selbst markieren und kopieren.');
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
    if (mode === 'replace' && !window.confirm('Die in der Sicherung enthaltenen Bereiche ersetzen deine bisherigen Angaben. Andere Bereiche bleiben erhalten. Möchtest du fortfahren?')) return;
    const result = importData(importText, mode);
    if (result.ok) {
      setStatus(result.restoredKeys.length > 0 ? 'Deine gesicherten Daten wurden übernommen.' : 'Diese Sicherung enthält keine Daten, die übernommen werden können.');
      setImportText('');
      setFileName('');
    } else {
      setStatus(result.error === 'invalid_json'
        ? 'Diese Sicherung konnte nicht gelesen werden. Wähle die ursprüngliche Sicherungsdatei aus.'
        : 'Diese Datei ist keine passende Sicherung dieser App. Deine bisherigen Daten wurden nicht geändert.');
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    file.text().then(text => { setImportText(text); setFileName(file.name); setStatus(null); })
      .catch(() => setStatus('Die Datei konnte nicht geöffnet werden. Bitte wähle sie noch einmal aus.'));
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-200">Deine Daten sichern</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">Dein Geldplan, deine Käufe und Listen werden auf diesem Gerät gespeichert. Mit einer Sicherungsdatei kannst du sie aufbewahren oder auf ein anderes Gerät mitnehmen.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Eine Sicherung erstellen</h3>
        <button type="button" onClick={handleExport} className="terminal-button mt-3">Meine Daten sichern</button>
        {exported && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-300">Deine Sicherung ist bereit. {summary && Object.keys(summary).length === 0 ? 'Es sind noch keine gespeicherten Angaben vorhanden.' : 'Lade die Datei herunter und bewahre sie auf.'}</p>
            <button type="button" onClick={handleDownload} className="terminal-button terminal-button-primary">Sicherungsdatei herunterladen</button>
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer py-2 hover:text-slate-300">Sicherung als Text kopieren</summary>
              <p className="mb-2 leading-relaxed">Du kannst auch den vollständigen Sicherungstext auf ein anderes Gerät mitnehmen.</p>
              <textarea aria-label="Dein Sicherungstext" readOnly value={exported} className="h-28 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-300" />
              <button type="button" onClick={handleCopy} className="terminal-button mt-2">Text kopieren</button>
            </details>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Eine Sicherung wiederherstellen</h3>
        <p className="text-sm leading-relaxed text-slate-400">Wähle eine zuvor heruntergeladene Sicherungsdatei aus. Danach kannst du die enthaltenen Daten übernehmen.</p>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="terminal-button">Sicherungsdatei auswählen</button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
        {fileName && <p className="break-all text-xs text-slate-400">Ausgewählt: {fileName}</p>}
        <details className="text-sm text-slate-400">
          <summary className="cursor-pointer py-2 hover:text-slate-200">Wie mit vorhandenen Daten umgehen?</summary>
          <div className="mt-2 space-y-3">
            <label className="flex items-start gap-2"><input type="radio" name="restore-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} /><span>Daten ergänzen<span className="mt-1 block text-xs text-slate-500">Listen werden ergänzt; bei doppelten Einträgen bleiben deine bisherigen Angaben. Einzeln gespeicherte Einstellungen werden aus der Sicherung übernommen.</span></span></label>
            <label className="flex items-start gap-2"><input type="radio" name="restore-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /><span>Angaben aus der Sicherung übernehmen<span className="mt-1 block text-xs text-slate-500">Die enthaltenen Bereiche ersetzen die entsprechenden bisherigen Angaben. Andere Bereiche bleiben unverändert.</span></span></label>
          </div>
        </details>
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer py-2 hover:text-slate-300">Sicherungstext einfügen</summary>
          <textarea aria-label="Sicherungstext zum Wiederherstellen" value={importText} onChange={e => { setImportText(e.target.value); setFileName(''); }} placeholder="Den vollständigen Sicherungstext hier einfügen" className="mt-2 h-24 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-300" />
        </details>
        <button type="button" onClick={handleImport} disabled={!importText.trim()} className="terminal-button terminal-button-primary disabled:opacity-40">Daten wiederherstellen</button>
      </div>
      {status && <p role="status" className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">{status}</p>}
    </section>
  );
}
