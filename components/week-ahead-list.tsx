import type { WeekAheadDay } from '@/lib/sport/firma/week-ahead';

function fmtTime(time: string | null, date: string): string {
  if (!time) return '';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtDayHead(date: string, weekday: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return `${weekday} · ${date}`;
  return `${weekday} · ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' })}`;
}

function pickToneClass(conf: number): string {
  if (conf >= 0.65) return 'text-emerald-300';
  if (conf >= 0.5) return 'text-sky-300';
  if (conf >= 0.4) return 'text-amber-300';
  return 'text-slate-400';
}

export function WeekAheadList({ days }: { days: WeekAheadDay[] }) {
  if (days.length === 0) return null;
  const total = days.reduce((s, d) => s + d.fixtures.length, 0);
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Diese Woche · alle Spiele mit Tipp</h2>
        <span className="text-[10px] text-slate-500">{total} {total === 1 ? 'Spiel' : 'Spiele'} in den naechsten {days.length} {days.length === 1 ? 'Tag' : 'Tagen'} mit Liga-Spielen</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Vorhersage = Poisson-Modell auf der letzten Liga-Form. Tipps sind keine Wett-Empfehlung.
      </p>
      <div className="space-y-3">
        {days.map((d) => (
          <div key={d.date}>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-emerald-300">
              {fmtDayHead(d.date, d.weekday)} <span className="text-slate-500">· {d.fixtures.length} {d.fixtures.length === 1 ? 'Spiel' : 'Spiele'}</span>
            </div>
            <ul className="space-y-1">
              {d.fixtures.map(({ fixture: f, leagueName }) => {
                const p = f.prediction;
                return (
                  <li key={f.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11.5px]">
                    <span className="font-mono text-[10px] text-slate-500">{fmtTime(f.time, f.date) || '—'}</span>
                    <span className="text-slate-100">
                      <span className="font-semibold">{f.homeTeam}</span>{' '}
                      <span className="text-slate-500">vs.</span>{' '}
                      <span className="font-semibold">{f.awayTeam}</span>
                      <span className="ml-1 text-[9.5px] uppercase tracking-wider text-slate-600">{leagueName}</span>
                    </span>
                    <span className={`font-mono text-[10px] ${p ? pickToneClass(p.pickConfidence) : 'text-slate-500'}`}>
                      {p ? `${p.likelyScore.home}:${p.likelyScore.away} · ${Math.round(p.pickConfidence * 100)}%` : 'zu wenig Daten'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
