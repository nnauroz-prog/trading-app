// WM-Gewinner: Weltmeister-Tipp oben, darunter jeden Tag jedes Spiel
// mit dem Modell-Gewinner. Chronologisch, nichts weiter.

import { buildWmDailyWinners } from '@/lib/sport/wm-daily-winners';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

const PHASE_TAG: Partial<Record<WmFixture['phase'], string>> = {
  Achtelfinale: 'AF',
  Viertelfinale: 'VF',
  Halbfinale: 'HF',
  'Spiel um Platz 3': 'Platz 3',
  Finale: 'FINALE'
};

export function WmTurnierTippCard() {
  const { rows, championPick } = buildWmDailyWinners();

  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byDate.has(r.dateIso)) byDate.set(r.dateIso, []);
    byDate.get(r.dateIso)!.push(r);
  }
  const dates = Array.from(byDate.keys()).sort();

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3" aria-label="WM Gewinner pro Tag">
      <h2 className="text-[14px] font-bold text-slate-100">WM 2026 — wer gewinnt?</h2>

      {championPick && (
        <div className="rounded border border-emerald-400/60 bg-emerald-500/15 px-3 py-2">
          <div className="text-[9.5px] uppercase tracking-[0.2em] text-emerald-200/80">Weltmeister</div>
          <div className="text-[20px] font-bold text-emerald-100">{championPick}</div>
        </div>
      )}

      <ol className="space-y-2.5">
        {dates.map((date) => {
          const items = byDate.get(date)!;
          return (
            <li key={date}>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {fmtDate(date)}
              </div>
              <ul className="space-y-0.5">
                {items.map((r) => (
                  <li key={r.fixtureId} className="flex items-baseline gap-2 rounded border border-slate-800 bg-slate-950/50 px-2 py-1 text-[12px]">
                    <span className="w-10 font-mono text-[10px] text-slate-500">{r.time ?? '--:--'}</span>
                    {PHASE_TAG[r.phase] && (
                      <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-amber-200">{PHASE_TAG[r.phase]}</span>
                    )}
                    <span className="font-bold text-emerald-200">{r.winner}</span>
                    <span className="text-[10.5px] text-slate-500">gewinnt gegen {r.loser}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
