'use client';

import { useEffect, useState } from 'react';
import { MasterSignalReport, TradeRecommendation } from '@/lib/analysis/master-signal-engine';
import { AccountConfig, DEFAULT_CONFIG, computeSizing, loadConfig } from '@/lib/account-config';

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(3);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}

function fmtMoney(value: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (Math.abs(value) >= 1000) return `${symbol}${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${value.toFixed(2)}`;
}

function fmtCoins(value: number): string {
  if (value >= 1) return value.toFixed(3);
  if (value >= 0.001) return value.toFixed(5);
  return value.toFixed(7);
}

function ChecklistBar({ passed, total }: { passed: number; total: number }) {
  const pct = (passed / total) * 100;
  const color = pct >= 75 ? 'bg-emerald-400' : pct >= 58 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bestätigungen</span>
        <span className="font-mono text-sm font-bold text-slate-100">{passed}/{total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TradeReadyCard({ trade }: { trade: TradeRecommendation }) {
  const [showDetails, setShowDetails] = useState(false);
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
    setMounted(true);
    const refresh = () => setConfig(loadConfig());
    window.addEventListener('trading-app:config-changed', refresh);
    return () => window.removeEventListener('trading-app:config-changed', refresh);
  }, []);

  const sizing = mounted ? computeSizing(config, trade.entry, trade.stopLoss, trade.takeProfit1, trade.takeProfit2) : null;
  const passed = trade.checks.filter((c) => c.passed);
  const failed = trade.checks.filter((c) => !c.passed);

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-emerald-500/20">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]" />
        {`Today's Trade · Ready`}
      </div>

      <h1 className="relative mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Kauf {sizing ? <span className="font-mono">{fmtCoins(sizing.positionSizeCoins)}</span> : ''}{' '}
        <span className="text-emerald-200">{trade.coin.symbol}</span>
      </h1>
      <p className="relative mt-1 text-sm text-slate-300">
        bei <span className="font-mono font-semibold text-white">${fmtPrice(trade.entry)}</span>
        {sizing && <> · <span className="font-mono">{fmtMoney(sizing.positionSizeQuote, config.currency)}</span> Einsatz</>}
        {' · '}über <span className="font-semibold text-emerald-300">{trade.brokers[0]}</span>
        {trade.brokers.length > 1 && <span className="text-slate-500"> (oder {trade.brokers.slice(1).join(', ')})</span>}
      </p>

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3">
          <div className="text-[10px] uppercase tracking-widest text-rose-400">Stop-Loss</div>
          <div className="mt-1 font-mono text-lg font-bold text-rose-200">${fmtPrice(trade.stopLoss)}</div>
          <div className="font-mono text-[10px] text-rose-400">−{trade.stopDistancePct.toFixed(2)}%</div>
          {sizing && <div className="mt-1 font-mono text-[10px] text-rose-300">Risk {fmtMoney(sizing.riskAmount, config.currency)}</div>}
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
          <div className="text-[10px] uppercase tracking-widest text-emerald-400">Ziel 1</div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-200">${fmtPrice(trade.takeProfit1)}</div>
          <div className="font-mono text-[10px] text-emerald-400">+{(trade.stopDistancePct * trade.rrTp1).toFixed(2)}%</div>
          {sizing && <div className="mt-1 font-mono text-[10px] text-emerald-300">+{fmtMoney(sizing.reward1Amount, config.currency)}</div>}
        </div>
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-900/30 p-3">
          <div className="text-[10px] uppercase tracking-widest text-emerald-300">Ziel 2</div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-100">${fmtPrice(trade.takeProfit2)}</div>
          <div className="font-mono text-[10px] text-emerald-300">+{(trade.stopDistancePct * trade.rrTp2).toFixed(2)}%</div>
          {sizing && <div className="mt-1 font-mono text-[10px] text-emerald-200">+{fmtMoney(sizing.reward2Amount, config.currency)}</div>}
        </div>
      </div>

      <div className="relative mt-5">
        <ChecklistBar passed={trade.passedCount} total={trade.totalCount} />
        <p className="mt-3 text-sm text-slate-200">
          <span className="font-semibold text-emerald-300">Warum jetzt: </span>{trade.oneLineReason}.
        </p>
      </div>

      {!sizing && mounted && (
        <p className="relative mt-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-950/15 p-3 text-xs text-amber-200/80">
          Konfiguriere oben dein Trading-Kapital, um Positionsgröße + €-Risk/€-Gewinn zu sehen.
        </p>
      )}

      <div className="relative mt-5">
        <button
          onClick={() => setShowDetails((s) => !s)}
          className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
        >
          {showDetails ? '▲ Details schließen' : '▼ Wie die App entschieden hat (12-Punkt-Konfluenz)'}
        </button>
      </div>

      {showDetails && (
        <div className="relative mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Multi-Timeframe-Konfluenz · 1h + 4h + 1d · Market-Regime: <span className="text-slate-300">{trade.marketRegime}</span>
          </div>
          {passed.length > 0 && (
            <div>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">✓ Bestätigt ({passed.length})</div>
              <ul className="mt-1 space-y-1">
                {passed.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-xs">
                    <span className="text-emerald-400">✓</span>
                    <span className="flex-1 text-slate-300"><span className="font-semibold">{c.label}</span> <span className="font-mono text-slate-500">{c.value}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {failed.length > 0 && (
            <div>
              <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-rose-300">✗ Fehlt ({failed.length})</div>
              <ul className="mt-1 space-y-1">
                {failed.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-xs">
                    <span className="text-rose-400">✗</span>
                    <span className="flex-1 text-slate-400"><span className="font-semibold">{c.label}</span> <span className="font-mono text-slate-500">{c.value}</span> · {c.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-[11px] sm:grid-cols-4">
            <div>
              <div className="text-slate-500">Stop-Methode</div>
              <div className="font-mono text-slate-200">1.5 × ATR(1h)</div>
            </div>
            <div>
              <div className="text-slate-500">ATR(1h)</div>
              <div className="font-mono text-slate-200">${fmtPrice(trade.atr1h)}</div>
            </div>
            <div>
              <div className="text-slate-500">R:R Ziel-1</div>
              <div className="font-mono text-emerald-300">1:{trade.rrTp1.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-slate-500">R:R Ziel-2</div>
              <div className="font-mono text-emerald-300">1:{trade.rrTp2.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}

      <p className="relative mt-4 rounded-lg border border-amber-500/20 bg-amber-950/15 p-3 text-[11px] leading-relaxed text-amber-200/80">
        <strong className="text-amber-300">Trader-Regel:</strong> {`50% bei Ziel 1 schließen, Stop dann auf Entry trailen für den Rest. Nie mehr als 1-2% Kapital pro Trade riskieren. Stop-Loss respektieren — auch wenn's wehtut.`}
      </p>
    </section>
  );
}

function NoTradeCard({ report }: { report: Exclude<MasterSignalReport, TradeRecommendation> }) {
  const best = report.bestCandidate;
  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-slate-700 bg-gradient-to-br from-slate-950 to-slate-900/40 p-6">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-500/5 blur-3xl" />
      <div className="relative flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {`Today's Verdict · No Trade`}
      </div>
      <h1 className="relative mt-2 text-3xl font-bold tracking-tight text-amber-100 sm:text-4xl">
        Heute besser nicht kaufen
      </h1>
      <p className="relative mt-1 text-sm text-slate-300">
        Cash halten und auf besseren Setup warten. Markt-Regime: <span className="font-semibold text-slate-200">{report.marketRegime}</span> · Stimmung: <span className="font-semibold text-slate-200">{report.marketMood}</span>
      </p>

      {best && (
        <div className="relative mt-5 space-y-3 rounded-xl border border-amber-500/30 bg-slate-950/60 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-300">
              Wenn du trotzdem traden willst — bester Setup im Universum (niedrige Konfidenz)
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-2xl font-bold text-white">{best.coin.symbol}</span>
              <span className="font-mono text-sm text-slate-400">über {best.brokers[0]}</span>
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {best.passedCount}/{best.totalCount} confluences · low conf
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Entry</div>
              <div className="mt-1 font-mono text-base font-bold text-white">${fmtPrice(best.entry)}</div>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-rose-400">Stop-Loss</div>
              <div className="mt-1 font-mono text-base font-bold text-rose-200">${fmtPrice(best.stopLoss)}</div>
              <div className="font-mono text-[10px] text-rose-400">−{best.stopDistancePct.toFixed(2)}%</div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400">Ziel 1</div>
              <div className="mt-1 font-mono text-base font-bold text-emerald-200">${fmtPrice(best.takeProfit1)}</div>
              <div className="font-mono text-[10px] text-emerald-400">+{(best.stopDistancePct * best.rrTp1).toFixed(2)}%</div>
            </div>
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-900/30 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-emerald-300">Ziel 2</div>
              <div className="mt-1 font-mono text-base font-bold text-emerald-100">${fmtPrice(best.takeProfit2)}</div>
              <div className="font-mono text-[10px] text-emerald-300">+{(best.stopDistancePct * best.rrTp2).toFixed(2)}%</div>
            </div>
          </div>

          <div>
            <ChecklistBar passed={best.passedCount} total={best.totalCount} />
            <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">
              {`Position-Size halbieren oder vierteln bei diesem Konfidenz-Level. Stop religiös einhalten. Erst Trade wenn ≥7/12 Bestätigungen + Markt unterstützt — das ist der ehrliche Pfad. Was hier steht ist „falls du eh handeln musst", nicht „App-Empfehlung".`}
            </p>
          </div>
        </div>
      )}

      <div className="relative mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Warum kein Trade</div>
        <ul className="mt-2 space-y-1.5">
          {report.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative mt-4 rounded-lg border border-amber-500/20 bg-amber-950/15 p-3 text-[11px] leading-relaxed text-amber-200/85">
        <strong className="text-amber-300">Trader-Regel:</strong> Cash-Quote ist auch eine Position. Setze nur ein, wenn das System ≥7/12 Bestätigungen sieht UND der Markt das Setup unterstützt. Nicht jeder Tag ist ein Trading-Tag.
      </p>
    </section>
  );
}

export function TodayTradeCard({ report }: { report: MasterSignalReport }) {
  if (report.kind === 'trade') return <TradeReadyCard trade={report} />;
  return <NoTradeCard report={report} />;
}
