// Timeline der WM-Phasen mit aktiver Hervorhebung. Hilft beim Überblick,
// wo das Turnier gerade steht.

import { WM_2026_PHASES, currentPhase, nextPhase } from '@/lib/sport/wm-phases';

interface Props {
  todayIso: string;
  openingIso?: string;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

export function WmPhasesTimeline({ todayIso, openingIso = '2026-06-11' }: Props) {
  const days = daysBetween(todayIso, openingIso);
  if (days > 30 || days < -50) return null;

  const active = currentPhase(todayIso);
  const next = nextPhase(todayIso);

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">WM 2026 · Phasen-Timeline</h2>
      <ul className="space-y-1">
        {WM_2026_PHASES.map((p) => {
          const isActive = active?.name === p.name;
          const isUpcoming = next?.name === p.name;
          const cls = isActive ? 'border-emerald-400/50 bg-emerald-950/30 text-emerald-100'
            : isUpcoming ? 'border-sky-400/40 bg-sky-950/20 text-sky-100'
            : 'border-slate-800 bg-slate-950/40 text-slate-300';
          return (
            <li key={p.name} className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${cls}`}>
              <span className="font-semibold">
                {p.name}
                {isActive && <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-200">läuft</span>}
                {isUpcoming && !isActive && <span className="ml-2 rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-200">nächste</span>}
              </span>
              <span className="font-mono text-[10px] opacity-80">{fmtDate(p.startIso)}{p.startIso !== p.endIso ? `–${fmtDate(p.endIso)}` : ''}</span>
              <span className="font-mono text-[10px] opacity-70">{p.matchCount} {p.matchCount === 1 ? 'Spiel' : 'Spiele'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
