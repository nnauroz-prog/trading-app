'use client';

// Client-Wrapper um den SportPrecisionDesk, der den Signal-Modus aus
// localStorage zieht und an die Karten weitergibt. So bleibt der Desk
// selbst server-render-faehig, aber der Modus wirkt sofort ohne reload.

import { useEffect, useState } from 'react';
import { SportPrecisionDesk } from '@/components/sport/sport-precision-desk';
import { SportSignalModeToggle } from '@/components/sport/sport-signal-mode-toggle';
import {
  loadSignalMode,
  SPORT_SIGNAL_MODE_CHANGED_EVENT
} from '@/lib/sport/sport-signal-mode-store';
import { tipicoStatus } from '@/lib/sport/odds-providers/tipico-odds';
import type { PrecisionPickWithAgents } from '@/lib/sport/sport-precision-bridge';
import type { CalibrationLabel } from '@/lib/sport/sport-calibration';
import type { SportRiskMode, SportSignal, ValueLabel } from '@/lib/sport/sport-odds-value';
import { applyOddsRiskAdjustment } from '@/lib/sport/sport-odds-value';

interface Props {
  picks: PrecisionPickWithAgents[];
  calibrationLabel: CalibrationLabel;
  dataCoveragePct: number;
  title?: string;
}

function computeSignalCounts(picks: PrecisionPickWithAgents[], riskMode: SportRiskMode) {
  const counts: Record<SportSignal, number> = {
    FREIGABE: 0,
    BEOBACHTEN: 0,
    HIGH_RISK: 0,
    NICHT_VERWENDEN: 0
  };
  let bestValue: { label: string; signal: SportSignal; valueLabel: ValueLabel; edge: number | null } | null = null;
  for (const p of picks) {
    if (!p.oddsContext) {
      counts[p.verdict === 'NICHT_VERWENDEN' ? 'NICHT_VERWENDEN' : p.verdict === 'BEOBACHTEN' ? 'BEOBACHTEN' : 'FREIGABE'] += 1;
      continue;
    }
    const r = applyOddsRiskAdjustment({
      modelProbability: p.oddsContext.modelProbability,
      displayProbability: p.displayProbability,
      decimalOdds: null, // Provider liefert keine Quoten -> Tipico-Stub
      marketType: p.marketType,
      dataConfidence: p.oddsContext.dataConfidence,
      qualityScore: p.oddsContext.qualityScore,
      marketStability: p.oddsContext.marketStability,
      modelDisagreement: p.oddsContext.modelDisagreement,
      calibrationLabel: p.calibrationLabel,
      baseVerdict: p.verdict,
      hasOfficialFixture: p.oddsContext.hasOfficialFixture,
      isTbdTeam: p.oddsContext.isTbdTeam,
      isPairingVerified: p.oddsContext.isPairingVerified,
      sourceCompleteness: p.oddsContext.sourceCompleteness,
      hasHardBlocker: p.blockers.length > 0,
      riskMode
    });
    counts[r.adjustedSignal] += 1;
    if (r.valueLabel === 'VALUE' && r.valueEdge !== null) {
      if (!bestValue || r.valueEdge > (bestValue.edge ?? -Infinity)) {
        bestValue = {
          label: `${p.homeTeam} – ${p.awayTeam} (${p.marketType})`,
          signal: r.adjustedSignal,
          valueLabel: r.valueLabel,
          edge: r.valueEdge
        };
      }
    }
  }
  return { counts, bestValue };
}

function reorderForMode(picks: PrecisionPickWithAgents[], riskMode: SportRiskMode): PrecisionPickWithAgents[] {
  if (riskMode === 'PRECISION') {
    // PRECISION zeigt nur sehr strenge Modell-Freigaben oben — wir
    // legen NICHT_VERWENDEN strikt nach hinten und HIGH_RISK wird
    // unten dargestellt (in Precision-Mode quasi unsichtbar weil leer).
    return [...picks].sort((a, b) => {
      const rank = (p: PrecisionPickWithAgents) => p.verdict === 'FREIGABE' ? 0 : p.verdict === 'BEOBACHTEN' ? 1 : 2;
      return rank(a) - rank(b);
    });
  }
  return picks;
}

export function SportPrecisionDeskClient({ picks, calibrationLabel, dataCoveragePct, title }: Props) {
  const [mode, setMode] = useState<SportRiskMode>('PRECISION');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(loadSignalMode());
    setMounted(true);
    const sync = () => setMode(loadSignalMode());
    window.addEventListener(SPORT_SIGNAL_MODE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_SIGNAL_MODE_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) {
    return <SportPrecisionDesk picks={picks} calibrationLabel={calibrationLabel} dataCoveragePct={dataCoveragePct} title={title} />;
  }

  const { counts, bestValue } = computeSignalCounts(picks, mode);
  const orderedPicks = reorderForMode(picks, mode);

  const tipico = tipicoStatus();
  const tipicoHint = tipico === 'NOT_AVAILABLE'
    ? 'Tipico-Quoten aktuell nicht angebunden. Manuelle Quote moeglich.'
    : null;

  return (
    <div className="space-y-3">
      <SportSignalModeToggle />
      <section className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-700 bg-slate-950/40 p-3 sm:grid-cols-5" aria-label="Signal-Uebersicht">
        <SignalCounter label="Freigabe" value={counts.FREIGABE} tone="border-emerald-400/50 bg-emerald-500/10 text-emerald-100" />
        <SignalCounter label="Beobachten" value={counts.BEOBACHTEN} tone="border-amber-400/40 bg-amber-500/10 text-amber-100" />
        <SignalCounter label="High Risk" value={counts.HIGH_RISK} tone="border-rose-400/40 bg-rose-500/10 text-rose-100" />
        <SignalCounter label="Nicht verwenden" value={counts.NICHT_VERWENDEN} tone="border-slate-700 bg-slate-900/60 text-slate-300" />
        <div className="col-span-2 rounded border border-slate-800 bg-slate-950/50 p-2 sm:col-span-1">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Bester Value-Pick</div>
          {bestValue ? (
            <>
              <div className="text-[10.5px] font-bold text-emerald-200 truncate">{bestValue.label}</div>
              <div className="text-[9.5px] text-slate-400">Edge {bestValue.edge?.toFixed(1)} ppt · {bestValue.signal}</div>
            </>
          ) : (
            <div className="text-[10.5px] text-slate-500">— kein Value-Signal —</div>
          )}
        </div>
      </section>
      <SportPrecisionDesk
        picks={orderedPicks}
        calibrationLabel={calibrationLabel}
        dataCoveragePct={dataCoveragePct}
        title={title}
        riskMode={mode}
        providerStatusHint={tipicoHint}
      />
    </div>
  );
}

function SignalCounter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded border px-2 py-1.5 ${tone}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="font-mono text-base font-bold">{value}</div>
    </div>
  );
}
