// Lite-Backtest fuer die drei Optionsschein-Setups (niedrig/mittel/hoch
// Risiko). Greift auf die historischen Closes des Basiswerts zurueck
// und simuliert: an N Stichprobentagen die letzten 2 Jahre Setup
// generiert, bis zum Verfall gehalten, Innerer-Wert-Endabrechnung,
// dann aggregiert. Macht die ehrliche Frage "Haette das funktioniert?"
// beantwortbar — mit den Caveat, dass das Premium-Modell vereinfacht
// ist (Standard- oder historische Vola, kein echter Broker-Spread).

export interface BacktestTrade {
  sampleDate: string;            // YYYY-MM-DD
  underlyingAtSample: number;
  strike: number;
  expiryDate: string;
  underlyingAtExpiry: number;
  premiumAtSample: number;       // pro Schein
  intrinsicAtExpiry: number;     // pro Schein
  returnPct: number;             // (intrinsic - premium) / premium * 100
}

export interface BacktestStats {
  risk: 'niedrig' | 'mittel' | 'hoch';
  monthsToExpiry: number;
  moneynessFactor: number;
  trades: BacktestTrade[];
  count: number;
  winCount: number;              // returnPct > 0
  fullLossCount: number;         // returnPct == -100 (verfaellt wertlos)
  winRatePct: number;
  meanReturnPct: number;
  medianReturnPct: number;
  maxGainPct: number;
  maxLossPct: number;
  // Vergleichs-Anker: was haette die Aktie selbst gemacht?
  aktienReturnPctMean: number;
  // Klartext-Urteil aus den Zahlen — ehrlich, kein Kauf-Trigger.
  verdict: string;
  verdictTone: 'good' | 'mixed' | 'bad';
}

interface BacktestInput {
  // Historische Tages-Closes, chronologisch alt -> neu.
  closes: number[];
  // Dates parallel zum closes-Array (oder undefined fuer synthetisch).
  dates?: string[];
  // Sigma fuer Premium-Modell.
  sigma?: number;
  // Wie oft wir sampelnd Setups generieren — Default alle 30 Tage.
  sampleStepDays?: number;
  // Lookback in Tagen (Default 730 = 2 Jahre).
  lookbackDays?: number;
  // Asset-Klasse fuer Strike-Rundung.
  assetClass?: 'aktie' | 'krypto';
  direction?: 'call' | 'put';
}

const PROFILES = [
  { risk: 'niedrig' as const, moneynessFactor: 0.85, monthsToExpiry: 18 },
  { risk: 'mittel' as const, moneynessFactor: 1.00, monthsToExpiry: 9 },
  { risk: 'hoch' as const, moneynessFactor: 1.20, monthsToExpiry: 3 }
];

function approxPremium(underlyingPrice: number, strike: number, daysToExpiry: number, direction: 'call' | 'put', sigma: number): number {
  const intrinsic = Math.max(0, direction === 'call' ? underlyingPrice - strike : strike - underlyingPrice);
  if (daysToExpiry <= 0) return Math.max(0.01, intrinsic);
  const ttmYears = daysToExpiry / 365;
  const distPct = Math.abs((underlyingPrice - strike) / underlyingPrice);
  const timeValue = underlyingPrice * sigma * Math.sqrt(ttmYears) * Math.exp(-2 * distPct);
  return Math.max(0.01, intrinsic + timeValue);
}

