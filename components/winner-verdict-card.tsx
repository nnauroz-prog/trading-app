// Klare Gewinner-Karte pro Spiel: zeigt prominent „Voraussichtlich gewinnt:
// X" mit Wahrscheinlichkeit, plus reguläre Spielzeit (90 Min) und —
// wenn der User es als KO-Spiel markiert — die Verlängerungs-Sicht.

import type { WinnerVerdict } from '@/lib/sport/winner-verdict';

interface Props {
  verdict: WinnerVerdict;
  homeTeam: string;
  awayTeam: string;
  showExtraTime?: boolean;     // true für KO-Spiele (Finale, Halbfinale)
  compact?: boolean;           // schmalere Version für Listen-Items
}

const CLARITY_COLOR: Record<WinnerVerdict['clarity'], string> = {
  strong: 'border-emerald-400/60 bg-emerald-950/30 text-emerald-100',
  leaning: 'border-sky-400/40 bg-sky-950/20 text-sky-100',
  open: 'border-amber-500/40 bg-amber-950/15 text-amber-100'
};

const CLARITY_LABEL: Record<WinnerVerdict['clarity'], string> = {
  strong: 'Modell-Freigabe',
  leaning: 'leichter Favorit',
  open: 'offen — eher nicht tippen'
};

export function WinnerVerdictCard({ verdict, homeTeam, awayTeam, showExtraTime = false, compact = false }: Props) {
  const cls = CLARITY_COLOR[verdict.clarity];
  const headline = verdict.winner === 'draw'
    ? 'Reguläre Spielzeit: Remis'
    : verdict.winner === 'undecided'
      ? 'Kein klarer Favorit'
      : `Voraussichtlich gewinnt: ${verdict.winnerName}`;

  if (compact) {
    return (
      <div className={`rounded-md border px-2 py-1.5 text-[11px] ${cls}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{headline}</span>
          <span className="font-mono text-[10px] opacity-80">{verdict.confidencePct} %</span>
        </div>
      </div>
    );
  }

  return (
    <section className={`space-y-2 rounded-lg border-2 p-3 ${cls}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">Gewinner-Prognose</div>
          <div className="text-base font-bold leading-tight">{headline}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold leading-none">{verdict.confidencePct}<span className="text-xs opacity-60">%</span></div>
          <div className="text-[9.5px] uppercase tracking-wider opacity-70">{CLARITY_LABEL[verdict.clarity]}</div>
        </div>
      </div>

      <div className="rounded-md border border-current/15 bg-black/15 p-2 text-[11px]">
        <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider opacity-70">
          Reguläre Spielzeit
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className={`rounded border px-1.5 py-1 ${verdict.winner === 'home' ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
            <div className="truncate text-[10px]" title={homeTeam}>{homeTeam}</div>
            <div className="font-mono text-sm">{verdict.regular.homePct} %</div>
          </div>
          <div className={`rounded border px-1.5 py-1 ${verdict.winner === 'draw' ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
            <div className="text-[10px]">Remis</div>
            <div className="font-mono text-sm">{verdict.regular.drawPct} %</div>
          </div>
          <div className={`rounded border px-1.5 py-1 ${verdict.winner === 'away' ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
            <div className="truncate text-[10px]" title={awayTeam}>{awayTeam}</div>
            <div className="font-mono text-sm">{verdict.regular.awayPct} %</div>
          </div>
        </div>
      </div>

      {showExtraTime && (
        <div className="rounded-md border border-current/15 bg-black/15 p-2 text-[11px]">
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider opacity-70">
            inklusive Verlängerung / Elfmeter (kein Remis möglich)
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className={`rounded border px-1.5 py-1 ${verdict.withExtraTime.homePct > verdict.withExtraTime.awayPct ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
              <div className="truncate text-[10px]">{homeTeam} weiter</div>
              <div className="font-mono text-sm">{verdict.withExtraTime.homePct} %</div>
            </div>
            <div className={`rounded border px-1.5 py-1 ${verdict.withExtraTime.awayPct > verdict.withExtraTime.homePct ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
              <div className="truncate text-[10px]">{awayTeam} weiter</div>
              <div className="font-mono text-sm">{verdict.withExtraTime.awayPct} %</div>
            </div>
          </div>
        </div>
      )}

      {verdict.reasoning.length > 0 && (
        <ul className="space-y-0.5 text-[10.5px] leading-snug opacity-85">
          {verdict.reasoning.map((r, i) => (
            <li key={i}>· {r}</li>
          ))}
        </ul>
      )}

      <p className="text-[9.5px] leading-snug opacity-65">
        Prognose, keine Garantie. {verdict.clarity === 'open' && 'Bei „offen" ist überspringen die ehrliche Antwort.'}
      </p>
    </section>
  );
}
