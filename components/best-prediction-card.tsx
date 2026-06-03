// „Beste Prognose heute" — die Top-Karte ganz oben.
// Wählt aus allen anstehenden Spielen das mit dem höchsten Quality-Score, zeigt
// Spiel, Liga, Anstoß, Prognose-Markt, Wahrscheinlichkeit, Confidence, Datenqualität,
// Begründung + Risiko-Hinweis. Kein „sicher", kein „garantiert".

import type { RankedPrediction } from '@/lib/sport/quality-ranking';
import { TipSaveButton } from '@/components/tip-save-button';
import { CustomTipInput } from '@/components/custom-tip-input';

interface Props {
  ranked: RankedPrediction[];
  todayIso: string;
}

function fmtTime(date: string, time: string | null): string {
  if (!time) return '—';
  const d = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

const BAND_COLORS: Record<string, string> = {
  sehr_stark: 'border-emerald-400/50 bg-emerald-950/30 text-emerald-200',
  stark: 'border-sky-400/40 bg-sky-950/20 text-sky-200',
  brauchbar: 'border-amber-400/40 bg-amber-950/20 text-amber-100',
  orientierung: 'border-slate-700 bg-slate-900/40 text-slate-300',
  nicht_verwenden: 'border-rose-500/40 bg-rose-950/20 text-rose-200'
};

const DATA_QUALITY_LABEL: Record<string, string> = {
  good: 'gute Datenbasis',
  medium: 'mittlere Datenbasis',
  weak: 'wenig Daten'
};

const CONFIDENCE_LABEL: Record<string, string> = {
  klar: 'klare Tendenz',
  leicht: 'leichte Tendenz',
  offen: 'offene Partie'
};

export function BestPredictionCard({ ranked, todayIso }: Props) {
  // Bevorzugt das beste heute spielende Match, sonst das beste überhaupt.
  const todayPicks = ranked.filter((r) => r.fixture.date === todayIso);
  const top = todayPicks[0] ?? ranked[0] ?? null;
  if (!top) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Beste Prognose</div>
        <p className="mt-2 text-[12px] leading-snug text-slate-400">
          Aktuell keine Prognose verfügbar — Spielplan-Daten oder Form-Pool sind leer.
        </p>
      </section>
    );
  }

  const { fixture, leagueName, leagueCountry, quality } = top;
  const { recommendation, score, band, bandLabel, parts, warnings } = quality;
  const colorClass = BAND_COLORS[band] ?? BAND_COLORS.orientierung;
  const dataQuality = fixture.probabilities?.dataQuality ?? 'weak';
  const dqLabel = DATA_QUALITY_LABEL[dataQuality];
  const confidence = fixture.prediction?.pickLabel ?? 'offen';
  const confLabel = CONFIDENCE_LABEL[confidence];
  const isToday = fixture.date === todayIso;

  return (
    <section className={`rounded-2xl border p-4 ${colorClass}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em]">
          Beste Prognose {isToday ? 'heute' : ''}
        </div>
        <div className="text-[10px] uppercase tracking-wider opacity-80">{bandLabel}</div>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold leading-tight sm:text-xl">
          {fixture.homeTeam} <span className="opacity-60">–</span> {fixture.awayTeam}
        </h2>
        <div className="font-mono text-2xl font-bold leading-none">{score}<span className="text-xs opacity-60">/100</span></div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-80">
        <span>{leagueName} <span className="opacity-60">· {leagueCountry}</span></span>
        <span className="font-mono">{fmtDate(fixture.date)} {fmtTime(fixture.date, fixture.time)}</span>
      </div>

      <div className="mt-3 rounded-lg border border-current/20 bg-black/20 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Prognose</div>
          <div className="font-mono text-[11px] opacity-80">{Math.round(recommendation.probability * 100)} %</div>
        </div>
        <div className="mt-0.5 text-base font-semibold">{recommendation.label}</div>
        <p className="mt-1 text-[11.5px] leading-snug opacity-85">{recommendation.rationale}</p>
        <div className="mt-2">
          <TipSaveButton
            fixtureId={fixture.id}
            fixtureDate={fixture.date}
            league={leagueName}
            homeTeam={fixture.homeTeam}
            awayTeam={fixture.awayTeam}
            tier="custom"
            market={recommendation.label}
            modelProbabilityPct={Math.round(recommendation.probability * 100)}
            qualityScore={score}
            qualityBand={band}
            dataQuality={dataQuality}
            isStableMarket={recommendation.isStableMarket}
          />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div className="rounded-md border border-current/15 bg-black/15 p-2">
          <dt className="text-[9px] uppercase tracking-wider opacity-70">Modell-Wahrsch.</dt>
          <dd className="mt-0.5 font-mono font-semibold">{parts.probability}<span className="opacity-60">/45</span></dd>
        </div>
        <div className="rounded-md border border-current/15 bg-black/15 p-2">
          <dt className="text-[9px] uppercase tracking-wider opacity-70">Confidence</dt>
          <dd className="mt-0.5 font-semibold">{confLabel}</dd>
        </div>
        <div className="rounded-md border border-current/15 bg-black/15 p-2">
          <dt className="text-[9px] uppercase tracking-wider opacity-70">Datenqualität</dt>
          <dd className="mt-0.5 font-semibold">{dqLabel}</dd>
        </div>
        <div className="rounded-md border border-current/15 bg-black/15 p-2">
          <dt className="text-[9px] uppercase tracking-wider opacity-70">Markt</dt>
          <dd className="mt-0.5 font-semibold">{recommendation.isStableMarket ? 'stabil' : 'eng / 1X2'}</dd>
        </div>
      </dl>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-[10.5px] leading-snug opacity-85">
          {warnings.map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      )}

      {fixture.prediction && (
        <div className="mt-3">
          <CustomTipInput
            fixtureId={fixture.id}
            fixtureDate={fixture.date}
            league={leagueName}
            homeTeam={fixture.homeTeam}
            awayTeam={fixture.awayTeam}
            modelHomeProbability={fixture.prediction.pHome}
            modelDrawProbability={fixture.prediction.pDraw}
            modelAwayProbability={fixture.prediction.pAway}
            qualityScore={score}
            qualityBand={band}
            dataQuality={dataQuality}
          />
        </div>
      )}

      <p className="mt-3 text-[10px] leading-snug opacity-70">
        Hinweis: Prognose, keine Garantie. Spiele bleiben ergebnis-offen — auch ein Score von 100 ist kein Versprechen.
      </p>
    </section>
  );
}