function roundStrike(strike: number, assetClass: 'aktie' | 'krypto'): number {
  if (!Number.isFinite(strike) || strike <= 0) return strike;
  if (assetClass === 'krypto') {
    if (strike >= 10000) return Math.round(strike / 1000) * 1000;
    if (strike >= 1000) return Math.round(strike / 100) * 100;
    if (strike >= 100) return Math.round(strike / 10) * 10;
    return Math.round(strike);
  }
  if (strike >= 1000) return Math.round(strike / 10) * 10;
  if (strike >= 100) return Math.round(strike / 5) * 5;
  if (strike >= 20) return Math.round(strike);
  return Math.round(strike * 2) / 2;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function buildVerdict(risk: 'niedrig' | 'mittel' | 'hoch', winRatePct: number, meanReturnPct: number, fullLossCount: number, count: number, aktienReturnPctMean: number): { text: string; tone: 'good' | 'mixed' | 'bad' } {
  if (count < 3) {
    return { text: `Zu wenig Stichproben (${count}) — keine belastbare Statistik moeglich.`, tone: 'mixed' };
  }
  const fullLossRate = (fullLossCount / count) * 100;
  const beatsAktie = meanReturnPct > aktienReturnPctMean;
  const aktienLabel = aktienReturnPctMean >= 0 ? `+${aktienReturnPctMean.toFixed(0)} %` : `${aktienReturnPctMean.toFixed(0)} %`;

  if (risk === 'niedrig') {
    if (winRatePct >= 60 && meanReturnPct > 0) {
      return { text: `Solider ITM-Hebel: ${winRatePct.toFixed(0)} % Treffer, mittlerer Return ${meanReturnPct >= 0 ? '+' : ''}${meanReturnPct.toFixed(0)} % vs. Aktie ${aktienLabel}. Folgt der Aktie mit kleinem Hebel-Plus.`, tone: 'good' };
    }
    if (winRatePct >= 40) {
      return { text: `Gemischt: ${winRatePct.toFixed(0)} % Treffer, mittlerer Return ${meanReturnPct.toFixed(0)} %. ${beatsAktie ? 'Schlaegt die Aktie knapp.' : 'Aktie waere besser gewesen.'}`, tone: 'mixed' };
    }
    return { text: `Schwach: nur ${winRatePct.toFixed(0)} % Treffer. Aktie hat ${aktienLabel} gemacht — Hebel hat hier eher gekostet als gebracht.`, tone: 'bad' };
  }
  if (risk === 'mittel') {
    if (winRatePct >= 50 && meanReturnPct > 20) {
      return { text: `Funktioniert: ${winRatePct.toFixed(0)} % Treffer, mittlerer Return +${meanReturnPct.toFixed(0)} %. Hebel arbeitet bei der Aktien-Bewegung von ${aktienLabel} sinnvoll.`, tone: 'good' };
    }
    if (winRatePct >= 35 || (meanReturnPct > 0 && fullLossRate < 50)) {
      return { text: `Mischbild: ${winRatePct.toFixed(0)} % Treffer. ${fullLossCount} von ${count} verfallen wertlos. Aktie ${aktienLabel}.`, tone: 'mixed' };
    }
    return { text: `Selten profitabel: ${winRatePct.toFixed(0)} % Treffer, ${fullLossCount}/${count} Totalverluste. Aktie waere die ehrlichere Wahl gewesen (${aktienLabel}).`, tone: 'bad' };
  }
  // hoch
  if (meanReturnPct > 100 && winRatePct >= 30) {
    return { text: `Spekulativ aber lohnenswert: ${winRatePct.toFixed(0)} % Treffer, aber mittlerer Return +${meanReturnPct.toFixed(0)} % — die seltenen Treffer waren gross. ${fullLossCount}/${count} verfallen.`, tone: 'good' };
  }
  if (winRatePct >= 20 && meanReturnPct > -30) {
    return { text: `Gluecksspiel-Niveau: ${winRatePct.toFixed(0)} % Treffer, ${fullLossCount}/${count} Totalverluste. Mittel ${meanReturnPct >= 0 ? '+' : ''}${meanReturnPct.toFixed(0)} % vs. Aktie ${aktienLabel}.`, tone: 'mixed' };
  }
  return { text: `Schlecht: nur ${winRatePct.toFixed(0)} % Treffer, ${fullLossCount}/${count} verfallen wertlos. Aktie ${aktienLabel} waere deutlich besser gewesen.`, tone: 'bad' };
}

export function backtestSuggestions(input: BacktestInput): BacktestStats[] {
  const closes = input.closes;
  if (!Array.isArray(closes) || closes.length < 100) return [];
  const sigma = input.sigma && input.sigma > 0 && input.sigma <= 2 ? input.sigma : 0.30;
  const sampleStepDays = input.sampleStepDays ?? 30;
  const lookbackDays = input.lookbackDays ?? 730;
  const assetClass = input.assetClass ?? 'aktie';
  const direction = input.direction ?? 'call';

  const window = closes.slice(-Math.max(lookbackDays, 100));
  const dates = input.dates?.slice(-Math.max(lookbackDays, 100)) ?? [];

  return PROFILES.map((profile) => {
    const trades: BacktestTrade[] = [];
    const aktienReturns: number[] = [];
    const expiryDayOffset = Math.round(profile.monthsToExpiry * 30);

    // Letzter sampelbarer Tag = window.length - expiryDayOffset, sonst
    // koennen wir den Verfall nicht im Sample sehen.
    const lastSampleIdx = window.length - expiryDayOffset - 1;
    if (lastSampleIdx < 0) {
      return {
        risk: profile.risk,
        monthsToExpiry: profile.monthsToExpiry,
        moneynessFactor: profile.moneynessFactor,
        trades: [],
        count: 0,
        winCount: 0,
        fullLossCount: 0,
        winRatePct: 0,
        meanReturnPct: 0,
        medianReturnPct: 0,
        maxGainPct: 0,
        maxLossPct: 0,
        aktienReturnPctMean: 0,
        verdict: 'Zu wenig historische Daten fuer diesen Horizont.',
        verdictTone: 'mixed' as const
      };
    }

    for (let i = 0; i <= lastSampleIdx; i += sampleStepDays) {
      const underlyingAtSample = window[i];
      const underlyingAtExpiry = window[i + expiryDayOffset];
      if (!Number.isFinite(underlyingAtSample) || underlyingAtSample <= 0) continue;
      if (!Number.isFinite(underlyingAtExpiry) || underlyingAtExpiry <= 0) continue;

      // Strike-Berechnung wie Suggest
      const rawFactor = direction === 'call' ? profile.moneynessFactor : 2 - profile.moneynessFactor;
      const rawStrike = underlyingAtSample * rawFactor;
      const strike = roundStrike(rawStrike, assetClass);

      const premiumAtSample = approxPremium(underlyingAtSample, strike, expiryDayOffset, direction, sigma);
      const intrinsicAtExpiry = Math.max(0, direction === 'call' ? underlyingAtExpiry - strike : strike - underlyingAtExpiry);
      const returnPct = premiumAtSample > 0 ? ((intrinsicAtExpiry - premiumAtSample) / premiumAtSample) * 100 : 0;

      const aktienReturn = ((underlyingAtExpiry - underlyingAtSample) / underlyingAtSample) * 100;

      const sampleDate = dates[i] ?? `T+${i}`;
      const expiryDate = dates[i + expiryDayOffset] ?? `T+${i + expiryDayOffset}`;

      trades.push({
        sampleDate,
        underlyingAtSample,
        strike,
        expiryDate,
        underlyingAtExpiry,
        premiumAtSample,
        intrinsicAtExpiry,
        returnPct
      });
      aktienReturns.push(aktienReturn);
    }

    const returns = trades.map((t) => t.returnPct);
    const count = trades.length;
    const winCount = returns.filter((r) => r > 0).length;
    const fullLossCount = returns.filter((r) => r <= -99.5).length;
    const meanReturnPct = count > 0 ? returns.reduce((s, r) => s + r, 0) / count : 0;
    const medianReturnPct = median(returns);
    const maxGainPct = count > 0 ? Math.max(...returns) : 0;
    const maxLossPct = count > 0 ? Math.min(...returns) : 0;
    const aktienReturnPctMean = aktienReturns.length > 0 ? aktienReturns.reduce((s, r) => s + r, 0) / aktienReturns.length : 0;
    const winRatePct = count > 0 ? (winCount / count) * 100 : 0;
    const v = buildVerdict(profile.risk, winRatePct, meanReturnPct, fullLossCount, count, aktienReturnPctMean);

    return {
      risk: profile.risk,
      monthsToExpiry: profile.monthsToExpiry,
      moneynessFactor: profile.moneynessFactor,
      trades,
      count,
      winCount,
      fullLossCount,
      winRatePct,
      meanReturnPct,
      medianReturnPct,
      maxGainPct,
      maxLossPct,
      aktienReturnPctMean,
      verdict: v.text,
      verdictTone: v.tone
    };
  });
}
