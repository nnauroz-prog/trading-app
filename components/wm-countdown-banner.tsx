// WM-2026-Countdown: prominent wenn ≤ 30 Tage bis Eröffnung, zeigt das
// nächste WM-Spiel mit Anstoß-Zeit. Greift auf den hardkodierten WM-Plan
// zurück, da TheSportsDB den Plan oft noch nicht in den Live-Endpunkten hat.

import Link from 'next/link';
import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';

interface Props {
  todayIso: string;
}

function daysBetween(todayIso: string, targetIso: string): number {
  const t = new Date(`${todayIso}T00:00:00`).getTime();
  const x = new Date(`${targetIso}T00:00:00`).getTime();
  return Math.round((x - t) / (24 * 60 * 60 * 1000));
}

export function WmCountdownBanner({ todayIso }: Props) {
  const upcoming = WM_2026_FIXTURES
    .filter((f) => daysBetween(todayIso, f.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length === 0) return null;
  const next: WmFixture = upcoming[0];
  const daysUntil = daysBetween(todayIso, next.date);

  // Nur zeigen wenn WM-Start in 30 Tagen oder näher.
  if (daysUntil > 30) return null;

  const isOpening = next.id === 'wm-1' || daysUntil === 0;

  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-emerald-950/60 to-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
          🏆 WM 2026 · USA · Mexiko · Kanada
        </div>
        <Link
          href="/wm"
          className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
        >
          ganzer Spielplan →
        </Link>
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-emerald-50">
        {daysUntil === 0 ? 'Heute Eröffnung!'
          : daysUntil === 1 ? 'Morgen Eröffnung!'
          : `noch ${daysUntil} Tage`}
      </h2>
      <p className="text-[11.5px] leading-snug text-emerald-100/80">
        {isOpening ? 'Eröffnungsspiel: ' : 'Nächstes Spiel: '}
        <span className="font-semibold text-emerald-50">{next.homeTeam} – {next.awayTeam}</span>
        {next.time && <span className="ml-1 font-mono">· {next.time} Uhr</span>}
        <span className="ml-1 text-emerald-200/60">· {next.venue}</span>
      </p>
      <p className="text-[10px] leading-snug text-emerald-100/60">
        Termine offiziell von der FIFA, Mannschafts-Paarungen sobald die Auslosung steht. Tipprunde kann darauf laufen.
      </p>
    </section>
  );
}
