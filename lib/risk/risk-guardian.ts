import { Position } from '@/lib/types/positions';
import { AccountConfig, RiskLimits, DEFAULT_RISK_LIMITS } from '@/lib/account-config';
import { UserRiskProfile } from '@/lib/types/ideas';

export type RiskSeverity = 'info' | 'warning' | 'danger' | 'critical';

export interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  title: string;
  message: string;
  relatedPositionId?: string;
  actionLabel?: string;
  category: 'position' | 'product' | 'portfolio' | 'behavior' | 'market';
}

export interface MarketContext {
  marketMood: 'risk-on' | 'neutral' | 'risk-off';
  marketRegime: 'bull' | 'bear' | 'sideways';
  todaysVerdict: 'trade' | 'no_trade';
}

const HEBEL_TYPES = new Set(['optionsschein', 'knockout', 'certificate']);

function pct(value: number, base: number): number {
  if (base === 0) return 0;
  return (value / base) * 100;
}

function positionAlerts(position: Position, latestPrice: number | null, capital: number, limits: RiskLimits): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  if (position.status !== 'open') return alerts;

  if (capital > 0) {
    const exposurePct = (position.investmentQuote / capital) * 100;
    if (exposurePct > limits.maxPositionPct) {
      alerts.push({
        id: `${position.id}-exposure`,
        severity: exposurePct > limits.maxPositionPct * 2 ? 'critical' : 'danger',
        title: `${position.underlying}: Position zu groß`,
        message: `${exposurePct.toFixed(0)}% des Kapitals in einer Position (Limit: ${limits.maxPositionPct}%). Bei einem Drawdown trifft das überproportional. 5-15% pro Trade ist eine konservativere Grenze.`,
        relatedPositionId: position.id,
        actionLabel: 'Reduzieren prüfen',
        category: 'position'
      });
    }
  }

  if (position.stopLossPlanned === null) {
    alerts.push({
      id: `${position.id}-no-stop`,
      severity: HEBEL_TYPES.has(position.instrumentType) ? 'critical' : 'warning',
      title: `${position.underlying}: kein Stop-Loss definiert`,
      message: HEBEL_TYPES.has(position.instrumentType)
        ? 'Hebelprodukt ohne Stop-Plan. Totalverlust möglich. Stop-Level festlegen.'
        : 'Position hat keinen Stop-Loss. Klares Exit-Level festlegen, sonst läuft der Verlust offen.',
      relatedPositionId: position.id,
      actionLabel: 'Stop nachtragen',
      category: 'position'
    });
  }

  if (position.takeProfitPlanned === null && position.stopLossPlanned !== null) {
    alerts.push({
      id: `${position.id}-no-tp`,
      severity: 'info',
      title: `${position.underlying}: kein Take-Profit-Plan`,
      message: 'Gewinnziel hilft beim Gewinnmitnehmen — sonst Tendenz zum „Reiten bis es dreht".',
      relatedPositionId: position.id,
      category: 'position'
    });
  }

  if (latestPrice !== null && position.stopLossPlanned !== null) {
    const distToStop = pct(latestPrice - position.stopLossPlanned, position.stopLossPlanned);
    const entryToStop = pct(position.entryPrice - position.stopLossPlanned, position.stopLossPlanned);
    if (latestPrice <= position.stopLossPlanned) {
      alerts.push({
        id: `${position.id}-stop-hit`,
        severity: 'critical',
        title: `${position.underlying}: Stop-Loss erreicht`,
        message: `Der definierte Stop wurde unterschritten. Exit-Regel prüfen und Risiko nicht ignorieren — auch wenn der Bauch etwas anderes sagt.`,
        relatedPositionId: position.id,
        actionLabel: 'Position prüfen',
        category: 'position'
      });
    } else if (entryToStop > 0 && distToStop < 1) {
      alerts.push({
        id: `${position.id}-near-stop`,
        severity: 'danger',
        title: `${position.underlying}: knapp über Stop`,
        message: `Nur ${distToStop.toFixed(1)}% bis zum Stop. Volatilität kann das in einer Bewegung wegwischen — Position eng beobachten.`,
        relatedPositionId: position.id,
        actionLabel: 'Beobachten',
        category: 'position'
      });
    } else if (entryToStop > 0 && distToStop < 3) {
      alerts.push({
        id: `${position.id}-watch-stop`,
        severity: 'warning',
        title: `${position.underlying}: nähert sich Stop`,
        message: `${distToStop.toFixed(1)}% bis zum Stop. Noch Puffer, aber Tendenz beachten.`,
        relatedPositionId: position.id,
        category: 'position'
      });
    }
  }

  if (latestPrice !== null && position.takeProfitPlanned !== null) {
    const distToTp = pct(position.takeProfitPlanned - latestPrice, position.takeProfitPlanned);
    if (latestPrice >= position.takeProfitPlanned) {
      alerts.push({
        id: `${position.id}-tp-hit`,
        severity: 'info',
        title: `${position.underlying}: TP1 erreicht`,
        message: `Take-Profit-Level erreicht. Eine Teilrealisierung (z.B. 50%) und Stop auf Entry trailen ist die übliche Profi-Antwort.`,
        relatedPositionId: position.id,
        actionLabel: 'Gewinnsicherung',
        category: 'position'
      });
    } else if (distToTp < 3) {
      alerts.push({
        id: `${position.id}-near-tp`,
        severity: 'info',
        title: `${position.underlying}: nahe TP1`,
        message: `Nur ${distToTp.toFixed(1)}% bis TP1. Plan für Teilverkauf bereit halten.`,
        relatedPositionId: position.id,
        category: 'position'
      });
    }
  }

  if (HEBEL_TYPES.has(position.instrumentType)) {
    alerts.push({
      id: `${position.id}-hebel`,
      severity: 'warning',
      title: `${position.underlying}: Hebelprodukt`,
      message: position.instrumentType === 'knockout'
        ? 'Knock-Out: Bei Erreichen der Knock-Out-Schwelle ist sofort Totalverlust möglich, auch innerhalb eines Tages.'
        : 'Optionsschein/Hebelprodukt: Totalverlust möglich. Stop-Loss schützt nicht zuverlässig gegen schnelle Sprünge oder Spread-Verluste.',
      relatedPositionId: position.id,
      category: 'product'
    });
  }

  return alerts;
}

