/** Verified issuer facts. Prices and market calculations are fetched separately. */
export const WORLD_EQUITY_FUND = {
  name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
  shortName: 'Vanguard FTSE All-World ETF',
  isin: 'IE00BK5BQT80',
  wkn: 'A2PKXG',
  ticker: 'VWCE',
  quoteSymbol: 'VWCE.DE',
  ongoingChargePct: 0.14,
  estimatedTransactionCostPct: 0.02,
  minimumYears: 5,
  portfolioDate: '2026-09-30',
  factsCheckedAt: '2026-10-31',
  holdings: 3821,
  usSharePct: 62.2,
  technologySharePct: 36.1,
  topTenSharePct: 25.8,
  sources: [
    { label: 'Produktseite von Vanguard', url: 'https://www.de.vanguard/professionell/anlageprodukte/etf/aktien/9679/ftse-all-world-ucits-etf-usd-accumulating' },
    { label: 'Fondsübersicht · 30.09.2026', url: 'https://fund-docs.vanguard.com/FTSE_All-World_UCITS_ETF_USD_Accumulating_9679_EU_GERMAN_GE.pdf' },
    { label: 'Basisinformationen · 29.09.2026', url: 'https://fund-docs.vanguard.com/ie00bk5bqt80_priipskid_de.pdf' }
  ]
} as const;
