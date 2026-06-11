// Stake-Anpassung pro Pick. Reine Funktion.
//
// Liefert pro Mode den manipulierten Half-Kelly-Stake:
//   'minus50'  -> Stake * 0.5
//   'minus25'  -> Stake * 0.75
//   'standard' -> Stake unveraendert
//   'plus25'   -> Stake * 1.25
//   'plus50'   -> Stake * 1.5
//
// Tier-Cap bleibt absolute Obergrenze: ein "plus50" der die Cap
// ueberschreiten wuerde, wird auf den Cap-Wert gestutzt.

import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

export type WmStakeMode = 'minus50' | 'minus25' | 'standard' | 'plus25' | 'plus50';

const FACTOR_BY_MODE: Record<WmStakeMode, number> = {
  minus50: 0.5,
  minus25: 0.75,
  standard: 1.0,
  plus25: 1.25,
  plus50: 1.5
};

export const STAKE_MODES: readonly WmStakeMode[] = ['minus50', 'minus25', 'standard', 'plus25', 'plus50'];

const TIER_CAP_PCT: Record<WmWinnerPick['tier'], number> = {
  'hoechste-konfluenz': 4,
  'modell-favorit': 2
};

export interface AdjustedStake {
  stakePct: number;
  stakeEur: number | null;
  cappedByTier: boolean;
  factor: number;
}

export function adjustStake(
  baseStakePct: number,
  baseStakeEur: number | null,
  tier: WmWinnerPick['tier'],
  mode: WmStakeMode
): AdjustedStake {
  const factor = FACTOR_BY_MODE[mode];
  const cap = TIER_CAP_PCT[tier];
  let pct = baseStakePct * factor;
  let cappedByTier = false;
  if (pct > cap) {
    pct = cap;
    cappedByTier = true;
  }
  // Untergrenze: niemals negativ, niemals > Cap.
  pct = Math.max(0, pct);
  const ratio = baseStakePct > 0 ? pct / baseStakePct : 0;
  const eur = baseStakeEur === null ? null : Math.round(baseStakeEur * ratio * 100) / 100;
  return { stakePct: Math.round(pct * 100) / 100, stakeEur: eur, cappedByTier, factor };
}

export function labelForMode(mode: WmStakeMode): string {
  switch (mode) {
    case 'minus50': return '−50 %';
    case 'minus25': return '−25 %';
    case 'standard': return 'Standard';
    case 'plus25': return '+25 %';
    case 'plus50': return '+50 %';
  }
}
