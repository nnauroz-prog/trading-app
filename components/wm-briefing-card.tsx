import Link from 'next/link';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';

// Mini-Karte für die Startseite: Countdown zur WM 2026 + nächstes Spiel
// aus dem Spielplan (falls vorhanden).
export function WmBriefingCard() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const upcomingFixtures = WM_2026_FIXTURES.filter((f) => f.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const next = upcomingFixtures[0] ?? null;

  // Countdown bis 11.06.2026 (Eröffnung)
  const opening = new Date('2026-06-11T18:00:00Z').getTime();
  const daysToOpening = Math.max(0, Math.ceil((opening - today.getTime()) / 86_400_000));
  const tournamentDone = today.getTime() > new Date('2026-07-19T23:59:59Z').getTime();

  if (tournamentDone && !next) return null;

  return (
    <Link
      href="/wm"
      className="block space-y-1 rounded-2xl border border-yellow-300/40 bg-gradient-to-br from-yellow-950/20 to-slate-900/40 p-3 transition hover:border-yellow-300/60"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-300">🏆 FIFA World Cup 2026</span>
        {daysToOpening > 0 && (
          <span className="rounded-md border border-yellow-300/40 bg-yellow-500/10 px-1.5 py-0.5 font-mono text-[10px] text-yellow-200">
            {daysToOpening} Tage bis Anstoß
          </span>
        )}
      </div>
      {next ? (
        <p className="text-[11.5px] leading-snug text-slate-100">
          Nächstes Spiel: <span className="font-semibold text-white">{next.homeTeam}</span> vs. <span className="font-semibold text-white">{next.awayTeam}</span>{' '}
          <span className="text-slate-500">· {next.date}{next.time ? ` · ${next.time}` : ''} · {next.venue}</span>
        </p>
      ) : (
        <p className="text-[11.5px] leading-snug text-slate-300">
          11. Juni bis 19. Juli 2026 in USA, Kanada, Mexiko — 64 Spiele, 16 Stadien.
        </p>
      )}
      <div className="text-[10px] text-yellow-300/80">zur WM-Seite →</div>
    </Link>
  );
}
