// Bankroll-Empfehlung pro WM-Sieger-Pick.
//
// Konservatives Halb-Kelly:
//   stakeFraction = ((p * b - q) / b) / 2
// mit
//   p = unsere Modell-Probability (geschaetzt)
//   q = 1 - p
//   b = decimal odds - 1 (Auszahlungsfaktor)
//
// Wir nehmen als Default fuer Sieger-Quoten konservativ b = 1.0
// (entspricht decimal odds 2.0, eine "klare Favoriten"-Annahme). Wenn
// die Buchmacher-Quote bekannt ist, kann der User sie eingeben.
//
// Empfohlene Einsaetze sind streng gedeckelt:
//   - Hoechste Konfluenz: max 4 % der Bankroll
//   - Modell-Favorit:     max 2 % der Bankroll
// Damit kein einzelner Pick die Bankroll zerlegen kann.
//
// Reine Funktion. Wording ohne verbotene Begriffe.

import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

export interface BankrollSuggestion {
  pickId: string;
  // Empfohlener Stake in Prozent der Bankroll.
  stakePct: number;
  // Konkreter Stake in EUR, wenn bankrollEur uebergeben wurde.
  stakeEur: number | null;
  // Half-Kelly Roh-Wert (vor Cap).
  rawHalfKellyPct: number;
  // Hat die Tier-Obergrenze gegriffen?
  cappedByTier: boolean;
  // Implizite Quote, die wir angesetzt haben.
  decimalOdds: number;
  reason: string;
}

interface BuildInput {
  pick: WmWinnerPick;
  bankrollEur?: number | null;
  // Optional: tatsaechliche Buchmacher-Quote (decimal). Default 2.0.
  decimalOdds?: number;
}

export function suggestBankroll(input: BuildInput): BankrollSuggestion {
  const odds = input.decimalOdds ?? 2.0;
  const b = odds - 1;
  const p = Math.max(0, Math.min(1, input.pick.modelProbabilityPct / 100));
  const q = 1 - p;
  const kelly = (p * b - q) / b;
  const halfKelly = kelly / 2;
  const rawHalfKellyPct = Math.max(0, halfKelly) * 100;
  const tierCap = input.pick.tier === 'hoechste-konfluenz' ? 4 : 2;
  const stakePct = Math.min(rawHalfKellyPct, tierCap);
  const cappedByTier = rawHalfKellyPct > tierCap;
  const stakeEur = typeof input.bankrollEur === 'number' && input.bankrollEur > 0
    ? Math.round(input.bankrollEur * stakePct) / 100
    : null;
  const reason = halfKelly <= 0
    ? `Quote ${odds.toFixed(2)} reicht fuer ${input.pick.modelProbabilityPct} % nicht — kein Stake empfohlen.`
    : `Half-Kelly bei p=${input.pick.modelProbabilityPct} % / Quote ${odds.toFixed(2)}: ${rawHalfKellyPct.toFixed(2)} %, ${cappedByTier ? `gedeckelt auf ${tierCap} %` : 'innerhalb Tier-Limit'}.`;
  return {
    pickId: `${input.pick.fixture.id}-${input.pick.winnerSide}`,
    stakePct,
    stakeEur,
    rawHalfKellyPct,
    cappedByTier,
    decimalOdds: odds,
    reason
  };
}
