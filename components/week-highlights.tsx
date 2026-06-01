import Link from 'next/link';
import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

// Highlights-Strip am Ende der Sport-Seite: die spannendsten 5 Spiele
// der Woche aus dem Mix aus sicheren und Vielfalt-Picks.
export function WeekHighlights({ synth }: { synth: FirmaSynthesis }) {
  // Top-5 nach Konfidenz, aber pro Tag maximal einmal — vermeidet, dass ein
  // einziger Spieltag den Strip füllt.
  const flat = synth.weekAhead.flatMap((day) => day.fixtures.map((entry) => ({ day, entry })));
  const byDay = new Map<string, typeof flat[number]>();
  for (const x of flat) {
    if (!x.entry.fixture.prediction) continue;
    const current = byDay.get(x.day.date);
    if (!current || (x.entry.fixture.prediction.pickConfidence > (current.entry.fixture.prediction?.pickConfidence ?? 0))) {
      byDay.set(x.day.date, x);
    }
  }
  const highlights = Array.from(byDay.values())
    .sort((a, b) => (b.entry.fixture.prediction!.pickConfidence) - (a.entry.fixture.prediction!.pickConfidence))
    .slice(0, 5);

  if (highlights.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Highlights der Woche</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Aus jedem Spieltag das Spitzenspiel — beim Klick gehst du direkt zur Mannschafts-Detailansicht.
        </p>
      </div>
      <ul className="space-y-1.5">
        {highlights.map(({ entry }) => {
          const f = entry.fixture;
          const p = f.prediction!;
          return (
            <li key={f.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
              <span className="font-mono text-[10px] text-slate-500">{fmtDate(f.date)}</span>
              <span className="text-slate-100 truncate">
                <Link href={`/sport/team/${encodeURIComponent(f.homeTeam)}`} className="font-semibold hover:text-emerald-300">{f.homeTeam}</Link>{' '}
                <span className="text-slate-500">vs.</span>{' '}
                <Link href={`/sport/team/${encodeURIComponent(f.awayTeam)}`} className="font-semibold hover:text-emerald-300">{f.awayTeam}</Link>
                <span className="ml-1 text-[9.5px] uppercase tracking-wider text-slate-600">{entry.leagueName}</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-300">
                {p.likelyScore.home}:{p.likelyScore.away} · {Math.round(p.pickConfidence * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
