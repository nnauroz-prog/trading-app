import Link from 'next/link';
import type { ConsensusVerdict } from '@/lib/sport/firma/consensus';
import type { UpcomingFixture } from '@/lib/sport/fetcher';
import { FirmaVotesCard } from '@/components/firma-votes-card';
import { FairOddsLine } from '@/components/fair-odds-line';

interface EnrichedPick {
  verdict: ConsensusVerdict;
  fixture: UpcomingFixture;
  leagueName: string;
}

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

const GRADE_STYLE: Record<ConsensusVerdict['grade'], string> = {
  'A+': 'border-emerald-300 bg-emerald-500/20 text-emerald-100',
  A: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200',
  B: 'border-sky-400/50 bg-sky-500/10 text-sky-200',
  C: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  D: 'border-slate-700 bg-slate-900/40 text-slate-300'
};

export function ConsensusPicks({ picks }: { picks: EnrichedPick[] }) {
  const aPlus = picks.filter((p) => p.verdict.grade === 'A+');
  const a = picks.filter((p) => p.verdict.grade === 'A');
  const topPicks = [...aPlus, ...a];

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-300/60 bg-slate-900/70 p-4">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">Maximal-Sicherheits-Picks</div>
        <h2 className="text-xl font-bold tracking-tight text-white">Wenn 5 Analyse-Schichten dasselbe sagen</h2>
        <p className="text-[11px] leading-snug text-slate-400">
          Profi-Methode: Poisson-Modell + Form letzte 5 + Direktvergleich aus 3 Saisons + Heim-Stadion-Faktor + Tor-Konstanz des Favoriten. Nur Begegnungen, bei denen mindestens 4 von 5 Schichten in dieselbe Richtung zeigen, landen hier. <span className="font-semibold text-amber-300">90 % Sicherheit auf ein Einzelspiel sind seriös nicht möglich</span> — wir holen das Maximum raus, ohne dir was vorzulügen.
        </p>
      </header>

      {topPicks.length === 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-3 text-[11.5px] leading-snug text-amber-100/90">
          Aktuell schafft kein einziges Spiel den Konsens-Filter. Genau so soll es sein, wenn die Datenlage uneindeutig ist — keine vorgegaukelte Klarheit, kein Bauern-Tipp. Schau morgen wieder rein.
        </p>
      ) : (
        <ul className="space-y-2">
          {topPicks.map(({ verdict, fixture, leagueName }) => (
            <li key={fixture.id} className="space-y-1.5 rounded-xl border-2 border-emerald-400/40 bg-emerald-950/15 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-md border-2 px-2 py-0.5 text-[11px] font-bold ${GRADE_STYLE[verdict.grade]}`}>
                    {verdict.grade}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-300">{verdict.consensusScore}/100 Konsens</span>
                  <span className="text-[10px] text-slate-500">· {verdict.signalsAgree}/{verdict.signalsTotal} Signale</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">{fmtDay(fixture.date)} · {leagueName}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                <Link href={`/sport/team/${encodeURIComponent(fixture.homeTeam)}`} className="text-right text-[13px] font-semibold text-slate-100 hover:text-emerald-300">{fixture.homeTeam}</Link>
                <div className="rounded-md border-2 border-emerald-300/60 bg-emerald-500/20 px-3 py-1">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-300">wahrscheinlichst</div>
                  <div className="font-mono text-lg font-bold text-emerald-100">
                    {fixture.prediction ? `${fixture.prediction.likelyScore.home} : ${fixture.prediction.likelyScore.away}` : '? : ?'}
                  </div>
                </div>
                <Link href={`/sport/team/${encodeURIComponent(fixture.awayTeam)}`} className="text-left text-[13px] font-semibold text-slate-100 hover:text-emerald-300">{fixture.awayTeam}</Link>
              </div>

              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-2">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Tipp: <span className="font-semibold text-emerald-300">{verdict.pickPlain}</span></div>
                <ul className="mt-1 space-y-0.5">
                  {verdict.signals.map((s) => (
                    <li key={s.id} className="grid grid-cols-[auto_1fr_auto] gap-1.5 text-[10px]">
                      <span className={s.side === verdict.pickSide ? 'text-emerald-400' : 'text-slate-600'}>{s.side === verdict.pickSide ? '✓' : '○'}</span>
                      <span className="text-slate-300">{s.label}</span>
                      <span className="text-slate-500">{s.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[10px] leading-snug text-slate-500">{verdict.honestNote}</p>
              {fixture.prediction && (
                <FairOddsLine
                  pHome={fixture.prediction.pHome}
                  pDraw={fixture.prediction.pDraw}
                  pAway={fixture.prediction.pAway}
                  homeTeam={fixture.homeTeam}
                  awayTeam={fixture.awayTeam}
                />
              )}
              {verdict.firmaVotes && (
                <FirmaVotesCard fixture={fixture} voteResult={verdict.firmaVotes} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
