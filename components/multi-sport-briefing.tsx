import Link from 'next/link';

interface Props {
  fussballHeute: number;
  basketballHeute: number;
  tennisHeute: number;
  eishockeyHeute: number;
}

interface SportRow {
  emoji: string;
  label: string;
  href: string;
  count: number;
}

// Vier-Zeilen-Übersicht der Sportarten mit Anzahl heutiger Spiele.
// Sehr kompakt — eine Karte statt vier separater Briefings.
export function MultiSportBriefing({ fussballHeute, basketballHeute, tennisHeute, eishockeyHeute }: Props) {
  const sports: SportRow[] = [
    { emoji: '⚽', label: 'Fußball', href: '/sport', count: fussballHeute },
    { emoji: '🏀', label: 'Basketball', href: '/basketball', count: basketballHeute },
    { emoji: '🎾', label: 'Tennis', href: '/tennis', count: tennisHeute },
    { emoji: '🏒', label: 'Eishockey', href: '/eishockey', count: eishockeyHeute }
  ];
  const total = sports.reduce((s, x) => s + x.count, 0);

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Sport heute</h2>
        <span className="text-[10px] text-slate-500">{total} Spiele über 4 Sportarten</span>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sports.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`block rounded-lg border px-2 py-1.5 text-center ${s.count > 0 ? 'border-emerald-400/40 bg-emerald-950/15 hover:border-emerald-400/70' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
            >
              <div className="text-base">{s.emoji}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</div>
              <div className={`font-mono text-sm font-bold ${s.count > 0 ? 'text-emerald-300' : 'text-slate-600'}`}>{s.count}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
