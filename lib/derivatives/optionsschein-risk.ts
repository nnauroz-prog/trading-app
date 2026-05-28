import { DerivativeAnalysis, ParsedInstrument, RiskLevel, UserRiskProfile } from '@/lib/types/ideas';
import { classifyMoneyness } from './classify-moneyness';

function daysBetween(now: Date, futureIso: string): number | null {
  const [yearStr, monthStr] = futureIso.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  const future = new Date(Date.UTC(y, m - 1, 15));
  const diffMs = future.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function estimateDelta(distancePct: number, daysToExpiry: number | null, direction: 'call' | 'put' = 'call'): number {
  const ttmFactor = daysToExpiry === null ? 0.6 : Math.min(1, daysToExpiry / 365);
  const sign = direction === 'call' ? 1 : -1;
  const effectiveDist = sign * distancePct;
  if (effectiveDist > 25) return 0.92;
  if (effectiveDist > 15) return 0.82;
  if (effectiveDist > 8) return 0.70;
  if (effectiveDist > 2) return 0.58;
  if (effectiveDist > -2) return 0.50;
  if (effectiveDist > -8) return 0.38;
  if (effectiveDist > -15) return 0.25 + 0.10 * ttmFactor;
  if (effectiveDist > -25) return 0.12 + 0.08 * ttmFactor;
  return 0.05 + 0.05 * ttmFactor;
}

function approximatePremium(underlyingPrice: number, strike: number, daysToExpiry: number | null, direction: 'call' | 'put' = 'call'): number {
  const intrinsic = Math.max(0, direction === 'call' ? underlyingPrice - strike : strike - underlyingPrice);
  if (daysToExpiry === null || daysToExpiry <= 0) return Math.max(0.01, intrinsic);
  const ttmYears = daysToExpiry / 365;
  const distPct = Math.abs((underlyingPrice - strike) / underlyingPrice);
  const sigma = 0.30;
  const timeValue = underlyingPrice * sigma * Math.sqrt(ttmYears) * Math.exp(-2 * distPct);
  return Math.max(0.01, intrinsic + timeValue);
}

function calculateBreakeven(underlyingPrice: number, strike: number, premium: number, direction: 'call' | 'put' = 'call'): number {
  return direction === 'call' ? strike + premium : strike - premium;
}

function thetaUrgencyFromDays(days: number | null): DerivativeAnalysis['thetaUrgency'] {
  if (days === null) return 'moderate';
  if (days < 30) return 'critical';
  if (days < 90) return 'high';
  if (days < 270) return 'moderate';
  return 'low';
}

function classifyRisk(daysToExpiry: number | null, distancePct: number, direction: 'call' | 'put' = 'call'): RiskLevel {
  const inMoney = direction === 'call' ? distancePct > 0 : distancePct < 0;
  const absDist = Math.abs(distancePct);
  const shortDated = daysToExpiry !== null && daysToExpiry < 180;
  const longDated = daysToExpiry !== null && daysToExpiry >= 540;

  if (!inMoney && absDist >= 25 && shortDated) return 'Sehr hohes Risiko';
  if (!inMoney && absDist >= 25) return 'Sehr hohes Risiko';
  if (!inMoney && absDist > 12) return 'Hohes Risiko';
  if (!inMoney && absDist > 5 && shortDated) return 'Hohes Risiko';
  if (!inMoney) return 'Mittleres Risiko';
  if (inMoney && longDated) return 'Niedriges Risiko';
  if (inMoney) return 'Mittleres Risiko';
  return 'Hohes Risiko';
}

function beginnerSuitable(risk: RiskLevel): boolean {
  return risk === 'Niedrigstes Risiko' || risk === 'Niedriges Risiko';
}

export function analyzeOptionsschein(
  instrument: ParsedInstrument,
  underlyingPrice: number
): DerivativeAnalysis | null {
  if (instrument.instrumentType !== 'optionsschein' && instrument.instrumentType !== 'knockout') {
    return null;
  }
  if (instrument.strike === undefined || !Number.isFinite(underlyingPrice) || underlyingPrice <= 0) return null;

  const direction = instrument.direction === 'put' ? 'put' : 'call';
  const moneyness = classifyMoneyness(underlyingPrice, instrument.strike, direction);
  const daysToExpiry = instrument.expiry ? daysBetween(new Date(), instrument.expiry) : null;
  const monthsToExpiry = daysToExpiry !== null ? Math.round(daysToExpiry / 30) : null;
  const riskClass = classifyRisk(daysToExpiry, moneyness.distancePct, direction);

  const estimatedDelta = estimateDelta(moneyness.distancePct, daysToExpiry, direction);
  const approxPremium = approximatePremium(underlyingPrice, instrument.strike, daysToExpiry, direction);
  const approxBreakeven = calculateBreakeven(underlyingPrice, instrument.strike, approxPremium, direction);
  const breakevenMovePct = ((approxBreakeven - underlyingPrice) / underlyingPrice) * 100;
  const estimatedLeverage = approxPremium > 0 ? (estimatedDelta * underlyingPrice) / approxPremium : null;
  const thetaUrgency = thetaUrgencyFromDays(daysToExpiry);

  const warnings: string[] = [];
  if (Math.abs(moneyness.distancePct) > 25 && (moneyness.classification === 'otm' || moneyness.classification === 'deep_otm')) {
    warnings.push(`Strike weit aus dem Geld — Basiswert muss ${breakevenMovePct >= 0 ? '+' : ''}${breakevenMovePct.toFixed(1)}% bewegen, damit der Schein nur Breakeven erreicht.`);
  }
  if (thetaUrgency === 'critical') {
    warnings.push('Sehr kurze Restlaufzeit (<30 Tage) — Theta-Decay frisst täglich am Zeitwert, Position muss SCHNELL ins Geld laufen.');
  } else if (thetaUrgency === 'high') {
    warnings.push('Kurze Restlaufzeit (<90 Tage) — Zeitwert beschleunigt verlieren, kein gemütliches Halten möglich.');
  }
  if (daysToExpiry !== null && daysToExpiry < 0) {
    warnings.push('Verfallsdatum bereits in der Vergangenheit — Instrument ungültig.');
  }
  if (estimatedLeverage !== null && estimatedLeverage > 10) {
    warnings.push(`Hebel-Schätzung ~${estimatedLeverage.toFixed(0)}× — bereits 5-10% Bewegung gegen die Position kann den halben Einsatz kosten.`);
  }
  if (instrument.instrumentType === 'knockout') {
    warnings.push('Knock-Out: bei Erreichen der Knock-Out-Schwelle ist sofort Totalverlust möglich, auch innerhalb eines Tages.');
  } else {
    warnings.push('Optionsschein-Totalverlust ist möglich. Stop-Loss schützt nicht zuverlässig gegen schnelle Sprünge oder Spread-Verluste am Open.');
  }

  let recommendation: string;
  let preferEquity = false;
  if (riskClass === 'Sehr hohes Risiko') {
    recommendation = `Sehr spekulativ. Breakeven verlangt ${breakevenMovePct >= 0 ? '+' : ''}${breakevenMovePct.toFixed(1)}% am Basiswert. Aktie oder Schein mit niedrigerem Strike / längerer Laufzeit ist die sinnvollere Wahl. Falls trotzdem: max. 0.5-1% des Kapitals.`;
    preferEquity = true;
  } else if (riskClass === 'Hohes Risiko') {
    recommendation = `Spekulativ. Hebel ~${estimatedLeverage?.toFixed(0) ?? '?'}×. Aktien-Position wäre die defensivere Wahl für die gleiche These. Max. 1-2% des Kapitals als R-Einsatz.`;
    preferEquity = true;
  } else if (riskClass === 'Mittleres Risiko') {
    recommendation = `Vertretbares Risiko-Profil. Hebel ~${estimatedLeverage?.toFixed(0) ?? '?'}×, Restlaufzeit ${monthsToExpiry} Monate. Klarer Stop-Plan und max. 2% R-Einsatz.`;
  } else {
    recommendation = `Eher konservativer Schein. Hebel ~${estimatedLeverage?.toFixed(0) ?? '?'}×, viel Zeit. Trotzdem nicht über 2-3% Position-Size gehen.`;
  }

  return {
    instrument,
    underlyingPrice,
    moneyness,
    monthsToExpiry,
    daysToExpiry,
    riskClass,
    beginnerSuitable: beginnerSuitable(riskClass),
    warnings,
    recommendation,
    preferEquity,
    estimatedDelta,
    estimatedLeverage,
    approxBreakeven,
    breakevenMovePct,
    thetaUrgency
  };
}

export function pickBestForProfile(
  analyses: DerivativeAnalysis[],
  instruments: ParsedInstrument[],
  profile: UserRiskProfile
): ParsedInstrument | null {
  const stockChoice = instruments.find((i) => i.instrumentType === 'stock');
  if (profile === 'beginner' && stockChoice) return stockChoice;
  if (profile === 'intermediate' && stockChoice) return stockChoice;

  const ranking: Record<RiskLevel, number> = {
    'Niedrigstes Risiko': 1,
    'Niedriges Risiko': 2,
    'Mittleres Risiko': 3,
    'Hohes Risiko': 4,
    'Sehr hohes Risiko': 5,
    'Unbekanntes Risiko': 3
  };
  const profileMax: Record<UserRiskProfile, number> = {
    beginner: 2,
    intermediate: 3,
    speculative: 4,
    very_speculative: 5
  };
  const cap = profileMax[profile];
  const eligible = analyses.filter((a) => ranking[a.riskClass] <= cap);
  if (eligible.length === 0) {
    return stockChoice ?? null;
  }
  eligible.sort((a, b) => {
    if (ranking[a.riskClass] !== ranking[b.riskClass]) return ranking[a.riskClass] - ranking[b.riskClass];
    const aDays = a.daysToExpiry ?? 0;
    const bDays = b.daysToExpiry ?? 0;
    return bDays - aDays;
  });
  return eligible[0].instrument;
}
