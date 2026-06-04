// Plausibilitäts-Hinweise: erkennt Warnzeichen am eigenen Tipp-Verhalten und
// liefert kurze Klartext-Tipps. Wertet nur das Tagebuch aus.

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export interface SanityHint {
  id: string;
  severity: 'info' | 'warn';
  text: string;
}

export function computeSanityHints(log: TipJournalEntry[], now: Date = new Date()): SanityHint[] {
  const hints: SanityHint[] = [];
  const resolved = log.filter((e) => e.outcome !== 'pending');
  const decisive = resolved.filter((e) => e.outcome !== 'push');
  const wins = decisive.filter((e) => e.outcome === 'win').length;
  const winPct = decisive.length > 0 ? wins / decisive.length : 0;

  // Bias auf exakte Scores (riskant)
  const exactCount = log.filter((e) => /\d+\s*:\s*\d+/.test(e.market)).length;
  if (log.length >= 5 && exactCount / log.length > 0.5) {
    hints.push({
      id: 'too-many-exact',
      severity: 'warn',
      text: 'Mehr als die Hälfte deiner Tipps sind exakte Ergebnisse — riskant. Stabile Märkte (Doppelchance, Tor-Markt) haben höhere Trefferquoten.'
    });
  }

  // Niedrige Quote über viele Tipps
  if (decisive.length >= 10 && winPct < 0.4) {
    hints.push({
      id: 'low-hit-rate',
      severity: 'warn',
      text: 'Trefferquote unter 40 % über 10+ Tipps — schau dir den Quality-Band-Bucket an, du tippst vielleicht zu oft in „orientierung" oder „nicht verwenden".'
    });
  }

  // Streak-Lob
  const chrono = [...decisive].sort((a, b) => (a.resolvedAt ?? 0) - (b.resolvedAt ?? 0));
  let cur = 0;
  for (let i = chrono.length - 1; i >= 0; i--) {
    if (chrono[i].outcome === 'win') cur += 1;
    else break;
  }
  if (cur >= 3) {
    hints.push({
      id: 'on-fire',
      severity: 'info',
      text: `Du bist auf ${cur}er-Streak — nicht übermütig werden, Stop bei klarem Tipp halten.`
    });
  }

  // Lange Pause
  const last = log.reduce((max, e) => Math.max(max, e.recordedAt), 0);
  if (last > 0) {
    const daysSince = Math.floor((now.getTime() - last) / (24 * 60 * 60 * 1000));
    if (daysSince >= 14) {
      hints.push({
        id: 'inactive',
        severity: 'info',
        text: `Seit ${daysSince} Tagen kein neuer Tipp — keine Eile, aber das Modell läuft trotzdem im Hintergrund.`
      });
    }
  }

  return hints;
}
