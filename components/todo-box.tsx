'use client';

import { useEffect, useState } from 'react';
import { MasterSignalReport, RankedCandidate, TradeBlock, describeSignalAction, shouldEmitTrade } from '@/lib/analysis/master-signal-engine';
import { AccountConfig, DEFAULT_CONFIG, computeSizing, loadConfig } from '@/lib/account-config';

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}

function fmtMoney(value: number, currency: 'EUR' | 'USD'): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (Math.abs(value) >= 1000) return `${symbol}${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${value.toFixed(2)}`;
}

function blockReasonText(reason: TradeBlock): string {
  switch (reason) {
    case 'risk-off': return 'der breite Markt fällt gerade (risk-off)';
    case 'btc-bear': return 'Bitcoin (Leitmarkt) ist bärisch';
    case 'downtrend-structure': return 'die Kurs-Struktur zeigt nach unten';
    case 'crowd-extreme': return 'die Stimmung ist extrem gierig (überfüllte Long-Seite)';
    default: return 'der Markt-Kontext passt nicht';
  }
}

type Mode = 'app-buy' | 'spec-buy' | 'blocked-buy' | 'risk-off-wait' | 'wait';

const THEMES: Record<'green' | 'amber' | 'red', { box: string; eyebrow: string; dot: string; headline: string }> = {
  green: { box: 'border-emerald-400/60 bg-emerald-950/30', eyebrow: 'text-emerald-400', dot: 'bg-emerald-400', headline: 'text-emerald-100' },
  amber: { box: 'border-amber-400/50 bg-amber-950/20', eyebrow: 'text-amber-400', dot: 'bg-amber-400', headline: 'text-amber-100' },
  red: { box: 'border-rose-500/50 bg-rose-950/25', eyebrow: 'text-rose-400', dot: 'bg-rose-400', headline: 'text-rose-100' }
};

