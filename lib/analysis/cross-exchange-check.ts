import { TickerSnapshot } from '@/lib/providers/binance-tickers';

export interface CrossExchangeFinding {
  symbol: string;
  binancePrice: number;
  bybitPrice: number;
  divergencePct: number;
  severity: 'ok' | 'auffällig' | 'verdächtig';
  note: string;
}

export interface CrossExchangeReport {
  checked: number;
  okCount: number;
  suspiciousCount: number;
  findings: CrossExchangeFinding[];
  summary: string;
}

// 0.5% is "barely worth noting" on a major (BTC/ETH should be within 0.1%).
// 1.0% is "real divergence" — something off with one feed or thin venue.
// 2.0% and up is "do not trade until reconciled".
const OK_THRESHOLD = 0.5;
const SUSPECT_THRESHOLD = 1.0;

// Cross-validates the primary Binance prices against Bybit. If Bybit isn't
// reachable we silently degrade — no findings, just an "unverified" note.
export function checkCrossExchangePrices(
  binance: Map<string, TickerSnapshot> | null,
  bybit: Map<string, TickerSnapshot> | null
): CrossExchangeReport {
  if (!binance) {
    return { checked: 0, okCount: 0, suspiciousCount: 0, findings: [], summary: 'Keine Binance-Daten — nichts zu vergleichen.' };
  }
  if (!bybit) {
    return { checked: 0, okCount: 0, suspiciousCount: 0, findings: [], summary: 'Bybit als zweite Quelle gerade nicht erreichbar — Binance-Preise unbestätigt.' };
  }

  const findings: CrossExchangeFinding[] = [];
  let okCount = 0;
  let suspiciousCount = 0;
  for (const [symbol, binanceTk] of binance) {
    const bybitTk = bybit.get(symbol);
    if (!bybitTk || bybitTk.price <= 0 || binanceTk.price <= 0) continue;
    const divergence = ((bybitTk.price - binanceTk.price) / binanceTk.price) * 100;
    const abs = Math.abs(divergence);
    let severity: CrossExchangeFinding['severity'];
    let note: string;
    if (abs <= OK_THRESHOLD) {
      severity = 'ok';
      okCount++;
      continue; // don't list trivially-aligned coins
    } else if (abs <= SUSPECT_THRESHOLD) {
      severity = 'auffällig';
      note = `${abs.toFixed(2)}% Abweichung — beobachten, aber meist nur Liquiditäts-Unterschied.`;
    } else {
      severity = 'verdächtig';
      note = `${abs.toFixed(2)}% Abweichung — nicht handeln, bis die Quellen sich einigen.`;
      suspiciousCount++;
    }
    findings.push({ symbol, binancePrice: binanceTk.price, bybitPrice: bybitTk.price, divergencePct: divergence, severity, note });
  }
  findings.sort((a, b) => Math.abs(b.divergencePct) - Math.abs(a.divergencePct));

  const summary =
    suspiciousCount > 0 ? `${suspiciousCount} Coin(s) mit verdächtiger Preisabweichung zwischen Binance und Bybit. Nicht handeln, bis die Feeds aligned sind.` :
    findings.length > 0 ? `${findings.length} Coin(s) mit leichten Abweichungen — meist harmlos, aber im Auge behalten.` :
    `Alle ${okCount} verglichenen Preise innerhalb ${OK_THRESHOLD}% Toleranz. Datenlage konsistent.`;

  return {
    checked: okCount + findings.length,
    okCount,
    suspiciousCount,
    findings: findings.slice(0, 10),
    summary
  };
}
