import { Position } from '@/lib/types/positions';
import { RiskGuardianReport } from '@/lib/risk/risk-guardian';
import { AccountConfig } from '@/lib/account-config';

export type ActionSeverity = 'urgent' | 'action' | 'opportunity' | 'discipline' | 'info';

export interface ActionItem {
  id: string;
  priority: number;
  severity: ActionSeverity;
  title: string;
  detail: string;
  relatedAsset?: string;
}

export interface SignalSummary {
  kind: 'trade' | 'no_trade';
  coinSymbol: string | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  confidence: number | null;
  passedCount: number | null;
  totalCount: number | null;
  brokers: string[];
  marketMood: 'risk-on' | 'neutral' | 'risk-off';
  marketRegime: 'bull' | 'bear' | 'sideways';
}

const SEVERITY_RANK: Record<ActionSeverity, number> = {
  urgent: 0,
  action: 1,
  opportunity: 2,
  discipline: 3,
  info: 4
};

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function fmtMoney(value: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (value >= 1000) return `${symbol}${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${value.toFixed(2)}`;
}

export function buildActionPlan(
  signal: SignalSummary,
  riskReport: RiskGuardianReport,
  positions: Position[],
  config: AccountConfig
): ActionItem[] {
  const items: ActionItem[] = [];

  // 1. Critical + danger risk alerts → urgent actions
  for (const alert of riskReport.alerts) {
    if (alert.severity === 'critical' || alert.severity === 'danger') {
      items.push({
        id: `risk-${alert.id}`,
        priority: alert.severity === 'critical' ? 1 : 3,
        severity: alert.severity === 'critical' ? 'urgent' : 'action',
        title: alert.title,
        detail: alert.message + (alert.actionLabel ? ` → ${alert.actionLabel}` : ''),
        relatedAsset: alert.relatedPositionId
      });
    }
  }

  // 2. Near-TP positions → secure profit
  const open = positions.filter((p) => p.status === 'open');

  // 3. Signal → opportunity or discipline
  if (signal.kind === 'trade' && signal.coinSymbol && signal.entry !== null) {
    const riskAmount = config.accountSize > 0 ? (config.accountSize * config.maxRiskPct) / 100 : null;
    const sizingNote = riskAmount !== null
      ? ` Max-Risk bei deinem Kapital: ${fmtMoney(riskAmount, config.currency)} (${config.maxRiskPct}%).`
      : ' Kapital konfigurieren für konkrete Positionsgröße.';
    items.push({
      id: 'signal-entry',
      priority: 2,
      severity: 'opportunity',
      title: `Möglicher Einstieg: ${signal.coinSymbol}`,
      detail: `Setup mit ${signal.passedCount}/${signal.totalCount} Bestätigungen (${signal.confidence}% Konfidenz). Entry ~$${fmtPrice(signal.entry)}, Stop $${signal.stopLoss !== null ? fmtPrice(signal.stopLoss) : '—'}, Ziel $${signal.takeProfit1 !== null ? fmtPrice(signal.takeProfit1) : '—'} über ${signal.brokers[0] ?? 'Spot-Broker'}.${sizingNote} Nur einsteigen wenn es zu deinem Plan passt — niemals all-in.`,
      relatedAsset: signal.coinSymbol
    });
  } else {
    items.push({
      id: 'signal-no-trade',
      priority: 5,
      severity: 'discipline',
      title: 'Heute keine neuen Einstiege erzwingen',
      detail: signal.marketMood === 'risk-off'
        ? 'Markt ist Risk-off — die Mehrheit der Coins fällt. In solchen Phasen laufen auch gute Setups oft schief. Cash halten ist heute die beste Position.'
        : `Kein Setup über der Trade-Schwelle (≥7/12 Bestätigungen). Bester Kandidat reicht nicht. Geduld ist Teil des Edges — nicht jeder Tag ist ein Trading-Tag.`
    });
  }

  // 4. If holding positions but no critical alerts → maintenance reminder
  if (open.length > 0 && riskReport.criticalCount === 0) {
    items.push({
      id: 'maintain-positions',
      priority: 6,
      severity: 'info',
      title: `${open.length} offene Position(en) managen`,
      detail: 'Keine akuten Risiken. Trotzdem: Stops nachziehen wenn im Gewinn (Trailing), Thesis prüfen ob noch gültig. Gewinner laufen lassen, Verlierer am Stop schließen.'
    });
  }

  // 5. Always: discipline anchor
  items.push({
    id: 'discipline-anchor',
    priority: 9,
    severity: 'discipline',
    title: 'Grundregeln heute',
    detail: 'Max 1-2% Kapital pro Trade riskieren · Stop-Loss IMMER setzen und einhalten · Bei TP1 Teilgewinn sichern · Keine emotionalen Entscheidungen · Kein Trade ohne klaren Plan. Vermögensaufbau ist langsam und langweilig — das ist gut so.'
  });

  return items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  });
}

export interface CompoundProjection {
  startCapital: number;
  winRate: number;
  riskPerTradePct: number;
  rewardRiskRatio: number;
  tradesPerMonth: number;
  expectancyR: number;
  monthlyGrowthPct: number;
  months: Array<{ month: number; capital: number }>;
  realistic: boolean;
}

export function computeCompoundProjection(
  startCapital: number,
  winRate: number,
  riskPerTradePct: number,
  rewardRiskRatio: number,
  tradesPerMonth: number,
  horizonMonths = 24
): CompoundProjection {
  // Expectancy in R-multiples: win pays rewardRiskRatio R, loss costs 1 R
  const expectancyR = winRate * rewardRiskRatio - (1 - winRate) * 1;
  // Per-trade expected return on capital = expectancyR * riskPerTrade
  const perTradeReturn = (expectancyR * riskPerTradePct) / 100;
  const monthlyGrowth = perTradeReturn * tradesPerMonth;

  const months: Array<{ month: number; capital: number }> = [{ month: 0, capital: startCapital }];
  let capital = startCapital;
  for (let m = 1; m <= horizonMonths; m++) {
    capital = capital * (1 + monthlyGrowth);
    months.push({ month: m, capital });
  }

  return {
    startCapital,
    winRate,
    riskPerTradePct,
    rewardRiskRatio,
    tradesPerMonth,
    expectancyR,
    monthlyGrowthPct: monthlyGrowth * 100,
    months,
    realistic: expectancyR > 0
  };
}
