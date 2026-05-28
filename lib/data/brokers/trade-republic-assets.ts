export const TRADE_REPUBLIC_LAST_VERIFIED = '2026-05-27';

export const TR_KNOWN_STOCKS_WKN: ReadonlySet<string> = new Set([
  '519000', 'A1EWWW', '710000', '716460', '514000', '623100',
  '870747', '703712', 'A0D9PT', 'A0LR4P', 'A14R7U', '865985',
  'A1JX52', '850663', 'A2PSR2', 'A0M4W9', '870737', '852009',
  'A2P4DU', '850160', '855705', 'A14R7H', 'A12CX1', '853260'
]);

export const TR_DERIVATIVE_ISSUERS = ['HSBC', 'Société Générale', 'BNP Paribas', 'Vontobel', 'Goldman Sachs', 'UBS'];

export function isWknOnTradeRepublic(wkn: string): { available: boolean; verified: boolean; lastVerified: string } {
  const normalized = wkn.toUpperCase().trim();
  if (TR_KNOWN_STOCKS_WKN.has(normalized)) {
    return { available: true, verified: true, lastVerified: TRADE_REPUBLIC_LAST_VERIFIED };
  }
  return { available: false, verified: false, lastVerified: TRADE_REPUBLIC_LAST_VERIFIED };
}
