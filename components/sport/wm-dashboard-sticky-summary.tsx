// Sticky Mini-Summary am unteren Rand (mobile-first).
// Zeigt Top-Favorit + Confidence + Update-Zeit, immer sichtbar
// waehrend der User scrollt.
//
// 'use client' nur weil wir scrollabhaengig (optional) ausblenden
// koennten — aktuell statisch, daher Server-Component reicht.

import type { TournamentWinnerPrediction } from '@/lib/sports/world-cup-prediction-engine';

interface Props {
  topFavorite: TournamentWinnerPrediction | null;
  lastUpdated: string;
}

const CONF_LABEL = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' } as const;

function fmtRelative(iso: string): string {
  try {
    const updated = new Date(iso).getTime();
    if (!Number.isFinite(updated)) return '—';
    const diffMs = Date.now() - updated;
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin < 1) return 'gerade eben';
    if (diffMin < 60) return `vor ${diffMin} Min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `vor ${diffH} h`;
    return `vor ${Math.round(diffH / 24)} Tagen`;
  } catch {
    return '—';
  }
}

export function WmDashboardStickySummary({ topFavorite, lastUpdated }: Props) {
  if (!topFavorite) return null;
  return (
    <div
      aria-label="Sticky Zusammenfassung"
      className="sticky bottom-2 z-30 mx-auto mt-3 max-w-md rounded-full border border-emerald-400/30 bg-slate-950/90 px-4 py-1.5 text-[10.5px] shadow-lg backdrop-blur sm:max-w-fit"
    >
      <span className="font-bold text-emerald-200">{topFavorite.team}</span>
      <span className="ml-1 text-slate-400">·</span>
      <span className="ml-1 font-mono text-emerald-100">{topFavorite.winProbability.toFixed(1)}%</span>
      <span className="ml-1 text-slate-400">·</span>
      <span className="ml-1 text-slate-300">Conf {CONF_LABEL[topFavorite.confidence]}</span>
      <span className="ml-1 text-slate-400">·</span>
      <span className="ml-1 text-slate-400">{fmtRelative(lastUpdated)}</span>
    </div>
  );
}
