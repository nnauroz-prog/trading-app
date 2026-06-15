import type { FirmaVoteResult } from '@/lib/sport/firma/employee-votes';
import type { UpcomingFixture } from '@/lib/sport/fetcher';

interface Props {
  fixture: UpcomingFixture;
  voteResult: FirmaVoteResult;
}

function sideLabel(side: 'home' | 'away' | 'draw' | 'unklar' | 'abstain', fixture: UpcomingFixture): string {
  if (side === 'home') return `${fixture.homeTeam} gewinnt`;
  if (side === 'away') return `${fixture.awayTeam} gewinnt`;
  if (side === 'draw') return 'Remis';
  if (side === 'unklar') return 'Uneinig';
  return 'Enthaltung';
}

function sideColor(side: 'home' | 'away' | 'draw' | 'abstain'): string {
  if (side === 'home') return 'text-emerald-300';
  if (side === 'away') return 'text-sky-300';
  if (side === 'draw') return 'text-amber-300';
  return 'text-slate-500';
}

function skillMultiplier(hr: number | undefined): number {
  if (hr === undefined) return 1;
  return Math.max(0.1, Math.min(2.0, 1 + (hr - 50) / 25));
}

function influenceScore(v: { confidence: number; hitRatePct?: number }): number {
  return v.confidence * skillMultiplier(v.hitRatePct);
}

export function FirmaVotesCard({ fixture, voteResult }: Props) {
  const active = voteResult.votes.filter((v) => v.side !== 'abstain');
  const abstain = voteResult.votes.filter((v) => v.side === 'abstain');
  // Sortiert nach echtem Einfluss (Konfidenz × Skill-Multiplier), nicht nur
  // nach roher Konfidenz. Wer historisch besser ist UND klar votet, steht oben.
  const topActive = [...active].sort((a, b) => influenceScore(b) - influenceScore(a));

  return (
    <section className="space-y-3 rounded-2xl border-2 border-sky-400/40 bg-slate-900/60 p-4">
      <header>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Firma-Abstimmung · {voteResult.totalActiveVotes} aktive Stimmen</h3>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">
          Die 100 Mitarbeiter:innen geben jede ihre eigene Stimme ab, jede mit anderer Methodik. Stimmen werden mit der historischen Trefferquote der Person gewichtet — gute Mitarbeiter zählen mehr. Die Hit-Rate-Pille rechts neben jedem Namen zeigt das Skill-Niveau.
        </p>
      </header>

      <div className="grid grid-cols-4 gap-2 text-center">
        <VoteStat label="Heim" value={voteResult.homeVotes} tone="emerald" />
        <VoteStat label="Remis" value={voteResult.drawVotes} tone="amber" />
        <VoteStat label="Auswärts" value={voteResult.awayVotes} tone="sky" />
        <VoteStat label="Enthaltung" value={voteResult.abstainVotes} tone="slate" />
      </div>

      <div className="rounded-lg border border-sky-400/40 bg-sky-500/10 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-sky-300">Konsens der Firma</div>
        <div className="font-bold text-sky-100">{sideLabel(voteResult.consensusSide, fixture)}</div>
        <div className="font-mono text-[10px] text-sky-200">
          {Math.round(voteResult.consensusWeight * 100)} % gewichtetes Vertrauen
        </div>
      </div>

      <details className="rounded-lg border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer p-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Top {topActive.length} aktive Stimmen lesen ({active.length} insgesamt aktiv)
        </summary>
        <ul className="space-y-1.5 p-2.5 pt-0">
          {topActive.map((v) => {
            const hr = v.hitRatePct;
            const hrTone = hr === undefined ? 'text-slate-600 border-slate-800' :
              hr >= 60 ? 'text-emerald-300 border-emerald-400/40' :
              hr >= 50 ? 'text-amber-300 border-amber-400/40' :
              'text-rose-300 border-rose-400/40';
            return (
              <li key={v.employeeId} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 rounded border border-slate-800 bg-slate-950/60 p-2 text-[11px]">
                <span className={`font-mono text-[10px] uppercase tracking-wider ${sideColor(v.side)}`}>
                  {v.side === 'home' ? '➤ Heim' : v.side === 'away' ? '➤ Ausw' : v.side === 'draw' ? '➤ Remis' : '—'}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-100">{v.employeeName}</div>
                  <div className="truncate text-[10px] text-slate-500">{v.role.split('·')[0].trim()}</div>
                  <div className="text-[10px] text-slate-300">{v.reasoning}</div>
                </div>
                <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] ${hrTone}`} title="historische Trefferquote dieses Mitarbeiters">
                  {hr === undefined ? '—' : `${hr.toFixed(0)} %`}
                </span>
                <span className="font-mono text-[10px] text-slate-400">{Math.round(v.confidence * 100)} %</span>
              </li>
            );
          })}
        </ul>
        {abstain.length > 0 && (
          <p className="border-t border-slate-800 p-2.5 pt-2 text-[10px] text-slate-500">
            Plus {abstain.length} Enthaltungen — Mitarbeiter:innen, deren Spezialgebiet (z. B. Transfer-Markt, Politik, falsche Liga) zu diesem Spiel keine Aussage liefert.
          </p>
        )}
      </details>
    </section>
  );
}

function VoteStat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'sky' | 'slate' }) {
  const colors = {
    emerald: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
    amber: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
    sky: 'text-sky-300 border-sky-400/30 bg-sky-500/10',
    slate: 'text-slate-300 border-slate-700 bg-slate-900/40'
  };
  return (
    <div className={`rounded border p-1.5 ${colors[tone]}`}>
      <div className="text-[8.5px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-bold">{value}</div>
    </div>
  );
}
