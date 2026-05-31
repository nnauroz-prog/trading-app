import { AgentVerdict } from '@/lib/agents/personas';
import { positionSizing } from '@/lib/calculators';
import { PositionManagerReport } from '@/lib/agents/sub-agents';

export interface TradeMemo {
  firma: AgentVerdict['persona'];
  firmaName: string;
  coin: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  steps: string[];
  positionSizeAt10k: string; // e.g. "0.05 BTC (~ 5000 €)"
  whatKillsIt: string[];
}

// Generates a written trade memo for a BUY-verdict firma. Includes step-by-step
// instructions, position sizing math (for a 10k € reference account), and
// invalidation conditions.
export function generateTradeMemo(verdict: AgentVerdict): TradeMemo | null {
  if (verdict.verdict !== 'BUY' || !verdict.target) return null;
  const t = verdict.target;
  const positionAgent = verdict.team.find((m) => m.role === 'position') as PositionManagerReport | undefined;
  const riskPct = positionAgent?.suggestedAccountRiskPct ?? (verdict.persona === 'conservative' ? 1 : verdict.persona === 'balanced' ? 2 : 3);

  // Reference account: 10 000 € → derive size.
  const sizing = positionSizing({ accountBalance: 10_000, riskPerTradePct: riskPct, entryPrice: t.entry, stopPrice: t.stopLoss });

  const steps: string[] = [];

  // Step 1: Limit-Order setzen.
  if (verdict.persona === 'conservative') {
    steps.push(`Setze eine Limit-Order bei ${t.entry.toFixed(t.entry >= 1 ? 2 : 4)}$ — nicht jagen, wenn der Kurs schon dadurch ist.`);
  } else if (verdict.persona === 'aggressive') {
    steps.push(`Marktorder oder Limit nahe ${t.entry.toFixed(t.entry >= 1 ? 2 : 4)}$ — schnell rein, der Trend läuft.`);
  } else {
    steps.push(`Limit-Order bei ${t.entry.toFixed(t.entry >= 1 ? 2 : 4)}$, maximal 0.3% Slippage akzeptieren.`);
  }

  // Step 2: Stop sofort setzen.
  steps.push(`Stop-Loss sofort bei ${t.stopLoss.toFixed(t.stopLoss >= 1 ? 2 : 4)}$ platzieren — bevor du den Bildschirm zumachst.`);

  // Step 3: Position-Größe.
  steps.push(
    `Bei einem 10 000 € Account: Position-Größe ~${sizing.positionSize.toFixed(t.entry >= 100 ? 4 : 2)} ${t.symbol} ` +
    `(${sizing.notional.toFixed(0)} € Notional, ${sizing.riskAmount.toFixed(0)} € Risiko).`
  );

  // Step 4: Take-Profit-Strategie.
  if (verdict.persona === 'conservative') {
    steps.push(`Erstes Ziel ${t.takeProfit1.toFixed(t.takeProfit1 >= 1 ? 2 : 4)}$: dort 50% verkaufen, Stop auf Einstand nachziehen. Rest auf Ziel 2 ${t.takeProfit2.toFixed(t.takeProfit2 >= 1 ? 2 : 4)}$ laufen lassen.`);
  } else if (verdict.persona === 'aggressive') {
    steps.push(`Volle Position bis Ziel 1 ${t.takeProfit1.toFixed(t.takeProfit1 >= 1 ? 2 : 4)}$ — schnell raus, kein Halten für Ziel 2.`);
  } else {
    steps.push(`Ziel 1 ${t.takeProfit1.toFixed(t.takeProfit1 >= 1 ? 2 : 4)}$: 70% verkaufen, Stop auf Einstand. Rest auf Ziel 2.`);
  }

  // Step 5: Disziplin.
  steps.push(`Bei Stop-Hit: Position glatt schließen, KEIN Nachkaufen. Verlust akzeptieren ist Teil des Spiels.`);

  // What invalidates the setup.
  const whatKillsIt: string[] = [
    `Kurs schließt unter ${t.stopLoss.toFixed(t.stopLoss >= 1 ? 2 : 4)}$ — Setup ungültig.`,
    `BTC bricht stark ein (>5% in 24h) — System-Risiko, alle Positionen prüfen.`,
    `Hoch-impact Makro-Termin (FOMC, CPI) in <12h — vor Position warten oder Position reduzieren.`
  ];
  if (verdict.persona === 'conservative') {
    whatKillsIt.push(`News-Lage zum Coin dreht klar bärisch — Position vor Stop schon glatt stellen.`);
  }

  return {
    firma: verdict.persona,
    firmaName: verdict.name,
    coin: t.symbol,
    entry: t.entry,
    stop: t.stopLoss,
    target1: t.takeProfit1,
    target2: t.takeProfit2,
    steps,
    positionSizeAt10k: `${sizing.positionSize.toFixed(t.entry >= 100 ? 4 : 2)} ${t.symbol} (~${sizing.notional.toFixed(0)} €) bei 10 000 € Account, ${riskPct.toFixed(1)}% Risk`,
    whatKillsIt
  };
}
