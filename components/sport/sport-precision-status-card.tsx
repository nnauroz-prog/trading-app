// Sport Precision Desk — Status-Karte (Header).
//
// Zeigt den Gesamtstatus FREIGABE | BEOBACHTEN | NICHT VERWENDEN gross,
// darunter die Eckdaten: geprueft, freigegeben, beobachtet, blockiert,
// wichtigster Blocker, Datenabdeckung, Kalibrierungsstatus.
//
// Bewusst nur neutrale Modell-Sprache — keine Freigabe-Versprechen.

import type { CalibrationLabel } from '@/lib/sport/sport-calibration';
import type { PrecisionVerdict } from '@/lib/sport/sport-precision-gate';

interface Props {
  overallVerdict: PrecisionVerdict;
  matchesEvaluated: number;
  freigabeCount: number;
  beobachtenCount: number;
  blockedCount: number;
  topBlocker: string | null;
  dataCoveragePct: number; // 0..100
  calibrationLabel: CalibrationLabel;
  title?: string;
}

const VERDICT_LABEL: Record<PrecisionVerdict, string> = {
  FREIGABE: 'FREIGABE',
  BEOBACHTEN: 'BEOBACHTEN',
  NICHT_VERWENDEN: 'NICHT VERWENDEN'
};

const VERDICT_CLASS: Record<PrecisionVerdict, string> = {
  FREIGABE: 'border-emerald-400/60 bg-emerald-950/30 text-emerald-100',
  BEOBACHTEN: 'border-amber-400/50 bg-amber-950/20 text-amber-100',
  NICHT_VERWENDEN: 'border-rose-400/50 bg-rose-950/20 text-rose-100'
};

const VERDICT_DESCRIPTION: Record<PrecisionVerdict, string> = {
  FREIGABE: 'Mindestens ein Pick erfuellt heute alle Pflichtkriterien — Modell-Freigabe vorhanden.',
  BEOBACHTEN: 'Tendenz vorhanden, aber Datenqualitaet, Kalibrierung oder Marktstabilitaet reichen noch nicht fuer eine Freigabe.',
  NICHT_VERWENDEN: 'Heute liegt kein Pick stark genug. Datenluecken oder Kalibrierungs-Bedenken blockieren die Freigabe — Cash bleibt eine Position.'
};

const CALIBRATION_LABEL_DE: Record<CalibrationLabel, string> = {
  KALIBRIERT: 'Kalibriert',
  UNKLAR: 'Unklar (zu wenig Historie)',
  UEBERSCHAETZT: 'Ueberschaetzt (Historie unter Erwartung)'
};

const CALIBRATION_TONE: Record<CalibrationLabel, string> = {
  KALIBRIERT: 'text-emerald-300',
  UNKLAR: 'text-slate-300',
  UEBERSCHAETZT: 'text-rose-300'
};

export function SportPrecisionStatusCard(props: Props) {
  return (
    <section className={`space-y-3 rounded-2xl border-2 p-4 ${VERDICT_CLASS[props.overallVerdict]}`} aria-label="Sport Precision Desk Status">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">{props.title ?? 'Sport Precision Desk'}</span>
        <span className="text-[10px] opacity-60">strenger Modell-Filter</span>
      </div>
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{VERDICT_LABEL[props.overallVerdict]}</h2>
      </div>
      <p className="text-[12px] leading-snug opacity-90">{VERDICT_DESCRIPTION[props.overallVerdict]}</p>

      <ul className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <li className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
          <div className="text-[9px] uppercase tracking-wider opacity-60">geprueft</div>
          <div className="font-mono text-lg font-bold">{props.matchesEvaluated}</div>
        </li>
        <li className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2">
          <div className="text-[9px] uppercase tracking-wider text-emerald-300/80">freigegeben</div>
          <div className="font-mono text-lg font-bold text-emerald-200">{props.freigabeCount}</div>
        </li>
        <li className="rounded border border-amber-500/30 bg-amber-950/15 p-2">
          <div className="text-[9px] uppercase tracking-wider text-amber-300/80">beobachten</div>
          <div className="font-mono text-lg font-bold text-amber-200">{props.beobachtenCount}</div>
        </li>
        <li className="rounded border border-rose-500/30 bg-rose-950/15 p-2">
          <div className="text-[9px] uppercase tracking-wider text-rose-300/80">blockiert</div>
          <div className="font-mono text-lg font-bold text-rose-200">{props.blockedCount}</div>
        </li>
      </ul>

      <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-3">
        <div className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
          <div className="text-[9px] uppercase tracking-wider opacity-60">Datenabdeckung</div>
          <div className="font-mono font-bold">{props.dataCoveragePct} %</div>
        </div>
        <div className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
          <div className="text-[9px] uppercase tracking-wider opacity-60">Kalibrierung</div>
          <div className={`font-semibold ${CALIBRATION_TONE[props.calibrationLabel]}`}>{CALIBRATION_LABEL_DE[props.calibrationLabel]}</div>
        </div>
        <div className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
          <div className="text-[9px] uppercase tracking-wider opacity-60">Wichtigster Blocker</div>
          <div className="truncate text-[11px] font-medium">{props.topBlocker ?? '—'}</div>
        </div>
      </div>
    </section>
  );
}
