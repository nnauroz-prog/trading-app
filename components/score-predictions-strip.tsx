import Link from 'next/link';
import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function confidenceTone(conf: number): string {
  if (conf >= 0.65) return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100';
  if (conf >= 0.5) return 'border-sky-400/50 bg-sky-500/15 text-sky-100';
  if (conf >= 0.4) return 'border-amber-400/50 bg-amber-500/10 text-amber-100';
  return 'border-slate-700 bg-slate-900/40 text-slate-200';
}

// Eine prominente Vorhersage-Karte für die Startseite: die nächsten 10
// Spiele mit Score-Vorhersage, groß und scanbar. Verlinkt auf den vollen
// Sport-Reiter.
export function ScorePredictionsStrip({ synth }: { synth: FirmaSynthesis }) {
  const flat: { date: string; fixture: import('@/lib/sport/fetcher').UpcomingFixture; leagueName: string }[] = [];
  for (const day of synth.weekAhead) {
    for (const entry of day.fixtures) {
      if (entry.fixture.prediction) flat.push({ date: day.date, ...entry });
    }
  }
  // Sortierung: chronologisch, damit "was kommt zuerst" obenauf liegt.
  flat.sort((a, b) => a.date.localeCompare(b.date) || (a.fixture.time ?? '').localeCompare(b.fixture.time ?? ''));
  const top = flat.slice(0, 10);

  if (top.length === 0) {
    return (
      <Link href="/sport" className="block rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-[12px] text-slate-300 hover:border-emerald-400/40">
        <span className="font-semibold text-emerald-300">⚽ Vorhergesagte Ergebnisse</span>{' '}
        — derzeit keine anstehenden Spiele in den eingebundenen Ligen. Das Modell wertet im Hintergrund {synth.totalAnalyzedFixtures.toLocaleString('de-DE')} Spiele aus den letzten 3 Saisons aus, sobald Spielpläne wieder einlaufen, erscheinen sie hier.
      </Link>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">Vorhergesagte Ergebnisse</div>
          <h2 className="text-xl font-bold tracking-tight text-white">Die nächsten {top.length} Spiele</h2>
        </div>
        <Link href="/sport#ergebnisse" className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:border-emerald-300">
          Alle ansehen →
        </Link>
      </header>
      <ul className="space-y-1.5">
        {top.map(({ fixture: f, leagueName, date }) => {
          const p = f.prediction!;
          return (
            <li key={f.id} className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11.5px]">
              <span className="font-mono text-[10px] text-slate-500">{fmtDay(date)}</span>
              <Link href={`/sport/team/${encodeURIComponent(f.homeTeam)}`} className="truncate text-right font-semibold text-slate-100 hover:text-emerald-300">{f.homeTeam}</Link>
              <span className={`rounded-md border-2 px-2.5 py-0.5 font-mono text-sm font-bold ${confidenceTone(p.pickConfidence)}`}>
                {p.likelyScore.home} : {p.likelyScore.away}
              </span>
              <Link href={`/sport/team/${encodeURIComponent(f.awayTeam)}`} className="truncate font-semibold text-slate-100 hover:text-emerald-300">{f.awayTeam}</Link>
              <span className="text-right text-[9.5px] text-slate-500">
                <span className="block font-mono text-emerald-300">{Math.round(p.pickConfidence * 100)}%</span>
                <span className="block uppercase tracking-wider">{leagueName.split(' ')[0]}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Basis: {synth.totalAnalyzedFixtures.toLocaleString('de-DE')} echte Spiele aus drei Saisons. Farbe: grün ≥65 %, blau ≥50 %, gelb ≥40 %, grau offen.
      </p>
    </section>
  );
}
