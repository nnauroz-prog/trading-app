'use client';

import { useEffect } from 'react';
import { MasterSignalReport, describeSignalAction } from '@/lib/analysis/master-signal-engine';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { evaluateSafety } from '@/lib/analysis/safety-gate';
import { AgentDecision, recordDecision, todayIsoBerlin } from '@/lib/agent-memory';

// Headless: silently records today's signal into the agent's local memory so a
// per-day decision log accrues over time. No UI.
export function AgentRecorder({ report, backtest }: { report: MasterSignalReport; backtest: BacktestSummary }) {
  useEffect(() => {
    const action = describeSignalAction(report);
    const target = report.candidates[0] ?? null;
    let safetyGrade: AgentDecision['safetyGrade'] = null;
    let safetyScore: number | null = null;
    if (target) {
      const userBrokerAvailable = target.brokers.includes('Coinbase') || target.brokers.includes('Scalable Capital');
      const safety = evaluateSafety({
        passedCount: target.passedCount,
        marketMood: report.marketMood,
        btcRegime: report.btcRegime,
        isBtc: target.coinId === 'btc',
        structure: target.structure,
        nearSupport: target.nearSupport,
        crowdCautious: report.crowd.cautious,
        quoteVolume: target.quoteVolume,
        stopDistancePct: target.stopDistancePct,
        confirmed: target.confirmed,
        userBrokerAvailable,
        priceChangePct24h: target.priceChangePct24h,
        mode: report.mode,
        relStrengthVsBtc: target.relStrengthVsBtc,
        backtestEdge: backtest.perAssetEdge[target.coinId] ?? null
      });
      safetyGrade = safety.grade;
      safetyScore = safety.score;
    }

    const buyTarget = action.verdict === 'BUY_NOW' && report.kind === 'trade'
      ? { symbol: report.coin.symbol, entry: report.entry, stopLoss: report.stopLoss, takeProfit1: report.takeProfit1, passedCount: report.passedCount, totalCount: report.totalCount }
      : target
        ? { symbol: target.symbol, entry: target.entry, stopLoss: target.stopLoss, takeProfit1: target.takeProfit1, passedCount: target.passedCount, totalCount: target.totalCount }
        : null;

    const decision: AgentDecision = {
      date: todayIsoBerlin(),
      recordedAt: Date.now(),
      verdict: action.verdict,
      coin: buyTarget?.symbol ?? null,
      entry: buyTarget?.entry ?? null,
      stopLoss: buyTarget?.stopLoss ?? null,
      takeProfit1: buyTarget?.takeProfit1 ?? null,
      passedCount: buyTarget?.passedCount ?? null,
      totalCount: buyTarget?.totalCount ?? null,
      safetyGrade,
      safetyScore,
      marketMood: report.marketMood,
      btcRegime: report.btcRegime,
      reason: action.headline
    };
    recordDecision(decision);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.generatedAt]);

  return null;
}
