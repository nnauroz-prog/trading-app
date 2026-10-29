// Banner, das klar sagt: die WM 2026 ist vorbei. Verhindert, dass die
// Sieger-Vorhersage wie eine aktuelle Prognose fuer ein laufendes
// Turnier wirkt. Server-Component, reine Datums-Logik.

import Link from 'next/link';
import { daysSinceWmEnd, WM_END_ISO } from '@/lib/sport/wm-tournament-phase';

function fmtDe(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export function WmTournamentOverBanner({ todayIso }: { todayIso: string }) {
  const days = daysSinceWmEnd(todayIso);
  return (
    <section
      role="alert"
      className="space-y-1.5 rounded-2xl border border-slate-600/60 bg-slate-900/50 p-4"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
        Turnier beendet
      </div>
      <h2 className="text-lg font-bold tracking-tight text-white">
        Die WM 2026 ist seit dem {fmtDe(WM_END_ISO)} vorbei.
      </h2>
      <p className="text-[12px] leading-relaxed text-slate-300">
        Das Finale liegt {days} {days === 1 ? 'Tag' : 'Tage'} zurueck. Die untenstehende Sieger-
        Vorhersage ist ein <span className="font-semibold text-slate-100">Archiv-Stand</span> aus der
        Vorturnier-Phase — <span className="font-semibold text-amber-300">keine aktuelle Prognose</span>.
        Für laufende Wettbewerbe nutze die aktiven Sport-Reiter.
      </p>
      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
        <Link href="/sport" className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-200 transition hover:border-emerald-400/50">
          ⚽ Aktueller Fußball
        </Link>
        <Link href="/" className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-600">
          ₿ Zum Markt-Desk
        </Link>
      </div>
    </section>
  );
}
