'use client';

import { useEffect, useState } from 'react';
import { MasterSignalReport, describeSignalAction } from '@/lib/analysis/master-signal-engine';
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

type Theme = { box: string; eyebrow: string; headline: string };

const THEMES: Record<'buy' | 'wait' | 'danger', Theme> = {
  buy: {
    box: 'border-emerald-400/60 bg-emerald-950/30',
    eyebrow: 'text-emerald-400',
    headline: 'text-emerald-100'
  },
  wait: {
    box: 'border-amber-400/50 bg-amber-950/20',
    eyebrow: 'text-amber-400',
    headline: 'text-amber-100'
  },
  danger: {
    box: 'border-rose-500/50 bg-rose-950/25',
    eyebrow: 'text-rose-400',
    headline: 'text-rose-100'
  }
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
  const isBuy = action.verdict === 'BUY_NOW';
  const isRiskOff = report.kind === 'no_trade' && report.marketMood === 'risk-off';

  const themeKey: 'buy' | 'wait' | 'danger' = isBuy ? 'buy' : isRiskOff ? 'danger' : 'wait';
  const theme = THEMES[themeKey];

  const sizing =
    mounted && report.kind === 'trade' && config.accountSize > 0
      ? computeSizing(config, report.entry, report.stopLoss, report.takeProfit1, report.takeProfit2)
      : null;

  const headline = isBuy ? 'HEUTE: KAUFEN' : isRiskOff ? 'HEUTE: FINGER WEG' : 'HEUTE: WARTEN';

  return (
    <section className={`rounded-2xl border-2 p-5 ${theme.box}`} aria-label="Was du jetzt tun sollst">
      <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] ${theme.eyebrow}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${isBuy ? 'bg-emerald-400' : isRiskOff ? 'bg-rose-400' : 'bg-amber-400'}`} />
        Was du jetzt tun sollst
      </div>

      <h2 className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${theme.headline}`}>{headline}</h2>

      {isBuy && report.kind === 'trade' ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          Kauf <span className="font-bold text-white">{report.coin.symbol}</span>
          {sizing && (
            <>
              {' '}für <span className="font-bold text-white">{fmtMoney(sizing.positionSizeQuote, config.currency)}</span>
            </>
          )}
          . Stell sofort einen Verkauf-Stopp bei <span className="font-mono font-semibold text-rose-200">${fmtPrice(report.stopLoss)}</span> ein
          {sizing && (
            <>
              {' '}— fällt der Kurs dahin, bist du raus und verlierst höchstens{' '}
              <span className="font-bold text-rose-200">{fmtMoney(sizing.riskAmount, config.currency)}</span>
            </>
          )}
          . Erstes Ziel zum Gewinnmitnehmen: <span className="font-mono font-semibold text-emerald-200">${fmtPrice(report.takeProfit1)}</span>.
        </p>
      ) : isRiskOff ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          Der Markt ist heute schwach — die meisten Coins fallen. Heute <span className="font-semibold text-rose-100">nichts kaufen</span>.
          An solchen Tagen verlieren auch gute Setups oft Geld. Abwarten ist die richtige Entscheidung.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          Heute gibt es <span className="font-semibold text-amber-100">kein gutes Kauf-Signal</span>. Am besten nichts kaufen und abwarten.
          Geduld kostet nichts — ein schlechter Trade schon.
        </p>
      )}

      {isBuy && !sizing && mounted && (
        <p className="mt-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-950/20 p-2.5 text-xs text-amber-200/85">
          Trag oben unter „Ändern“ dein Kapital ein, dann rechne ich dir den genauen €-Betrag und dein maximales Risiko aus.
        </p>
      )}

      <p className="mt-2 text-xs text-slate-400">
        {isBuy ? 'Warum: Mehrere Signale zeigen gleichzeitig nach oben.' : 'Warum: Die Signale sind noch nicht stark genug für einen Kauf.'}
      </p>
    </section>
  );
}
