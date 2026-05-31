import { MacroEvent } from '@/lib/calendar/macro-events';

function fmtWeekday(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function impactBadge(impact: MacroEvent['impact']): string {
  if (impact === 'hoch') return 'border-rose-400/50 bg-rose-500/15 text-rose-200';
  if (impact === 'mittel') return 'border-amber-400/50 bg-amber-500/15 text-amber-200';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

function regionLabel(region: MacroEvent['region']): string {
  if (region === 'US') return 'USA';
  if (region === 'EU') return 'EU';
  if (region === 'DE') return 'DE';
  if (region === 'UK') return 'UK';
  if (region === 'CRYPTO') return 'Krypto';
  return 'Global';
}

export function WocheVoraus({ events, today }: { events: MacroEvent[]; today: string }) {
  if (events.length === 0) return null;

  // Group by date
  const byDate = new Map<string, MacroEvent[]>();
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const highCount = events.filter((e) => e.impact === 'hoch').length;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Die Woche voraus</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Geplante Makro-Termine der nächsten 7 Tage. Wer den Termin kennt, kann <span className="text-slate-300">vor</span> der Reaktion positionieren — oder bewusst <span className="text-slate-300">danach</span> entscheiden, statt mitten in der Volatilität blind zu kaufen.
          </p>
        </div>
        {highCount > 0 && (
          <span className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-200">
            {highCount} hoch-impact
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {Array.from(byDate.entries()).map(([date, dayEvents]) => {
          const isToday = date === today;
          return (
            <li key={date} className={`space-y-1.5 rounded-lg border p-3 ${isToday ? 'border-emerald-400/50 bg-emerald-950/20' : 'border-slate-800 bg-slate-950/40'}`}>
              <div className="flex items-baseline justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  {fmtWeekday(date)} {isToday && <span className="ml-1 text-[9px] uppercase text-emerald-300">heute</span>}
                </div>
                <div className="text-[9px] text-slate-500">{dayEvents.length} Termin{dayEvents.length === 1 ? '' : 'e'}</div>
              </div>
              <ul className="space-y-1">
                {dayEvents.map((e) => (
                  <li key={e.id} className="grid grid-cols-[auto_auto_1fr_auto] items-baseline gap-2 text-[11px]">
                    <span className="font-mono text-slate-300">{e.time}</span>
                    <span className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{regionLabel(e.region)}</span>
                    <span className="text-slate-200">{e.title}{e.note && <span className="ml-1 text-[10px] text-slate-500">— {e.note}</span>}</span>
                    <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${impactBadge(e.impact)}`}>{e.impact}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-slate-500">
        Geschätzte Termine — Hochinflations-Releases (CPI, PCE, FOMC, NFP) folgen festen Mustern, aber für offizielle Bestätigung beim jeweiligen Statistikamt prüfen.
      </p>
    </section>
  );
}
