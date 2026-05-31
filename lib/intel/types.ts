export type IntelSignal = 'risk-on' | 'risk-off' | 'neutral' | 'kein_signal';
export type IntelConfidence = 'sicher' | 'wahrscheinlich' | 'vermutung' | 'keine_daten';

export interface EmployeeReport {
  id: string;
  title: string;           // Job-Titel: "Stimmungs-Forscherin", "Derivate-Analyst"
  department: string;      // Abteilung
  expertise: string;       // Was diese Person beobachtet (eine Zeile)
  finding: string;         // Heutiger Befund (1–3 Sätze)
  signal: IntelSignal;     // Tendenz: risk-on / risk-off / neutral
  confidence: IntelConfidence;
  detail?: string;         // Optional: zusätzliche Datenpunkte
}

export interface IntelContext {
  // Marktstimmung
  fearGreed: number | null;
  fundingBtcPct: number | null; // annualisiert
  fundingEthPct: number | null;
  btcDominancePct: number | null;
  // Master signal Daten
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  btcRegime: 'bull' | 'bear' | 'sideways';
  // Aus dem Universum: Ticker + Signal-Kandidaten
  topCandidates: Array<{
    symbol: string;
    coinId: string;
    passedCount: number;
    priceChangePct24h: number;
    quoteVolume: number;
    relStrengthVsBtc: number;
    structure: 'uptrend' | 'downtrend' | 'range';
  }>;
  // News
  newsTotal: number;
  newsBullish: number;
  newsBearish: number;
  newsTopHeadline: string | null;
  topCoinSentiment: Array<{ coin: string; tilt: 'bullisch' | 'bärisch' | 'neutral'; bullishCount: number; bearishCount: number }>;
  // Backtest
  backtestPeriodDays: number;
  backtestSafeTrades: number;
  backtestSafeWinRatePct: number | null;
  backtestSafeNetReturnPct: number;
  // Makro-Kalender
  nextHighImpactEvent: { title: string; hoursUntil: number } | null;
  // Zyklus
  cycleLabel: string | null;
  cycleProgressPct: number | null;
  // Firma-Tagebuch (wenn vorhanden) für den Historiker
  recentBuyDays: number;
  recentWaitDays: number;
}

export interface ChefredakteurReport {
  lagebericht: string;             // 2–4 Sätze Synthese
  netSignal: IntelSignal;          // CEO-Tendenz
  riskOnCount: number;
  riskOffCount: number;
  conflicts: string[];             // wo die Abteilungen sich widersprechen
  highlights: string[];            // die 2–3 wichtigsten Funde
}