function portfolioAlerts(positions: Position[], capital: number, profile: UserRiskProfile, limits: RiskLimits): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const open = positions.filter((p) => p.status === 'open');
  if (open.length === 0) return alerts;

  const hebelCount = open.filter((p) => HEBEL_TYPES.has(p.instrumentType)).length;
  if (hebelCount >= limits.maxHebelCount) {
    alerts.push({
      id: 'portfolio-hebel-concentration',
      severity: 'danger',
      title: `${hebelCount} Hebelprodukte gleichzeitig offen`,
      message: 'Mehrere Hebelprodukte gleichzeitig erhöhen das Risiko überproportional. Bei einem Marktrutsch reagieren sie alle in dieselbe Richtung.',
      category: 'portfolio'
    });
  }

  const byUnderlying = new Map<string, Position[]>();
  for (const p of open) {
    const key = p.underlying.toUpperCase();
    const arr = byUnderlying.get(key) ?? [];
    arr.push(p);
    byUnderlying.set(key, arr);
  }
  for (const [u, list] of byUnderlying.entries()) {
    if (list.length >= 2) {
      alerts.push({
        id: `portfolio-concentration-${u}`,
        severity: 'warning',
        title: `${u}: Konzentration in ${list.length} Positionen`,
        message: `Mehrere Trades auf denselben Basiswert — bei negativer Nachricht treffen sie alle gleichzeitig. Reduktion oder Konsolidierung prüfen.`,
        category: 'portfolio'
      });
    }
  }

  if (open.length >= limits.maxOpenPositions && profile !== 'very_speculative') {
    alerts.push({
      id: 'portfolio-too-many',
      severity: 'info',
      title: `${open.length} offene Positionen`,
      message: 'Viele parallele Trades sind schwer zu monitoren. Mental Bandwidth = Risiko-Faktor.',
      category: 'portfolio'
    });
  }

  if (capital > 0) {
    let totalRiskAtStop = 0;
    let positionsWithoutStop = 0;
    for (const p of open) {
      if (p.stopLossPlanned !== null) {
        const risk = Math.max(0, (p.entryPrice - p.stopLossPlanned) * p.positionSize);
        totalRiskAtStop += risk;
      } else {
        positionsWithoutStop += 1;
      }
    }
    const totalRiskPct = (totalRiskAtStop / capital) * 100;
    if (totalRiskPct > limits.maxPortfolioHeatPct) {
      alerts.push({
        id: 'portfolio-total-heat',
        severity: totalRiskPct > limits.maxPortfolioHeatPct * 2 ? 'critical' : 'danger',
        title: `Portfolio-Heat: ${totalRiskPct.toFixed(1)}% Risk offen`,
        message: `Summe der Stop-Risiken über alle offenen Positionen liegt bei ${totalRiskPct.toFixed(1)}% Kapital. Dein Limit: ${limits.maxPortfolioHeatPct}% (Profi-Maximum: ~6%). Drawdowns korrelieren — ein schlechter Tag kann mehrere Stops gleichzeitig triggern.`,
        category: 'portfolio'
      });
    }
    if (positionsWithoutStop >= 2) {
      alerts.push({
        id: 'portfolio-no-stops',
        severity: 'warning',
        title: `${positionsWithoutStop} Positionen ohne Stop`,
        message: 'Mehrere Positionen ohne Stop-Plan — Risk-Guardian kann das Gesamtrisiko nicht berechnen.',
        category: 'portfolio'
      });
    }
  }

  return alerts;
}

