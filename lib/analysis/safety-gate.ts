import { Structure } from '@/lib/analysis/market-structure';

export const MIN_QUOTE_VOLUME_SWING = 50_000_000;
export const MIN_QUOTE_VOLUME_DAYTRADE = 100_000_000;
// Backwards-compatible alias used by older call-sites/tests.
export const MIN_QUOTE_VOLUME = MIN_QUOTE_VOLUME_SWING;
export const MAX_24H_CHANGE_PCT = 15;

export interface SafetyCriterion {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface SafetyAssessment {
  score: number; // 0-100
  maxSafety: boolean; // every hard criterion passes
  grade: 'A' | 'B' | 'C' | 'D';
  criteria: SafetyCriterion[];
  passedHard: number;
  totalHard: number;
  residualRiskNote: string;
}

export interface SafetyInput {
  passedCount: number;
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  btcRegime: 'bull' | 'bear' | 'sideways';
  isBtc: boolean;
  structure: Structure;
  nearSupport: boolean;
  crowdCautious: boolean;
  quoteVolume: number;
  stopDistancePct: number;
  confirmed: boolean;
  userBrokerAvailable: boolean;
  priceChangePct24h?: number;
  mode?: 'swing' | 'daytrade';
  relStrengthVsBtc?: number | null;
  backtestEdge?: { winRatePct: number | null; expectancyPct: number } | null;
}

const RESIDUAL_RISK_NOTE =
  'Auch „sicher“ ist keine Garantie: Märkte können jederzeit drehen. Nie mehr riskieren als du verlieren kannst, und den Stop immer setzen.';

// Layers the strictest safety criteria on top of the normal signal gate. A setup
// only counts as a "safe buy" when ALL hard criteria pass. The backtest edge is a
// bonus that nudges the score but never decides maxSafety. Pure + testable.
export function evaluateSafety(input: SafetyInput): SafetyAssessment {
  const btcOk = input.isBtc || input.btcRegime !== 'bear';
  const stopOk = input.stopDistancePct >= 1 && input.stopDistancePct <= 6;
  const liquidityFloor = input.mode === 'daytrade' ? MIN_QUOTE_VOLUME_DAYTRADE : MIN_QUOTE_VOLUME_SWING;
  const pumpPct = input.priceChangePct24h ?? 0;
  const notPumped = pumpPct <= MAX_24H_CHANGE_PCT;

  const hard: SafetyCriterion[] = [
    {
      id: 'confluence-9',
      label: 'Sehr hohe Konfluenz (≥9/12)',
      passed: input.passedCount >= 9,
      detail: input.passedCount >= 9 ? `${input.passedCount}/12 Bestätigungen` : `nur ${input.passedCount}/12 — zu wenig für „sicher“`
    },
    {
      id: 'mood-ok',
      label: 'Markt nicht im Abverkauf',
      passed: input.marketMood !== 'risk-off',
      detail: input.marketMood !== 'risk-off' ? 'breiter Markt nicht risk-off' : 'breiter Markt fällt (risk-off)'
    },
    {
      id: 'btc-ok',
      label: 'Bitcoin nicht bärisch',
      passed: btcOk,
      detail: btcOk ? 'Leitmarkt stützt' : 'BTC bärisch — gegen den Leitmarkt riskant'
    },
    {
      id: 'structure-uptrend',
      label: 'Aufwärtsstruktur',
      passed: input.structure === 'uptrend',
      detail: input.structure === 'uptrend' ? 'höhere Hochs & Tiefs' : `Struktur: ${input.structure === 'downtrend' ? 'abwärts' : 'seitwärts'}`
    },
    {
      id: 'near-support',
      label: 'Nahe Unterstützung (kein Nachjagen)',
      passed: input.nearSupport,
      detail: input.nearSupport ? 'Einstieg nahe Unterstützung' : 'Kurs zu weit von der Unterstützung — Gefahr, dem Move hinterherzulaufen'
    },
    {
      id: 'crowd-calm',
      label: 'Keine Euphorie',
      passed: !input.crowdCautious,
      detail: input.crowdCautious ? 'extreme Gier / überfüllte Long-Seite' : 'Stimmung nicht überhitzt'
    },
    {
      id: 'liquidity',
      label: 'Hohe Liquidität',
      passed: input.quoteVolume >= liquidityFloor,
      detail: input.quoteVolume >= liquidityFloor
        ? `genug Handelsvolumen (≥${Math.round(liquidityFloor / 1_000_000)} Mio.)`
        : `zu wenig Volumen (<${Math.round(liquidityFloor / 1_000_000)} Mio., ${input.mode === 'daytrade' ? 'Daytrading' : 'Swing'}) — illiquide und riskant`
    },
    {
      id: 'not-overextended',
      label: 'Nicht überdehnt (24h)',
      passed: notPumped,
      detail: notPumped
        ? `24h-Bewegung ${pumpPct >= 0 ? '+' : ''}${pumpPct.toFixed(1)}% — kein FOMO-Sprung`
        : `schon ${pumpPct >= 0 ? '+' : ''}${pumpPct.toFixed(1)}% in 24h — Pump, nicht hinterherjagen`
    },
    {
      id: 'stop-band',
      label: 'Vernünftiger Stop-Abstand',
      passed: stopOk,
      detail: stopOk
        ? `Stop ${input.stopDistancePct.toFixed(1)}% entfernt`
        : `Stop-Abstand ${input.stopDistancePct.toFixed(1)}% — ${input.stopDistancePct < 1 ? 'zu eng (Whipsaw-Gefahr)' : 'zu weit (zu viel Risiko)'}`
    },
    {
      id: 'confirmation',
      label: 'Mehrfach-Bestätigung',
      passed: input.confirmed,
      detail: input.confirmed ? 'Momentum hält über mehrere Kerzen an' : 'kein bestätigter Aufwärts-Schub — möglicher Ein-Kerzen-Fehlausbruch'
    },
    {
      id: 'broker-available',
      label: 'Bei deinem Broker handelbar',
      passed: input.userBrokerAvailable,
      detail: input.userBrokerAvailable ? 'auf Coinbase oder Scalable Capital verfügbar' : 'nicht bei Coinbase/Scalable — nur über andere Börsen handelbar'
    }
  ];

  const passedHard = hard.filter((c) => c.passed).length;
  const totalHard = hard.length;
  const maxSafety = passedHard === totalHard;

  const edge = input.backtestEdge;
  const hasEdgeData = !!edge && edge.winRatePct !== null;
  const edgePassed = hasEdgeData && (edge!.winRatePct as number) >= 50;

  const rel = input.relStrengthVsBtc;
  const hasRelData = typeof rel === 'number' && Number.isFinite(rel);
  const relPassed = hasRelData && (rel as number) >= 0;

  const criteria: SafetyCriterion[] = [...hard];
  if (hasEdgeData) {
    criteria.push({
      id: 'backtest-edge',
      label: 'Historischer Edge (Backtest)',
      passed: edgePassed,
      detail: `${edge!.winRatePct}% Trefferquote im Backtest${edgePassed ? '' : ' — unter 50%'}`
    });
  }
  if (hasRelData) {
    const r = rel as number;
    criteria.push({
      id: 'rel-strength',
      label: 'Relative Stärke ggü. Bitcoin',
      passed: relPassed,
      detail: relPassed
        ? `läuft ${r >= 0 ? '+' : ''}${r.toFixed(1)}% besser als BTC (24h) — echte Nachfrage`
        : `läuft ${r.toFixed(1)}% schwächer als BTC (24h) — wahrscheinlich nur Mitläufer`
    });
  }

  const base = (passedHard / totalHard) * 100;
  const bonus = (edgePassed ? 5 : 0) + (relPassed ? 5 : 0);
  const score = Math.min(100, Math.round(base + bonus));

  const grade: SafetyAssessment['grade'] =
    maxSafety ? 'A' : passedHard >= totalHard - 1 ? 'B' : passedHard >= totalHard - 3 ? 'C' : 'D';

  return { score, maxSafety, grade, criteria, passedHard, totalHard, residualRiskNote: RESIDUAL_RISK_NOTE };
}
