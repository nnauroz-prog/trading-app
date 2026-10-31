/** Transparent probability models; callers must supply verified, comparable source data. */
export interface ScoreForecast {
  home: number;
  away: number;
  probability: number;
  probabilities: { home: number; draw: number; away: number };
}

export interface ScoringResult { for: number; against: number }

const validCount = (value: number, maximum = 300) => Number.isInteger(value) && value >= 0 && value <= maximum;

function forecastFromMass(homeMass: number[], awayMass: number[], homeOffset: number, awayOffset: number, allowDraw: boolean): ScoreForecast | null {
  let home = homeOffset;
  let away = awayOffset;
  let best = 0;
  let total = 0;
  const probabilities = { home: 0, draw: 0, away: 0 };
  for (let h = 0; h < homeMass.length; h++) {
    for (let a = 0; a < awayMass.length; a++) {
      const homeScore = h + homeOffset;
      const awayScore = a + awayOffset;
      if (!allowDraw && homeScore === awayScore) continue;
      const mass = homeMass[h] * awayMass[a];
      total += mass;
      if (homeScore > awayScore) probabilities.home += mass;
      else if (homeScore < awayScore) probabilities.away += mass;
      else probabilities.draw += mass;
      if (mass > best) { best = mass; home = homeScore; away = awayScore; }
    }
  }
  if (!Number.isFinite(total) || total <= 1e-12 || best <= 0) return null;
  return { home, away, probability: best / total, probabilities: {
    home: probabilities.home / total, draw: probabilities.draw / total, away: probabilities.away / total
  } };
}

function poissonMass(rate: number): number[] {
  const mass = [Math.exp(-rate)];
  // With rate <= 12, 80 goals leaves a negligible tail, without the material
  // six-goal truncation used by simple score widgets.
  for (let k = 1; k <= 80; k++) mass.push(mass[k - 1] * rate / k);
  return mass;
}

/** Independent Poisson goals. Rates describe additional goals when scores are supplied. */
export function footballScoreForecast(lambdaHome: number, lambdaAway: number, currentHome = 0, currentAway = 0): ScoreForecast | null {
  if (![lambdaHome, lambdaAway].every(rate => Number.isFinite(rate) && rate >= 0 && rate <= 12)
    || !validCount(currentHome) || !validCount(currentAway)) return null;
  return forecastFromMass(poissonMass(lambdaHome), poissonMass(lambdaAway), currentHome, currentAway, true);
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
function sampleVariance(values: number[]): number {
  const average = mean(values);
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
}

// Standard normal CDF (Abramowitz–Stegun approximation, absolute error < 8e-8).
function normalCdf(value: number): number {
  if (value <= -9) return 0;
  if (value >= 9) return 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.2316419 * x);
  const density = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const tail = density * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return value >= 0 ? 1 - tail : tail;
}

function normalCountMass(expected: number, variance: number): number[] {
  if (variance === 0) {
    const mass = Array<number>(Math.round(expected) + 1).fill(0);
    mass[mass.length - 1] = 1;
    return mass;
  }
  const deviation = Math.sqrt(variance);
  const maximum = Math.ceil(expected + 9 * deviation);
  const mass: number[] = [];
  let previous = 0;
  for (let count = 0; count <= maximum; count++) {
    const cumulative = normalCdf((count + 0.5 - expected) / deviation);
    mass.push(Math.max(0, cumulative - previous));
    previous = cumulative;
  }
  return mass;
}

/**
 * Basketball regulation scoring approximation from at least five actual results
 * per team. Expected points average own scoring and the opponent's points allowed;
 * predictive variance pools their observed sample variances. No invented variance
 * floor or population scoring average is used. Tied bins are excluded because the
 * returned score represents a decisive final result; overtime is not modeled.
 * Live means and variances scale with the verified remaining regulation fraction.
 */
export function basketballScoreForecast(homeRecent: ScoringResult[], awayRecent: ScoringResult[], current?: { home: number; away: number; remainingFraction: number }): ScoreForecast | null {
  const validResults = (results: ScoringResult[]) => results.length >= 5 && results.length <= 30
    && results.every(result => validCount(result.for, 200) && result.for > 0 && validCount(result.against, 200) && result.against > 0);
  if (!validResults(homeRecent) || !validResults(awayRecent)) return null;
  if (current && (!validCount(current.home) || !validCount(current.away)
    || !Number.isFinite(current.remainingFraction) || current.remainingFraction < 0 || current.remainingFraction > 1)) return null;
  const homeFor = homeRecent.map(result => result.for);
  const homeAgainst = homeRecent.map(result => result.against);
  const awayFor = awayRecent.map(result => result.for);
  const awayAgainst = awayRecent.map(result => result.against);
  const homeMean = (mean(homeFor) + mean(awayAgainst)) / 2;
  const awayMean = (mean(awayFor) + mean(homeAgainst)) / 2;
  const homeVariance = (sampleVariance(homeFor) + sampleVariance(awayAgainst)) / 2;
  const awayVariance = (sampleVariance(awayFor) + sampleVariance(homeAgainst)) / 2;
  if (homeVariance <= 0 || awayVariance <= 0) return null;
  const fraction = current?.remainingFraction ?? 1;
  return forecastFromMass(normalCountMass(homeMean * fraction, homeVariance * fraction), normalCountMass(awayMean * fraction, awayVariance * fraction), current?.home ?? 0, current?.away ?? 0, false);
}