function marketAlerts(market: MarketContext, openPositions: number): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  if (market.todaysVerdict === 'no_trade') {
    alerts.push({
      id: 'market-no-trade',
      severity: 'info',
      title: 'Heute kein sauberer Trade',
      message: openPositions > 0
        ? 'Markt ist defensiv. Keine neuen Einstiege erzwingen. Offene Positionen normal weitermanagen.'
        : 'Markt ist defensiv. Cash-Quote halten und auf besseren Setup warten.',
      category: 'market'
    });
  }
  if (market.marketMood === 'risk-off') {
    alerts.push({
      id: 'market-risk-off',
      severity: 'warning',
      title: 'Marktmodus: Risk-off',
      message: 'Über 60% der beobachteten Coins sind 2%+ negativ. In Risk-off-Phasen treffen Drawdowns mehrere Positionen gleichzeitig.',
      category: 'market'
    });
  }
  return alerts;
}

export interface RiskGuardianReport {
  alerts: RiskAlert[];
  criticalCount: number;
  dangerCount: number;
  warningCount: number;
  infoCount: number;
  openPositions: number;
  positionsWithoutStop: number;
  generatedAt: string;
}

export function runRiskGuardian(
  positions: Position[],
  latestPrices: Record<string, number | null>,
  config: AccountConfig,
  profile: UserRiskProfile,
  market: MarketContext
): RiskGuardianReport {
  const open = positions.filter((p) => p.status === 'open');
  const capital = config.accountSize;
  const limits = config.riskLimits ?? DEFAULT_RISK_LIMITS;

  const alerts: RiskAlert[] = [];
  for (const p of open) {
    const priceKey = (p.ticker ?? p.underlying).toLowerCase();
    const latest = latestPrices[priceKey] ?? null;
    alerts.push(...positionAlerts(p, latest, capital, limits));
  }
  alerts.push(...portfolioAlerts(positions, capital, profile, limits));
  alerts.push(...marketAlerts(market, open.length));

  const severityWeight: Record<RiskSeverity, number> = { critical: 0, danger: 1, warning: 2, info: 3 };
  alerts.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity]);

  const positionsWithoutStop = open.filter((p) => p.stopLossPlanned === null).length;

  return {
    alerts,
    criticalCount: alerts.filter((a) => a.severity === 'critical').length,
    dangerCount: alerts.filter((a) => a.severity === 'danger').length,
    warningCount: alerts.filter((a) => a.severity === 'warning').length,
    infoCount: alerts.filter((a) => a.severity === 'info').length,
    openPositions: open.length,
    positionsWithoutStop,
    generatedAt: new Date().toISOString()
  };
}
