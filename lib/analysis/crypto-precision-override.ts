// User-Override-Adapter fuer den Krypto Precision Desk.
//
// Verbindet die User-Coin-Overrides (Veto / Conviction aus localStorage)
// mit den server-seitig berechneten Precision-Verdicts. Regeln:
//
//   1. Hard-Veto (Token-Unlock heute, Manuelles Misstrauen) kippt JEDES
//      Verdict auf NICHT_VERWENDEN — Sicherheits-Konstante, ungewichtet.
//   2. Stark negatives Score-Delta (<= -15) stuft FREIGABE auf BEOBACHTEN
//      herab — der User weiss etwas, das das Modell nicht sieht.
//   3. Positives Delta (Conviction) kann NIE auf FREIGABE hochstufen.
//      Die Pflicht-Kriterien des Modells bleiben unverhandelbar; Conviction
//      wird nur als Hinweis annotiert.
//
// Reine Funktion, keine I/O — der localStorage-Read passiert im Client-
// Banner, das diese Funktion aufruft.

import type { CoinAdjustment } from '@/lib/agents/coin-override';
import type { CryptoPrecisionResult, CryptoPrecisionVerdict } from '@/lib/analysis/crypto-precision-gate';

// Delta-Schwelle, ab der ein negatives User-Signal FREIGABE herabstuft.
export const DOWNGRADE_DELTA_THRESHOLD = -15;

export interface OverrideAdjustedPick {
  coinId: string;
  symbol: string;
  originalVerdict: CryptoPrecisionVerdict;
  adjustedVerdict: CryptoPrecisionVerdict;
  changed: boolean;
  reason: string | null;          // nur gesetzt wenn changed
  convictionNote: string | null;  // Hinweis bei positivem Delta ohne Kipp-Wirkung
}

export function applyUserOverrideToPrecision(
  pick: Pick<CryptoPrecisionResult, 'coinId' | 'symbol' | 'verdict'>,
  adjustment: CoinAdjustment | null
): OverrideAdjustedPick {
  const base: OverrideAdjustedPick = {
    coinId: pick.coinId,
    symbol: pick.symbol,
    originalVerdict: pick.verdict,
    adjustedVerdict: pick.verdict,
    changed: false,
    reason: null,
    convictionNote: null
  };
  if (!adjustment || adjustment.factors.length === 0) return base;

  // Regel 1: Hard-Veto schlaegt alles.
  if (adjustment.hardVeto && pick.verdict !== 'NICHT_VERWENDEN') {
    return {
      ...base,
      adjustedVerdict: 'NICHT_VERWENDEN',
      changed: true,
      reason: `Dein Veto (${adjustment.factors.join(', ')}) kippt ${pick.symbol} auf NICHT VERWENDEN.`
    };
  }

  // Regel 2: stark negatives Delta stuft FREIGABE herab.
  if (!adjustment.hardVeto && adjustment.scoreDelta <= DOWNGRADE_DELTA_THRESHOLD && pick.verdict === 'FREIGABE') {
    return {
      ...base,
      adjustedVerdict: 'BEOBACHTEN',
      changed: true,
      reason: `Deine Faktoren (${adjustment.factors.join(', ')}, Delta ${adjustment.scoreDelta}) stufen ${pick.symbol} auf BEOBACHTEN herab.`
    };
  }

  // Regel 3: Conviction annotiert, kippt aber nie nach oben.
  if (adjustment.scoreDelta > 0 && pick.verdict !== 'FREIGABE') {
    return {
      ...base,
      convictionNote: `Deine Conviction (${adjustment.factors.join(', ')}, Delta +${adjustment.scoreDelta}) ist notiert — die Pflicht-Kriterien des Modells bleiben aber unveraendert.`
    };
  }

  return base;
}

export function applyUserOverridesToAll(
  picks: Array<Pick<CryptoPrecisionResult, 'coinId' | 'symbol' | 'verdict'>>,
  adjustmentFor: (coinId: string) => CoinAdjustment | null
): OverrideAdjustedPick[] {
  return picks.map((p) => applyUserOverrideToPrecision(p, adjustmentFor(p.coinId)));
}
