'use client';

import { useEffect, useState } from 'react';
import { computeTipprundeStats, loadProfile, TIPPRUNDE_CHANGED_EVENT } from '@/lib/sport/tipprunde';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT } from '@/lib/sport/tip-journal';

const BAND_LABEL: Record<string, string> = {
  sehr_stark: 'sehr stark',
  stark: 'stark',
  brauchbar: 'brauchbar',
  orientierung: 'Orientierung',
  nicht_verwenden: 'nicht verwenden'
};

function buildShareText(): string | null {
  const profile = loadProfile();
  const stats = computeTipprundeStats();
  if (!profile || stats.resolved === 0) return null;
  const lines = [
    `🎯 Tipprunde — ${profile.displayName}`,
    `Trefferquote: ${stats.hitRatePct}% (${stats.wins}/${stats.resolved})`,
    `Streak: ${stats.currentStreak} (max ${stats.longestStreak})`
  ];
  if (stats.bestBand) {
    lines.push(`bestes Band: ${BAND_LABEL[stats.bestBand.band] ?? stats.bestBand.band} (${stats.bestBand.hitRatePct}%)`);
  }
  lines.push('— erzeugt von der lokalen Tipprunde, keine Wettempfehlung.');
  return lines.join('\n');
}

// Kopiert die aktuelle Tipprunde-Statistik als Klartext in die Zwischen-
// ablage — perfekt für WhatsApp-Tippspielgruppen, ohne Server-Aufwand.
export function TipprundeShare() {
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sync = () => setText(buildShareText());
    sync();
    window.addEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
      window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    };
  }, []);

  if (!text) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: ältere Browser oder eingeschränkte Berechtigungen.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); }
      finally { document.body.removeChild(ta); }
    }
  };

  return (
    <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 p-2.5 text-[10.5px]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wider text-emerald-200">Statistik teilen</span>
        <button
          type="button"
          onClick={copy}
          className="rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/25"
        >
          {copied ? '✓ kopiert' : 'kopieren'}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words text-emerald-50/90">{text}</pre>
    </div>
  );
}
