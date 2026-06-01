import Link from 'next/link';
import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import { bucketByDay } from '@/lib/sport/day-buckets';
import { KickoffCountdown } from '@/components/kickoff-countdown';

function fmtTime(time: string | null, date: string): string {
  if (!time) return '';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

// Schmaler Banner ganz oben mit den ersten 3 heutigen Spielen — schnell scannen
// statt durch den ganzen Sport-Reiter zu klicken.
export function SportTodayBanner({ leagues }: { leagues: LeagueFixtures[] }) {
  const flat: UpcomingFixture[] = [];
  for (const lf of leagues) for (const f of lf.next) flat.push(f);
  const todayFixtures = bucketByDay(flat).today;
  if (todayFixtures.length === 0) return null;
  const first3 = todayFixtures.slice(0, 3);
  return (
    <Link
      href="/sport"
      className="block rounded-xl border border-emerald-400/30 bg-emerald-950/15 px-3 py-2 text-[11px] text-slate-200 hover:border-emerald-400/60 hover:bg-emerald-950/25"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-emerald-300">⚽ Heute spielen {todayFixtures.length} Mannschaften</span>
        <span className="text-[10px] text-emerald-200/70">zum Sport →</span>
      </div>
      <ul className="mt-1 space-y-0.5 text-[10.5px]">
        {first3.map((f) => (
          <li key={f.id} className="grid grid-cols-[auto_1fr_auto] gap-2">
            <span className="font-mono text-emerald-300">
              {fmtTime(f.time, f.date) || '—'}
              <KickoffCountdown dateIso={f.date} time={f.time} />
            </span>
            <span className="truncate">{f.homeTeam} vs. {f.awayTeam}</span>
            {f.prediction && (
              <span className="font-mono text-slate-400">
                {f.prediction.likelyScore.home}:{f.prediction.likelyScore.away}
              </span>
            )}
          </li>
        ))}
        {todayFixtures.length > 3 && (
          <li className="text-[9.5px] text-slate-500">… +{todayFixtures.length - 3} weitere</li>
        )}
      </ul>
    </Link>
  );
}
