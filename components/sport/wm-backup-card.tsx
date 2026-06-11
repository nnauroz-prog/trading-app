'use client';

// Backup/Restore aller lokalen WM-Daten als JSON-Datei.
//
// Export: laedt sofort eine Datei mit allen WM-localStorage-Eintraegen
// herunter. Restore: Datei waehlen, kurze Bestaetigung, dann
// Anwendung. Ueberschreibt nur die im Backup enthaltenen Schluessel.

import { useRef, useState } from 'react';
import {
  collectWmBackup,
  serializeWmBackup,
  parseWmBackup,
  applyWmBackup,
  WM_BACKUP_KEYS,
  type WmBackup
} from '@/lib/sport/wm-backup';

interface Message {
  tone: 'ok' | 'fehler';
  text: string;
}

function todayIsoCompact(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WmBackupCard() {
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, setPending] = useState<WmBackup | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const backup = collectWmBackup();
    const json = serializeWmBackup(backup);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wm-backup-${todayIsoCompact()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const keyCount = Object.keys(backup.payload).length;
    setMessage({ tone: 'ok', text: `Backup mit ${keyCount} von ${WM_BACKUP_KEYS.length} Datenbloecken heruntergeladen.` });
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // selbe Datei zwei Mal waehlen zu koennen
    try {
      const text = await file.text();
      const parsed = parseWmBackup(text);
      if (!parsed) {
        setMessage({ tone: 'fehler', text: 'Datei nicht erkannt — bitte ein wm-backup-*.json waehlen.' });
        setPending(null);
        return;
      }
      setPending(parsed);
      setMessage(null);
    } catch (err) {
      setMessage({ tone: 'fehler', text: `Datei konnte nicht gelesen werden: ${err instanceof Error ? err.message : 'unbekannt'}` });
    }
  };

  const handleConfirmRestore = () => {
    if (!pending) return;
    const result = applyWmBackup(pending);
    setPending(null);
    if (result.errors.length > 0) {
      setMessage({ tone: 'fehler', text: `Wiederhergestellt: ${result.appliedCount}. Fehler: ${result.errors.join(', ')}` });
    } else {
      setMessage({ tone: 'ok', text: `${result.appliedCount} Datenbloecke wiederhergestellt. Seite neu laden, damit alle Karten frische Daten ziehen.` });
    }
  };

  const handleCancelRestore = () => {
    setPending(null);
    setMessage(null);
  };

  const messageTone = message?.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300';

  return (
    <section className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/40 p-3" aria-label="WM Backup">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Backup &amp; Wiederherstellen</h3>
        <span className="text-[10px] text-slate-500">JSON, nur WM-Daten</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded border border-emerald-500/40 bg-emerald-950/30 px-2 py-1 text-[10.5px] uppercase tracking-wider text-emerald-200 hover:border-emerald-400"
        >Backup herunterladen</button>
        <button
          type="button"
          onClick={handlePickFile}
          className="rounded border border-sky-500/40 bg-sky-950/30 px-2 py-1 text-[10.5px] uppercase tracking-wider text-sky-200 hover:border-sky-400"
        >Datei wiederherstellen</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileSelected}
          className="hidden"
          aria-label="Backup-Datei waehlen"
        />
      </div>
      {pending && (
        <div className="rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
          <p className="font-semibold">Backup vom {pending.createdAt.slice(0, 10)} gefunden.</p>
          <p className="text-[10.5px]">{Object.keys(pending.payload).length} Datenbloecke werden ueberschrieben. Aktuelle Daten gehen dabei verloren.</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={handleConfirmRestore}
              className="rounded border border-amber-400/60 bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-100 hover:border-amber-300"
            >Wirklich wiederherstellen</button>
            <button
              type="button"
              onClick={handleCancelRestore}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400 hover:border-slate-500"
            >abbrechen</button>
          </div>
        </div>
      )}
      {message && (
        <p className={`text-[10.5px] ${messageTone}`}>{message.text}</p>
      )}
      <p className="text-[9.5px] leading-snug text-slate-500">
        Backup enthaelt Bankroll, Stakes, Pick-Lern-Log, Notizen, manuelle Ergebnisse, Anbieter-Namen und gespeicherte Quoten. Datei nicht weitergeben — sie spiegelt Deine privaten Einstellungen.
      </p>
    </section>
  );
}
