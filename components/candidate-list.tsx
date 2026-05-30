'use client';

import { useEffect, useState } from 'react';
import { MasterSignalReport, RankedCandidate, candidateStanding } from '@/lib/analysis/master-signal-engine';
import { AccountConfig, DEFAULT_CONFIG, loadConfig, saveConfig } from '@/lib/account-config';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { SafetyAssessment, evaluateSafety } from '@/lib/analysis/safety-gate';

const GRADE_STYLE: Record<SafetyAssessment['grade'], string> = {
  A: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
  B: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
  C: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
  D: 'border-rose-500/60 bg-rose-600/20 text-rose-200'
};

function safetyFor(c: RankedCandidate, report: MasterSignalReport, backtest?: BacktestSummary): SafetyAssessment {
  const userBrokerAvailable = c.brokers.includes('Coinbase') || c.brokers.includes('Scalable Capital');
  return evaluateSafety({
    passedCount: c.passedCount,
    marketMood: report.marketMood,
    btcRegime: report.btcRegime,
    isBtc: c.coinId === 'btc',
    structure: c.structure,
    nearSupport: c.nearSupport,
    crowdCautious: report.crowd.cautious,
    quoteVolume: c.quoteVolume,
    stopDistancePct: c.stopDistancePct,
    confirmed: c.confirmed,
    userBrokerAvailable,
    priceChangePct24h: c.priceChangePct24h,
    mode: report.mode,
    relStrengthVsBtc: c.relStrengthVsBtc,
    backtestEdge: backtest?.perAssetEdge[c.coinId] ?? null
  });
}

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(3);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}

const TIER_STYLE: Record<RankedCandidate['tier'], { label: string; chip: string }> = {
  strong: { label: 'STARK', chip: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' },
  standard: { label: 'OK', chip: 'border-sky-400/50 bg-sky-500/15 text-sky-200' },
  weak: { label: 'SCHWACH', chip: 'border-amber-400/50 bg-amber-500/15 text-amber-200' }
};

export function CandidateList({ report, backtest }: { report: MasterSignalReport; backtest?: BacktestSummary }) {
  const candidates = report.candidates;
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
    setMounted(true);
    const refresh = () => setConfig(loadConfig());
    window.addEventListener('trading-app:config-changed', refresh);
    return () => window.removeEventListener('trading-app:config-changed', refresh);
  }, []);

  if (candidates.length === 0) return null;

  const threshold = config.minConfluence;
  const setThreshold = (v: number) => saveConfig({ ...loadConfig(), minConfluence: v });

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Weitere Kandidaten</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Top-Setups im Universum, nach Konfluenz sortiert. „Kaufbar“ ab deiner Schwelle, darunter spekulativ.
          </p>
        </div>
        {mounted && (
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            Kauf-Schwelle
            <select
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
            >
              {[5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>≥{n}/12</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {mounted && threshold < 7 && (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/15 p-2.5 text-[10px] leading-relaxed text-amber-200/80">
          Schwelle unter 7 senken heißt: mehr Signale, aber statistisch schwächere. Nur mit kleinerer Positionsgröße und striktem Stop handeln.
        </p>
      )}

      <ul className="space-y-2">
        {candidates.map((c) => {
          const t = TIER_STYLE[c.tier];
          const standing = candidateStanding(c.passedCount, threshold);
          const safety = safetyFor(c, report, backtest);
          return (
            <li key={c.coinId} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-base font-bold text-white">{c.symbol}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${t.chip}`}>
                  {t.label} · {c.passedCount}/{c.totalCount}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${GRADE_STYLE[safety.grade]}`}
                  title={`Sicherheits-Score ${safety.score}/100`}
                >
                  Note {safety.grade}
                </span>
                {mounted && (
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      standing.actionable
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-600 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    {standing.label}
                  </span>
                )}
                {backtest?.perAssetEdge[c.coinId]?.winRatePct !== undefined && backtest.perAssetEdge[c.coinId].winRatePct !== null && (
                  <span className="font-mono text-[10px] text-slate-400">
                    Backtest <span className="font-bold text-emerald-300">{backtest.perAssetEdge[c.coinId].winRatePct}%</span>
                  </span>
                )}
                <span className="ml-auto font-mono text-[11px] text-slate-500">{c.brokers[0]}</span>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Entry</div>
                  <div className="font-mono text-xs font-bold text-white">${fmtPrice(c.entry)}</div>
                </div>
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-rose-400">Stop</div>
                  <div className="font-mono text-xs font-bold text-rose-200">${fmtPrice(c.stopLoss)}</div>
                  <div className="font-mono text-[9px] text-rose-400">−{c.stopDistancePct.toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-400">Ziel 1</div>
                  <div className="font-mono text-xs font-bold text-emerald-200">${fmtPrice(c.takeProfit1)}</div>
                  <div className="font-mono text-[9px] text-emerald-400">+{(c.stopDistancePct * c.rrTp1).toFixed(1)}%</div>
                </div>
              </div>

              <p className="mt-2 text-[11px] text-slate-400">{c.oneLineReason}.</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