export function TodoBox({ report }: { report: MasterSignalReport }) {
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
    setMounted(true);
    const refresh = () => setConfig(loadConfig());
    window.addEventListener('trading-app:config-changed', refresh);
    return () => window.removeEventListener('trading-app:config-changed', refresh);
  }, []);

  const action = describeSignalAction(report);
  const appBuys = action.verdict === 'BUY_NOW';

  // Re-evaluate the best candidate against the user's own (possibly lowered) threshold.
  const topCandidate: RankedCandidate | null = !appBuys ? report.candidates[0] ?? null : null;
  const userThreshold = config.minConfluence;
  const userQualifies = !!topCandidate && topCandidate.passedCount >= userThreshold;
  const userGate =
    mounted && topCandidate
      ? shouldEmitTrade({
          passedCount: topCandidate.passedCount,
          threshold: userThreshold,
          isBtc: topCandidate.coinId === 'btc',
          marketMood: report.marketMood,
          btcRegime: report.btcRegime,
          structure: report.marketStructure,
          crowdCautious: report.crowd.cautious
        })
      : null;

  let mode: Mode;
  if (appBuys) mode = 'app-buy';
  else if (mounted && userQualifies && userGate?.emit) mode = 'spec-buy';
  else if (mounted && userQualifies && userGate && !userGate.emit) mode = 'blocked-buy';
  else if (report.kind === 'no_trade' && report.marketMood === 'risk-off') mode = 'risk-off-wait';
  else mode = 'wait';

  const buyTarget =
    mode === 'app-buy' && report.kind === 'trade'
      ? { symbol: report.coin.symbol, entry: report.entry, stopLoss: report.stopLoss, tp1: report.takeProfit1, tp2: report.takeProfit2, passed: report.passedCount }
      : (mode === 'spec-buy' || mode === 'blocked-buy') && topCandidate
        ? { symbol: topCandidate.symbol, entry: topCandidate.entry, stopLoss: topCandidate.stopLoss, tp1: topCandidate.takeProfit1, tp2: topCandidate.takeProfit2, passed: topCandidate.passedCount }
        : null;

  const sizing =
    mounted && buyTarget && config.accountSize > 0
      ? computeSizing(config, buyTarget.entry, buyTarget.stopLoss, buyTarget.tp1, buyTarget.tp2)
      : null;

  const theme = mode === 'app-buy' ? THEMES.green : mode === 'spec-buy' ? THEMES.amber : mode === 'blocked-buy' || mode === 'risk-off-wait' ? THEMES.red : THEMES.amber;
  const headline =
    mode === 'app-buy' ? 'HEUTE: KAUFEN' :
    mode === 'spec-buy' ? 'SPEKULATIV KAUFBAR' :
    mode === 'blocked-buy' ? 'NUR AUF EIGENES RISIKO' :
    mode === 'risk-off-wait' ? 'HEUTE: FINGER WEG' :
    'HEUTE: WARTEN';

  return (
    <section className={`rounded-2xl border-2 p-5 ${theme.box}`} aria-label="Was du jetzt tun sollst">
      <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] ${theme.eyebrow}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
        Was du jetzt tun sollst
      </div>

      <h2 className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${theme.headline}`}>{headline}</h2>

      {(mode === 'app-buy' || mode === 'spec-buy') && buyTarget ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          Kauf <span className="font-bold text-white">{buyTarget.symbol}</span>
          {sizing && <> für <span className="font-bold text-white">{fmtMoney(sizing.positionSizeQuote, config.currency)}</span></>}.
          Stell sofort einen Verkauf-Stopp bei <span className="font-mono font-semibold text-rose-200">${fmtPrice(buyTarget.stopLoss)}</span> ein
          {sizing && <> — fällt der Kurs dahin, verlierst du höchstens <span className="font-bold text-rose-200">{fmtMoney(sizing.riskAmount, config.currency)}</span></>}.
          Erstes Ziel: <span className="font-mono font-semibold text-emerald-200">${fmtPrice(buyTarget.tp1)}</span>.
          {mode === 'spec-buy' && <span className="text-amber-200"> Spekulativ (nur {buyTarget.passed}/12) — kleiner sizen.</span>}
        </p>
      ) : null}

      {(mode === 'app-buy' || mode === 'spec-buy') && action.horizonText && (
        <p className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-2.5 text-[11px] leading-relaxed text-slate-300">
          ⏱ <span className="font-semibold">Haltedauer:</span> {action.horizonText}
        </p>
      )}

      {mode === 'blocked-buy' && buyTarget && (
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          Nach deiner Schwelle (≥{userThreshold}/12) wäre <span className="font-bold text-white">{buyTarget.symbol}</span> ({buyTarget.passed}/12) kaufbar —
          <span className="font-semibold text-rose-100"> aber {blockReasonText(userGate?.blockedReason ?? null)}</span>.
          Profi-Empfehlung: warten. Wenn du trotzdem kaufst, dann klein und mit Stopp bei <span className="font-mono font-semibold text-rose-200">${fmtPrice(buyTarget.stopLoss)}</span>.
        </p>
      )}

      {mode === 'risk-off-wait' && (
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          Der Markt ist heute schwach — die meisten Coins fallen. Heute <span className="font-semibold text-rose-100">nichts kaufen</span>.
          An solchen Tagen verlieren auch gute Setups oft Geld. Abwarten ist die richtige Entscheidung.
        </p>
      )}

      {mode === 'wait' && (
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          Heute gibt es <span className="font-semibold text-amber-100">kein gutes Kauf-Signal</span>. Am besten nichts kaufen und abwarten.
          Geduld kostet nichts — ein schlechter Trade schon.
        </p>
      )}

      {(mode === 'app-buy' || mode === 'spec-buy') && !sizing && mounted && (
        <p className="mt-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-950/20 p-2.5 text-xs text-amber-200/85">
          Trag oben unter „Ändern“ dein Kapital ein, dann rechne ich dir den genauen €-Betrag und dein maximales Risiko aus.
        </p>
      )}

      <p className="mt-2 text-xs text-slate-400">
        {mode === 'app-buy'
          ? 'Warum: Mehrere Signale zeigen gleichzeitig nach oben.'
          : mode === 'spec-buy'
            ? 'Warum: Erfüllt deine eingestellte Schwelle und der Markt-Kontext steht dem nicht im Weg.'
            : mode === 'blocked-buy'
              ? 'Warum: Du hast die Schwelle gesenkt, aber der Markt-Kontext bleibt riskant.'
              : 'Warum: Die Signale sind noch nicht stark genug für einen Kauf.'}
      </p>
    </section>
  );
}
