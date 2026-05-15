export interface AccountConfig {
  accountSize: number;
  maxRiskPct: number;
  currency: 'EUR' | 'USD';
}

export const DEFAULT_CONFIG: AccountConfig = {
  accountSize: 0,
  maxRiskPct: 1,
  currency: 'EUR'
};

export const STORAGE_KEY = 'trading-app.account-config';

export function loadConfig(): AccountConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    return {
      accountSize: typeof parsed.accountSize === 'number' && parsed.accountSize >= 0 ? parsed.accountSize : 0,
      maxRiskPct: typeof parsed.maxRiskPct === 'number' && parsed.maxRiskPct > 0 && parsed.maxRiskPct <= 10 ? parsed.maxRiskPct : 1,
      currency: parsed.currency === 'USD' ? 'USD' : 'EUR'
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
