// Eine Karte fuer einen einzelnen geprueften Pick — wird sowohl fuer den
// „besten Pick" oben als auch fuer die Minimal-Liste (max 5) verwendet.
//
// Wording: keine verbotenen Begriffe, nur Modell-Sprache.

import type {
  PrecisionVerdict
} from '@/lib/sport/sport-precision-gate';
import type { PrecisionPickWithAgents } from '@/lib/sport/sport-precision-bridge';
import type { SportRiskMode } from '@/lib/sport/sport-odds-value';
import { SportOddsValueCard } from '@/components/sport/sport-odds-value-card';

interface Props {
  pick: PrecisionPickWithAgents;
  // Wenn true, wird die Karte als „bester Pick" mit etwas mehr Detail
  // gerendert. Sonst kompakte Listen-Variante.
  hero?: boolean;
  // Aktueller Signal-Modus, beeinflusst den Odds/Value-Layer. Default
  // PRECISION (strenger Modus).
  riskMode?: SportRiskMode;
  // Optionale Provider-Quote (z. B. aus einem zukuenftigen offiziellen
  // Adapter). null wenn keine echte Quote verfuegbar.
  providerOdds?: number | null;
  providerName?: string;
  providerStatusHint?: string | null;
}

const VERDICT_PILL: Record<PrecisionVerdict, string> = {
  FREIGABE: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200',
  BEOBACHTEN: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
  NICHT_VERWENDEN: 'border-rose-400/50 bg-rose-500/15 text-rose-200'
};

const VERDICT_TEXT: Record<PrecisionVerdict, string> = {
  FREIGABE: 'FREIGABE',
  BEOBACHTEN: 'BEOBACHTEN',
  NICHT_VERWENDEN: 'NICHT VERWENDEN'
};

const DATA_LABEL_DE: Record<PrecisionPickWithAgents['dataLabel'], string> = {
  VOLLSTAENDIG: 'Daten vollstaendig',
  TEILWEISE: 'Daten teilweise',
  SCHWACH: 'Daten schwach'
};

const STABILITY_TEXT: Record<string, string> = {
  STRONG: 'Markt stabil',
  MEDIUM: 'Markt mittel',
  WEAK: 'Markt schwach'
};

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtTime(date: string, time: string | null): string {
  if (!time) return '';
  const d = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

export function SportPrecisionPickCard({ pick, hero = false, riskMode = 'PRECISION', providerOdds = null, providerName, providerStatusHint }: Props) {
  const displayPct = Math.round(pick.displayProbability * 100);
  const capPct = Math.round(pick.confidenceCap);
  const showCap = capPct < 100 && pick.rawProbability * 100 > pick.confidenceCap;
  const stabKey = STABILITY_TEXT[pick.riskLabel === 'LOW' ? 'STRONG' : pick.riskLabel === 'MEDIUM' ? 'MEDIUM' : 'WEAK'];

  return (
    <article className={`rounded-2xl border bg-slate-950/40 p-3 ${hero ? 'border-emerald-400/50 bg-emerald-950/15' : 'border-slate-800'}`}>
      <header className="flex flex-wrap items-baseline gap-2">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${VERDICT_PILL[pick.verdict]}`}>{VERDICT_TEXT[pick.verdict]}</span>
        <span className="font-mono text-[10px] text-slate-500">Score {pick.precisionScore}/100</span>
        <span className="text-[10px] text-slate-500">{fmtDate(pick.dateIso)}{pick.timeIso ? ` · ${fmtTime(pick.dateIso, pick.timeIso)}` : ''}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500 truncate max-w-[40%]">{pick.league}</span>
      </header>

      <div className="mt-2">
        <h3 className={`font-bold ${hero ? 'text-base text-slate-100' : 'text-[13px] text-slate-100'}`}>
          {pick.homeTeam} <span className="mx-1 text-slate-500">vs.</span> {pick.awayTeam}
        </h3>
        <div className={`mt-1 text-[12px] font-semibold ${hero ? 'text-emerald-200' : 'text-slate-200'}`}>
          → {pick.marketType}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10.5px]">
        <div className="rounded border border-slate-800 bg-slate-950/60 p-1.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Anzeige-Wahrsch.</div>
          <div className="font-mono text-base font-bold text-slate-100">{displayPct} %</div>
          {showCap && <div className="text-[9px] text-slate-500">cap {capPct} %</div>}
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-1.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Daten</div>
          <div className="text-[11px] font-semibold text-slate-200">{DATA_LABEL_DE[pick.dataLabel]}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-1.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Markt</div>
          <div className="text-[11px] font-semibold text-slate-200">{stabKey}</div>
        </div>
      </div>

      {hero && pick.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-slate-300">
          {pick.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {hero && pick.warnings.length > 0 && (
        <p className="mt-2 rounded border border-amber-500/30 bg-amber-950/15 p-1.5 text-[10.5px] text-amber-100">
          ⚠ {pick.warnings[0]}
        </p>
      )}

      {pick.verdict === 'NICHT_VERWENDEN' && pick.blockers.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[10.5px] text-rose-200">
          {pick.blockers.slice(0, 2).map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}

      {pick.oddsContext && (
        <div className="mt-2">
          <SportOddsValueCard
            matchId={pick.matchId}
            input={{
              modelProbability: pick.oddsContext.modelProbability,
              displayProbability: pick.displayProbability,
              decimalOdds: providerOdds,
              marketType: pick.marketType,
              dataConfidence: pick.oddsContext.dataConfidence,
              qualityScore: pick.oddsContext.qualityScore,
              marketStability: pick.oddsContext.marketStability,
              modelDisagreement: pick.oddsContext.modelDisagreement,
              calibrationLabel: pick.calibrationLabel,
              baseVerdict: pick.verdict,
              hasOfficialFixture: pick.oddsContext.hasOfficialFixture,
              isTbdTeam: pick.oddsContext.isTbdTeam,
              isPairingVerified: pick.oddsContext.isPairingVerified,
              sourceCompleteness: pick.oddsContext.sourceCompleteness,
              hasHardBlocker: pick.blockers.length > 0,
              riskMode
            }}
            providerOdds={providerOdds}
            providerName={providerName}
            providerStatusHint={providerStatusHint ?? (providerOdds === null ? 'Tipico-Quoten aktuell nicht angebunden. Manuelle Quote moeglich.' : null)}
          />
        </div>
      )}
    </article>
  );
}
