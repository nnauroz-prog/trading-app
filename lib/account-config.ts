export interface RiskLimits {
  // Einzelposition: ab diesem % des Kapitals → "danger", ab 2x → "critical"
  maxPositionPct: number;
  // Summe aller Stop-Risiken: ab diesem % → "danger", ab 2x → "critical"
  maxPortfolioHeatPct: number;
  // Anzahl gleichzeitiger Hebelprodukte, ab der gewarnt wird
  maxHebelCount: number;
  // Anzahl offener Positionen, ab der ein Hinweis kommt
  maxOpenPositions: number;
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxPositionPct: 25,
  maxPortfolioHeatPct: 6,
  maxHebelCount: 3,
  maxOpenPositions: 8
};

export interface AccountConfig {
  accountSize: number;
  maxRiskPct: number;
  currency: 'EUR' | 'USD';
  riskLimits: RiskLimits;
  // Minimum confluences (out of 12) before a candidate is labelled "Kaufbar".
  // Lower = more (but riskier) signals. Conservative default is 7.
  minConfluence: number;
  // Advanced mode shows all analytical blocks. Default off = clean buy-tip view.
  advancedMode: boolean;
}

export const DEFAULT_CONFIG: AccountConfig = {
  accountSize: 0,
  maxRiskPct: 1,
  currency: 'EUR',
  riskLimits: DEFAULT_RISK_LIMITS,
  minConfluence: 7,
  advancedMode: false
};

export const STORAGE_KEY = 'trading-app.account-config';

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function parseRiskLimits(raw: unknown): RiskLimits {
  const r = (raw ?? {}) as Partial<RiskLimits>;
  return {
    maxPositionPct: num(r.maxPositionPct, DEFAULT_RISK_LIMITS.maxPositionPct, 1, 100),
    maxPortfolioHeatPct: num(r.maxPortfolioHeatPct, DEFAULT_RISK_LIMITS.maxPortfolioHeatPct, 0.5, 100),
    maxHebelCount: num(r.maxHebelCount, DEFAULT_RISK_LIMITS.maxHebelCount, 1, 50),
    maxOpenPositions: num(r.maxOpenPositions, DEFAULT_RISK_LIMITS.maxOpenPositions, 1, 100)
  };
}

export function loadConfig(): AccountConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    return {
      accountSize: typeof parsed.accountSize === 'number' && parsed.accountSize >= 0 ? parsed.accountSize : 0,
      maxRiskPct: typeof parsed.maxRiskPct === 'number' && parsed.maxRiskPct > 0 && parsed.maxRiskPct <= 10 ? parsed.maxRiskPct : 1,
      currency: parsed.currency === 'USD' ? 'USD' : 'EUR',
      riskLimits: parseRiskLimits(parsed.riskLimits),
      minConfluence: num(parsed.minConfluence, DEFAULT_CONFIG.minConfluence, 5, 9),
      advancedMode: typeof parsed.advancedMode === 'boolean' ? parsed.advancedMode : DEFAULT_CONFIG.advancedMode
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AccountConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('trading-app:config-changed'));
}

export interface SizingResult {
  positionSizeQuote: number;
  positionSizeCoins: number;
  riskAmount: number;
  reward1Amount: number;
  reward2Amount: number;
  asPctOfAccount: number;
}

export function computeSizing(config: AccountConfig, entry: number, stopLoss: number, takeProfit1: number, takeProfit2: number): SizingResult | null {
  if (config.accountSize <= 0 || entry <= 0 || stopLoss <= 0 || entry <= stopLoss) return null;
  const riskAmount = (config.accountSize * config.maxRiskPct) / 100;
  const riskPerCoin = entry - stopLoss;
  const positionSizeCoins = riskAmount / riskPerCoin;
  const positionSizeQuote = positionSizeCoins * entry;
  const reward1Amount = positionSizeCoins * (takeProfit1 - entry);
  const reward2Amount = positionSizeCoins * (takeProfit2 - entry);
  return {
    positionSizeQuote,
    positionSizeCoins,
    riskAmount,
    reward1Amount,
    reward2Amount,
    asPctOfAccount: (positionSizeQuote / config.accountSize) * 100
  };
}
