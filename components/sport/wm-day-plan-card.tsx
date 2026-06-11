// "Heute bei der WM" — eine Zeile pro Spiel mit Anstosszeit (Berlin),
// Pick-Status und konkretem Grund bei Block. Server-renderbar.
//
// Wording ohne verbotene Begriffe.

import type { DayPlanStatus, WmDayPlan } from '@/lib/sport/wm-day-plan';
import { WmDayPlanLiveRow } from '@/components/sport/wm-day-plan-live-row';

interface Props {
  plan: WmDayPlan;
}

const STATUS_CLASS: Record<DayPlanStatus, string> = {
  'pick': 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200',
  'blocked-tbd': 'border-slate-700 bg-slate-900 text-slate-300',
  'blocked-placeholder': 'border-amber-500/40 bg-amber-950/20 text-amber-200',
  'blocked-mismatch': 'border-rose-500/40 bg-rose-950/20 text-rose-200',
  'kein-pick-filter': 'border-slate-700 bg-slate-900 text-slate-400'
};

const STATUS_LABEL: Record<DayPlanStatus, string> = {
  'pick': 'PICK',
  'blocked-tbd': 'TBD',
  'blocked-placeholder': 'UNVERIFIZIERT',
  'blocked-mismatch': 'QUELLEN-KONFLIKT',
  'kein-pick-filter': 'KEIN PICK'
};

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function WmDayPlanCard({ plan }: Props) {
  if (plan.rows.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-yellow-400/40 bg-yellow-950/10 p-3" aria-label="Heute bei der WM">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-300">🏆 Heute bei der WM · {fmtDate(plan.dateIso)}</h3>
        <span className="text-[10px] text-yellow-200/70">
          {plan.rows.length} Spiel{plan.rows.length === 1 ? '' : 'e'} · {plan.pickCount} Pick{plan.pickCount === 1 ? '' : 's'}
        </span>
      </div>

      <ul className="space-y-1">
        {plan.rows.map((r) => (
          <li key={r.fixture.id} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-[10.5px]">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[10px] text-slate-500">{r.kickoffBerlin ?? '—'}</span>
              <span className="font-semibold text-slate-100">{r.fixture.homeTeam}</span>
              <span className="text-slate-500">–</span>
              <span className="font-semibold text-slate-100">{r.fixture.awayTeam}</span>
              <WmDayPlanLiveRow fixtureId={r.fixture.id} dateIso={r.fixture.date} time={r.fixture.time} />
              <span className="text-[9px] uppercase tracking-wider text-slate-600">{r.fixture.phase}{r.fixture.group ? ` ${r.fixture.group}` : ''}</span>
              <span className={`ml-auto rounded border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${STATUS_CLASS[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{r.reason}</p>
            {r.weatherNote && (
              <p className="mt-0.5 text-[9.5px] text-sky-300/80">🌦 {r.weatherNote}</p>
            )}
          </li>
        ))}
      </ul>

      <p className="text-[9.5px] leading-snug text-slate-500">
        Anstosszeiten in Europe/Berlin. PICK = alle Pflicht-Filter bestanden. Geblockte Spiele zeigen den konkreten Grund — kein Pick ist auch eine Entscheidung.
      </p>
    </section>
  );
}
