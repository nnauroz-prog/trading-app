// Direkt unter dem WM-Countdown: alle anstehenden WM-Spiele kompakt mit
// Datum, Anstoß-Zeit und Phase — Mannschaften können noch „TBD" sein.
// Nur sichtbar, solange die WM 30 Tage oder weniger entfernt ist.

import Link from 'next/link';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';
import { WmTipButton } from '@/components/wm-tip-button';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';
import { WmProPredictionCard } from '@/components/wm-pro-prediction-card';

interface Props {
  todayIso: string;
}

function daysBetween(a: string, b: string): number {
  const t = new Date(`${a}T00:00:00`).getTime();
  const x = new Date(`${b}T00:00:00`).getTime();
  return Math.round((x - t) / (24 * 60 * 60 * 1000));
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function WmNextMatches({ todayIso }: Props) {
  const upcoming = WM_2026_FIXTURES
    .filter((f) => daysBetween(todayIso, f.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length === 0) return null;
  const firstDays = daysBetween(todayIso, upcoming[0].date);
  if (firstDays > 30) return null;

  const top5 = upcoming;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          Nächste WM-Spiele · {top5.length}
        </h2>
        <Link href="/wm" className="text-[10px] text-emerald-300 hover:text-emerald-200">→ ganzer Plan</Link>
      </div>
      <ul className="mt-2 space-y-1">
        {top5.map((f) => (
          <li key={f.id} className="space-y-1 rounded-md border border-slate-800 bg-slate-950/40 p-2">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <span className="font-mono text-[10px] text-slate-500">
                {fmtDate(f.date)}{f.time && <span className="ml-1">{f.time}</span>}
              </span>
              <span className="min-w-0 truncate text-[11.5px] text-slate-100">
                <span className="font-semibold">{f.homeTeam}</span>
                <span className="mx-1 text-slate-500">–</span>
                <span className="font-semibold">{f.awayTeam}</span>
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-400">
                {f.phase}{f.group ? ` ${f.group}` : ''}
              </span>
            </div>
            {!f.homeTeam.includes('TBD') && !f.awayTeam.includes('TBD') && (
              <>
                <WmProPredictionCard
                  prediction={predictWmMatch({
                    homeTeam: f.homeTeam,
                    awayTeam: f.awayTeam,
                    venue: f.venue,
                    phase: f.phase
                  })}
                  showExtraTime={f.phase !== 'Gruppe'}
                />
                <WmTipButton fixture={f} />
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Mannschafts-Slots als „TBD“ sind nach Auslosung / Qualifikation befüllt — wir hinterlegen keine erfundenen Paarungen.
      </p>
    </section>
  );
}
