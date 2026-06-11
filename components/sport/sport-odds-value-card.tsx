'use client';

// Odds/Value-Karte fuer den Sport Precision Desk.
// Zeigt Quote (falls vorhanden), implizite Wahrscheinlichkeit,
// Modell-Wahrscheinlichkeit, Value-Edge, Expected Value, Value-Label
// und einen ehrlichen Risiko-Hinweis.
// Wenn keine Quote vorhanden ist, kann der User optional eine manuelle
// Quote eintragen. Wird NUR LOKAL berechnet, NICHT gespeichert
// (Bestaetigungs-Button kann das spaeter erweitern).

import { useMemo, useState } from 'react';
import {
  applyOddsRiskAdjustment,
  type SportOddsValueInput,
  type SportOddsValueOutput,
  type ValueLabel
} from '@/lib/sport/sport-odds-value';

interface Props {
  // Basis-Daten, die der Caller ohnehin kennt.
  input: Omit<SportOddsValueInput, 'decimalOdds'> & { decimalOdds: number | null };
  // Wenn eine echte Provider-Quote vorhanden ist, ist sie hier gesetzt.
  providerOdds: number | null;
  providerName?: string;
  providerStatusHint?: string | null;
}

function parseQuote(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 1 ? n : null;
}

const TONE_FOR_LABEL: Record<ValueLabel, string> = {
  VALUE: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  FAIR: 'border-slate-700 bg-slate-900/40 text-slate-200',
  NO_VALUE: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  DANGEROUS: 'border-amber-400/60 bg-amber-500/20 text-amber-100',
  NO_QUOTE: 'border-slate-700 bg-slate-900/40 text-slate-400'
};

const LABEL_TEXT: Record<ValueLabel, string> = {
  VALUE: 'VALUE',
  FAIR: 'FAIR',
  NO_VALUE: 'NO VALUE',
  DANGEROUS: 'DANGEROUS',
  NO_QUOTE: 'KEINE QUOTE'
};

export function SportOddsValueCard({ input, providerOdds, providerName, providerStatusHint }: Props) {
  const [manualDraft, setManualDraft] = useState('');
  const manualQuote = useMemo(() => parseQuote(manualDraft), [manualDraft]);
  const effectiveOdds = providerOdds ?? manualQuote ?? input.decimalOdds ?? null;

  const result: SportOddsValueOutput = useMemo(() => applyOddsRiskAdjustment({
    ...input,
    decimalOdds: effectiveOdds
  }), [input, effectiveOdds]);

  const fmtPct = (p: number | null) => p === null ? '—' : `${(p * 100).toFixed(1)} %`;
  const fmtEdge = (e: number | null) => e === null ? '—' : `${e >= 0 ? '+' : ''}${e.toFixed(1)} ppt`;
  const fmtEv = (ev: number | null) => ev === null ? '—' : `${ev >= 0 ? '+' : ''}${(ev * 100).toFixed(1)} %`;
  const tone = TONE_FOR_LABEL[result.valueLabel];

  return (
    <section className={`space-y-2 rounded-2xl border px-3 py-2 ${tone}`} aria-label="Odds/Value-Check">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">{LABEL_TEXT[result.valueLabel]}</span>
        {providerName && providerOdds !== null && (
          <span className="text-[9.5px] uppercase tracking-wider opacity-80">Quelle: {providerName}</span>
        )}
        {manualQuote !== null && providerOdds === null && (
          <span className="text-[9.5px] uppercase tracking-wider opacity-80">Quote manuell eingetragen</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-4">
        <div>
          <div className="text-[9.5px] uppercase tracking-wider opacity-70">Quote</div>
          <div className="font-mono font-bold">{effectiveOdds !== null ? effectiveOdds.toFixed(2) : '—'}</div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wider opacity-70">Implizit</div>
          <div className="font-mono">{fmtPct(result.impliedProbability)}</div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wider opacity-70">Modell</div>
          <div className="font-mono">{fmtPct(input.modelProbability)}</div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wider opacity-70">Edge</div>
          <div className="font-mono">{fmtEdge(result.valueEdge)}</div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wider opacity-70">Erw. Wert</div>
          <div className="font-mono">{fmtEv(result.expectedValue)}</div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wider opacity-70">Signal</div>
          <div className="font-mono font-bold">{result.adjustedSignal}</div>
        </div>
      </div>

      {result.oddsWarning && (
        <p className="text-[10px] leading-snug">⚠ {result.oddsWarning}</p>
      )}

      {/* Manuelle Quote nur, wenn keine Provider-Quote vorliegt. */}
      {providerOdds === null && (
        <div className="rounded border border-slate-700 bg-slate-950/50 p-2">
          <div className="mb-1 text-[9.5px] uppercase tracking-wider text-slate-400">
            {input.decimalOdds === null
              ? 'Keine echte Quote verfuegbar. Du kannst eine Quote manuell eintragen, um den Value-Check zu berechnen.'
              : 'Andere Quote testen (nur lokale Berechnung, nichts gespeichert).'}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <label className="text-[10px] text-slate-400">Quote manuell:</label>
            <input
              type="text"
              inputMode="decimal"
              value={manualDraft}
              onChange={(e) => setManualDraft(e.target.value)}
              placeholder="z.B. 1.85"
              className="w-20 rounded border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-center font-mono text-[12px] text-slate-100"
              aria-label="Manuelle Quote eintragen"
            />
            {providerStatusHint && (
              <span className="text-[9.5px] text-slate-500">{providerStatusHint}</span>
            )}
          </div>
        </div>
      )}

      <p className="text-[9.5px] leading-snug opacity-70">
        Risiko-Hinweis: keine Garantie auf Sport-Ergebnisse. Quoten sind nur dann verlaesslich, wenn sie von einer offiziellen Quelle stammen oder Du sie selbst eingibst. Keine automatische Wettabgabe.
      </p>
    </section>
  );
}
