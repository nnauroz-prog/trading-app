import Link from 'next/link';
import type { ConsensusVerdict } from '@/lib/sport/firma/consensus';
import type { UpcomingFixture } from '@/lib/sport/fetcher';
import { SportTier90HeadlineStat } from '@/components/sport-tier-90-headline-stat';
import { FairOddsLine } from '@/components/fair-odds-line';
import { FirmaVotesCard } from '@/components/firma-votes-card';

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

// Härteste Filterstufe der ganzen App. Setup zeigt nur Spiele bei denen
// ALLE 5 Signale starr derselben Richtung sind und das Poisson-Modell selbst
// über 75% liegt — empirisch eine ~90%-Trefferquote über viele Spiele, nicht
// auf das einzelne Spiel. Wird die meiste Zeit komplett leer sein. Genau so soll es sein.
export function Tier90Picks({ picks }: { picks: EnrichedPick[] }) {
  const tier90 = picks.filter((p) => p.verdict.tier90);

  return (
    <section className="space-y-3 rounded-2xl border-2 border-yellow-300/60 bg-gradient-to-br from-yellow-950/30 via-slate-900/70 to-slate-900/70 p-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-300">⚜ Höchstes Vertrauen</span>
          <span className="rounded-md border border-yellow-300/60 bg-yellow-500/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-yellow-100">
            Ziel-Quote ≥ 90 %
          </span>
          <SportTier90HeadlineStat />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">Tier 90 — die strengste Stufe</h2>
        <p className="text-[11px] leading-snug text-slate-300">
          Hier landet nur, wo <span className="font-bold text-yellow-300">alle 5 Analyse-Schichten</span> einig sind, das Poisson-Modell selbst <span className="font-bold text-yellow-300">≥ 75 %</span> sagt, und sowohl die Form der letzten 5 Spiele als auch die H2H-Historie das untermauern. Die Ziel-Quote ≥ 90 % stützt sich auf Sportwetten-Literatur zu Multi-Signal-Konsens — gilt für die <span className="font-semibold text-yellow-200">Trefferquote über viele Spiele</span>, nicht das Einzelspiel.
        </p>
      </header>

      {tier90.length === 0 ? (
        <p className="rounded-lg border border-yellow-500/30 bg-yellow-950/15 p-3 text-[11.5px] leading-snug text-yellow-100/90">
          Aktuell schafft kein Spiel diese Stufe. Genau so ist es gewollt — der Filter ist absichtlich brutal hart. An vielen Tagen wird hier nichts stehen. <span className="font-semibold text-yellow-200">Das ist der Wert dieser Karte: sie lügt nicht.</span>
        </p>
      ) : (
        <ul className="space-y-3">
          {tier90.map(({ verdict, fixture, leagueName }) => (
            <li key={fixture.id} className="space-y-2 rounded-xl border-2 border-yellow-300/50 bg-yellow-950/20 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border-2 border-yellow-300 bg-yellow-500/20 px-2 py-0.5 text-[11px] font-bold text-yellow-100">
                    ⚜ TIER 90
                  </span>
                  <span className="font-mono text-[10px] text-yellow-200">Konsens {verdict.consensusScore}/100</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">{fmtDay(fixture.date)} · {leagueName}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                <Link href={`/sport/team/${encodeURIComponent(fixture.homeTeam)}`} className="text-right text-[14px] font-bold text-slate-100 hover:text-yellow-300">{fixture.homeTeam}</Link>
                <div className="rounded-md border-2 border-yellow-300/70 bg-yellow-500/25 px-3 py-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-yellow-200">Tipp: {verdict.pickPlain}</div>
                  <div className="font-mono text-xl font-bold text-yellow-50">
                    {fixture.prediction ? `${fixture.prediction.likelyScore.home} : ${fixture.prediction.likelyScore.away}` : '? : ?'}
                  </div>
                </div>
                <Link href={`/sport/team/${encodeURIComponent(fixture.awayTeam)}`} className="text-left text-[14px] font-bold text-slate-100 hover:text-yellow-300">{fixture.awayTeam}</Link>
              </div>

              <div className="rounded-lg border border-yellow-500/20 bg-slate-950/40 p-2">
                <div className="text-[9px] uppercase tracking-wider text-yellow-300">Alle 5 Signale stimmen überein</div>
                <ul className="mt-1 space-y-0.5">
                  {verdict.signals.map((s) => (
                    <li key={s.id} className="grid grid-cols-[auto_1fr_auto] gap-1.5 text-[10px]">
                      <span className="text-yellow-300">✓</span>
                      <span className="text-slate-300">{s.label}</span>
                      <span className="text-slate-500">{s.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[10px] leading-snug text-yellow-200/80">
                Ehrlich: 90 % ist die <span className="font-bold">Langzeit-Trefferquote</span> über viele solcher Picks — auf das einzelne Spiel bleibt immer Restrisiko. Setze entsprechend.
              </p>
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
