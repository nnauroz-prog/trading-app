'use client';

import { useEffect, useState } from 'react';
import { MasterSignalReport, describeSignalAction } from '@/lib/analysis/master-signal-engine';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { AccountConfig, DEFAULT_CONFIG, loadConfig } from '@/lib/account-config';

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

function marketSentence(report: MasterSignalReport): string {
  const moodText =
    report.marketMood === 'risk-on' ? 'der breite Markt steigt' :
    report.marketMood === 'risk-off' ? 'der breite Markt fällt (Risk-off)' :
    'der breite Markt ist gemischt';
  const btcText =
    report.btcRegime === 'bull' ? 'Bitcoin steht über der 200-Tage-Linie (Aufwärtstrend)' :
    report.btcRegime === 'bear' ? 'Bitcoin steht unter der 200-Tage-Linie (Abwärtstrend)' :
    'Bitcoin läuft seitwärts';
  const crowdText =
    report.crowd.state === 'fear' ? 'die Stimmung ist ängstlich (oft gute Einstiege)' :
    report.crowd.state === 'greed' ? (report.crowd.cautious ? 'die Stimmung ist extrem gierig (Vorsicht)' : 'die Stimmung ist leicht gierig') :
    'die Stimmung ist neutral';
  return `${btcText}, ${moodText}, ${crowdText}.`;
}

export function DailyBriefing({ report, backtest }: { report: MasterSignalReport; backtest: BacktestSummary }) {
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setConfig(loadConfig());
    setNow(new Date());
    setMounted(true);
    const r = () => setConfig(loadConfig());
    window.addEventListener('trading-app:config-changed', r);
    return () => window.removeEventListener('trading-app:config-changed', r);
  }, []);

  if (!mounted || !now) {
    return (
      <section className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">Dein Tagesbriefing</div>
        <p className="mt-2 text-sm text-slate-400">wird zusammengestellt …</p>
      </section>
    );
  }

  const todayFmt = now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
  const hour = Number.parseInt(now.toLocaleTimeString('de-DE', { hour: '2-digit', hour12: false, timeZone: 'Europe/Berlin' }), 10);
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  const action = describeSignalAction(report);
  const capital = config.accountSize;
  const riskAmount = capital * (config.maxRiskPct / 100);

  let recommendationProse: string;
  let recommendationTone: 'good' | 'bad' | 'neutral';
  if (action.verdict === 'BUY_NOW' && report.kind === 'trade') {
    recommendationTone = 'good';
    const sizeText = capital > 0
      ? ` Bei deinem Kapital von €${capital.toLocaleString('de-DE')} und ${config.maxRiskPct}% Risiko sind das maximal €${riskAmount.toFixed(2)} Verlust, wenn dein Stop reißt.`
      : ' Trag oben dein Kapital ein, dann rechne ich dir den €-Betrag aus.';
    recommendationProse = `Heute kannst du ${report.coin.symbol} kaufen — Einstieg ~$${fmtPrice(report.entry)}, Stop bei $${fmtPrice(report.stopLoss)}, erstes Ziel $${fmtPrice(report.takeProfit1)}.${sizeText}`;
  } else {
    const isRiskOff = report.kind === 'no_trade' && report.marketMood === 'risk-off';
    recommendationTone = isRiskOff ? 'bad' : 'neutral';
    const best = report.candidates[0];
    if (isRiskOff) {
      recommendationProse = `Heute lieber nichts kaufen. Der Markt ist Risk-off — auch gute Setups laufen in solchen Phasen oft schief. Cash halten ist eine Position.`;
    } else if (best) {
      const need = Math.max(0, 7 - best.passedCount);
      recommendationProse = `Heute keine sichere Kauf-Empfehlung. Das beste Setup wäre ${best.symbol} mit ${best.passedCount}/12 Bestätigungen${need > 0 ? ` — es fehlen ${need} bis zur Schwelle` : ''}. Lieber abwarten als zu früh einsteigen.`;
    } else {
      recommendationProse = 'Heute keine ausreichend starken Setups im 50-Coin-Universum. Cash halten ist eine Position.';
    }
  }

  const recColor =
    recommendationTone === 'good' ? 'border-emerald-400/40 bg-emerald-950/20' :
    recommendationTone === 'bad' ? 'border-rose-400/40 bg-rose-950/20' :
    'border-amber-400/40 bg-amber-950/15';

  const backtestSentence = backtest.safeTier
    ? `Die sicheren Signale lagen über die letzten ${backtest.periodDays} Tage bei ${backtest.safeTier.winRatePct}% Trefferquote${backtest.safeTier.tradeSharpe !== null ? ` (Sharpe ${backtest.safeTier.tradeSharpe.toFixed(2)})` : ''}${backtest.safeTier.medianHoldHours !== null ? `, typische Haltedauer ${backtest.safeTier.medianHoldHours}h` : ''}.`
    : null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">Dein Tagesbriefing</div>
          <h2 className="mt-1 text-base font-bold text-white sm:text-lg">{greeting}. {todayFmt}.</h2>
        </div>
      </div>

      {capital > 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-[12px] text-slate-300">
          Dein Konto: <span className="font-mono font-bold text-slate-100">€{capital.toLocaleString('de-DE')}</span>
          <span className="mx-2 text-slate-600">·</span>
          Risiko pro Trade: <span className="font-mono font-bold text-slate-100">{config.maxRiskPct}%</span>
          <span className="mx-2 text-slate-600">·</span>
          max Verlust pro Trade: <span className="font-mono font-bold text-rose-200">€{riskAmount.toFixed(2)}</span>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-[12px] text-amber-200/85">
          Noch kein Kapital hinterlegt — bitte unten unter „Ändern“ eintragen, dann werden die Empfehlungen mit deinen €-Beträgen berechnet.
        </div>
      )}

      <p className="text-sm leading-relaxed text-slate-200">
        <span className="font-semibold text-slate-100">Marktlage heute. </span>{marketSentence(report)}
      </p>

      <p className={`rounded-lg border p-3 text-sm leading-relaxed text-slate-100 ${recColor}`}>
        <span className="font-semibold">Was ich dir heute empfehle. </span>{recommendationProse}
      </p>

      {action.verdict === 'BUY_NOW' && action.horizonText && (
        <p className="text-[11px] text-slate-400">⏱ {action.horizonText}</p>
      )}

      {backtestSentence && (
        <p className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-400">Was die Historie sagt. </span>{backtestSentence}
        </p>
      )}
    </section>
  );
}
