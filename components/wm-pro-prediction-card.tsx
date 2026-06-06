// Profi-Prognose-Karte für WM-Spiele. Zeigt:
//   • Klare „Voraussichtlich gewinnt" Aussage
//   • 1X2 reguläre Spielzeit + Verlängerung
//   • Erwartete Tore (xG) und Tor-Märkte
//   • Top-3 wahrscheinlichste Endergebnisse
//   • ELO + Form-Index beider Teams
//   • Begründungen und Spielort-Faktoren

import type { WmMatchPrediction } from '@/lib/sport/wm-match-engine';

interface Props {
  prediction: WmMatchPrediction;
  showExtraTime?: boolean;
}

const CLARITY_COLOR: Record<string, string> = {
  strong: 'border-emerald-400/60 bg-emerald-950/30 text-emerald-100',
  leaning: 'border-sky-400/40 bg-sky-950/20 text-sky-100',
  open: 'border-amber-500/40 bg-amber-950/15 text-amber-100'
};

const CLARITY_LABEL: Record<string, string> = {
  strong: 'klarer Tipp',
  leaning: 'leichter Favorit',
  open: 'offen — eher nicht tippen'
};

export function WmProPredictionCard({ prediction, showExtraTime = false }: Props) {
  const { homeTeam, awayTeam, pick, regular, withExtraTime, expectedGoals, goalMarkets, topScorelines, reasoning, venueFactors, dataConfidence, homeElo, awayElo, eloDiff } = prediction;
  const cls = CLARITY_COLOR[pick.clarity];
  const headline = pick.winner === 'draw'
    ? 'Reguläre Spielzeit: Remis'
    : pick.winner === 'undecided'
      ? 'Kein klarer Favorit'
      : `Voraussichtlich gewinnt: ${pick.winnerName}`;

  return (
    <section className={`space-y-3 rounded-lg border-2 p-3 ${cls}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">Profi-Prognose · WM 2026</div>
          <div className="text-base font-bold leading-tight">{headline}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold leading-none">{pick.confidencePct}<span className="text-xs opacity-60">%</span></div>
          <div className="text-[9.5px] uppercase tracking-wider opacity-70">{CLARITY_LABEL[pick.clarity]}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
        <div className="rounded-md border border-current/15 bg-black/15 p-2">
          <div className="font-semibold opacity-80">{homeTeam}</div>
          <div className="font-mono opacity-70">ELO {homeElo}</div>
        </div>
        <div className="rounded-md border border-current/15 bg-black/15 p-2 text-right">
          <div className="font-semibold opacity-80">{awayTeam}</div>
          <div className="font-mono opacity-70">ELO {awayElo}</div>
        </div>
      </div>
      <div className="text-center font-mono text-[10px] opacity-70">
        Effektive ELO-Differenz: {eloDiff >= 0 ? '+' : ''}{eloDiff}
      </div>

      <div className="rounded-md border border-current/15 bg-black/15 p-2 text-[11px]">
        <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider opacity-70">Reguläre Spielzeit</div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className={`rounded border px-1.5 py-1 ${pick.winner === 'home' ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
            <div className="truncate text-[10px]">{homeTeam}</div>
            <div className="font-mono text-sm">{regular.homePct} %</div>
          </div>
          <div className={`rounded border px-1.5 py-1 ${pick.winner === 'draw' ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
            <div className="text-[10px]">Remis</div>
            <div className="font-mono text-sm">{regular.drawPct} %</div>
          </div>
          <div className={`rounded border px-1.5 py-1 ${pick.winner === 'away' ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
            <div className="truncate text-[10px]">{awayTeam}</div>
            <div className="font-mono text-sm">{regular.awayPct} %</div>
          </div>
        </div>
      </div>

      {showExtraTime && (
        <div className="rounded-md border border-current/15 bg-black/15 p-2 text-[11px]">
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider opacity-70">
            inkl. Verlängerung / Elfmeter (kein Remis möglich)
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className={`rounded border px-1.5 py-1 ${withExtraTime.homePct > withExtraTime.awayPct ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
              <div className="truncate text-[10px]">{homeTeam} weiter</div>
              <div className="font-mono text-sm">{withExtraTime.homePct} %</div>
            </div>
            <div className={`rounded border px-1.5 py-1 ${withExtraTime.awayPct > withExtraTime.homePct ? 'border-current/60 bg-black/30 font-bold' : 'border-current/10'}`}>
              <div className="truncate text-[10px]">{awayTeam} weiter</div>
              <div className="font-mono text-sm">{withExtraTime.awayPct} %</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-current/15 bg-black/15 p-2 text-[11px]">
        <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider opacity-70">Erwartete Tore (xG-Modell)</div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded border border-current/10 px-1.5 py-1">
            <div className="text-[10px] opacity-70">{homeTeam}</div>
            <div className="font-mono text-sm">{expectedGoals.home.toFixed(2)}</div>
          </div>
          <div className="rounded border border-current/10 px-1.5 py-1">
            <div className="text-[10px] opacity-70">Σ Tore</div>
            <div className="font-mono text-sm">{expectedGoals.total.toFixed(2)}</div>
          </div>
          <div className="rounded border border-current/10 px-1.5 py-1">
            <div className="text-[10px] opacity-70">{awayTeam}</div>
            <div className="font-mono text-sm">{expectedGoals.away.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-current/15 bg-black/15 p-2 text-[10.5px]">
        <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider opacity-70">Tor-Märkte</div>
        <div className="grid grid-cols-3 gap-1.5">
          <Stat label="Über 1,5" value={`${goalMarkets.over15} %`} />
          <Stat label="Über 2,5" value={`${goalMarkets.over25} %`} />
          <Stat label="Über 3,5" value={`${goalMarkets.over35} %`} />
          <Stat label="BTTS" value={`${goalMarkets.btts} %`} />
          <Stat label={`${homeTeam} zu Null`} value={`${goalMarkets.cleanSheetHome} %`} />
          <Stat label={`${awayTeam} zu Null`} value={`${goalMarkets.cleanSheetAway} %`} />
        </div>
      </div>

      {topScorelines.length > 0 && (
        <div className="rounded-md border border-current/15 bg-black/15 p-2 text-[10.5px]">
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider opacity-70">Top-3 Endergebnisse (Poisson)</div>
          <ul className="flex flex-wrap gap-1.5">
            {topScorelines.map((s, i) => (
              <li key={i} className="rounded border border-current/15 bg-black/20 px-2 py-0.5 font-mono">
                <span className="font-bold">{s.score}</span>
                <span className="ml-1 opacity-60">{s.probability.toFixed(1)} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(reasoning.length > 0 || venueFactors.length > 0) && (
        <details className="rounded-md border border-current/15 bg-black/15 p-2 text-[10px]">
          <summary className="cursor-pointer font-semibold uppercase tracking-wider opacity-70">
            ▸ Begründung im Detail
          </summary>
          <ul className="mt-1.5 space-y-0.5 leading-snug opacity-85">
            {reasoning.map((r, i) => <li key={`r${i}`}>· {r}</li>)}
            {venueFactors.map((r, i) => <li key={`v${i}`}>📍 {r}</li>)}
          </ul>
        </details>
      )}

      <p className="text-[9.5px] leading-snug opacity-65">
        Datenbasis-Sicherheit: {dataConfidence} % · Modell aus ELO + Form + xG + Spielort. Prognose, keine Garantie — auch klare Tipps können kippen.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-current/10 px-1.5 py-1">
      <div className="text-[9px] opacity-70">{label}</div>
      <div className="font-mono text-[11px] font-semibold">{value}</div>
    </div>
  );
}
