'use client';

import { useEffect, useState } from 'react';
import { ActionItem, ActionSeverity, SignalSummary, buildActionPlan, computeCompoundProjection } from '@/lib/action-plan';
import { POSITIONS_CHANGED_EVENT, loadPositions } from '@/lib/positions';
import { runRiskGuardian } from '@/lib/risk/risk-guardian';
import { AccountConfig, DEFAULT_CONFIG, loadConfig } from '@/lib/account-config';
import { loadUserProfile } from '@/lib/user-profile';
import { Skeleton } from '@/components/skeleton';

function severityStyle(s: ActionSeverity): { icon: string; border: string; bg: string; text: string; badge: string } {
  switch (s) {
    case 'urgent': return { icon: '🛑', border: 'border-rose-500/50', bg: 'bg-rose-950/25', text: 'text-rose-200', badge: 'Sofort' };
    case 'action': return { icon: '⚠', border: 'border-amber-500/40', bg: 'bg-amber-950/20', text: 'text-amber-200', badge: 'Handeln' };
    case 'opportunity': return { icon: '🎯', border: 'border-emerald-500/40', bg: 'bg-emerald-950/20', text: 'text-emerald-200', badge: 'Chance' };
    case 'discipline': return { icon: '🧭', border: 'border-slate-700', bg: 'bg-slate-950/40', text: 'text-slate-200', badge: 'Disziplin' };
    case 'info': return { icon: 'ℹ', border: 'border-sky-500/30', bg: 'bg-sky-950/15', text: 'text-sky-200', badge: 'Info' };
  }
}

function fmtMoney(value: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (value >= 1000) return `${symbol}${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${value.toFixed(0)}`;
}

function CompoundProjection({ config }: { config: AccountConfig }) {
  const [winRate, setWinRate] = useState(0.55);
  const start = config.accountSize > 0 ? config.accountSize : 1000;
  const proj = computeCompoundProjection(start, winRate, config.maxRiskPct > 0 ? config.maxRiskPct : 1, 1.5, 12, 24);
  const final = proj.months[proj.months.length - 1].capital;
  const year1 = proj.months[12].capital;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Realistischer Pfad (kein Versprechen)</h3>
        <div className="flex items-center gap-1 text-[10px]">
          {[0.5, 0.55, 0.6].map((w) => (
            <button
              key={w}
              onClick={() => setWinRate(w)}
              className={`rounded px-1.5 py-0.5 font-mono ${Math.abs(winRate - w) < 0.001 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-900 text-slate-500'}`}
            >
              {(w * 100).toFixed(0)}% WR
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-slate-500">Start</div>
          <div className="font-mono text-sm font-bold text-slate-200">{fmtMoney(start, config.currency)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">nach 1 Jahr</div>
          <div className={`font-mono text-sm font-bold ${year1 >= start ? 'text-emerald-300' : 'text-rose-300'}`}>{fmtMoney(year1, config.currency)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">nach 2 Jahren</div>
          <div className={`font-mono text-sm font-bold ${final >= start ? 'text-emerald-300' : 'text-rose-300'}`}>{fmtMoney(final, config.currency)}</div>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Annahme: {(winRate * 100).toFixed(0)}% Trefferquote · R:R 1:1.5 · {config.maxRiskPct || 1}% Risk/Trade · 12 Trades/Monat ·
        Expectancy {proj.expectancyR >= 0 ? '+' : ''}{proj.expectancyR.toFixed(2)}R/Trade · ~{proj.monthlyGrowthPct.toFixed(1)}%/Monat.
        {proj.realistic
          ? ' Das ist der ehrliche Weg: kein Reichtum über Nacht, aber mathematisch positiv. Reale Schwankungen (Drawdowns) sind hier nicht abgebildet — es wird Monate geben wo es runtergeht.'
          : ' ⚠ Bei dieser Trefferquote ist die Expectancy negativ — du würdest langfristig verlieren. Erst System verbessern.'}
      </p>
    </div>
  );
}

export function DailyActionPlan({ signal }: { signal: SignalSummary }) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const positions = loadPositions();
      const cfg = loadConfig();
      const profile = loadUserProfile();
      const latestPrices: Record<string, number | null> = {};
      const riskReport = runRiskGuardian(positions, latestPrices, cfg, profile, {
        marketMood: signal.marketMood,
        marketRegime: signal.marketRegime,
        todaysVerdict: signal.kind
      });
      setConfig(cfg);
      setItems(buildActionPlan(signal, riskReport, positions, cfg));
    };
    refresh();
    setMounted(true);
    window.addEventListener(POSITIONS_CHANGED_EVENT, refresh);
    window.addEventListener('trading-app:config-changed', refresh);
    return () => {
      window.removeEventListener(POSITIONS_CHANGED_EVENT, refresh);
      window.removeEventListener('trading-app:config-changed', refresh);
    };
  }, [signal]);

  if (!mounted) {
    return (
      <section
        role="status"
        aria-busy="true"
        className="space-y-3 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-slate-950 to-slate-900/40 p-5"
      >
        <Skeleton className="h-3 w-40 bg-emerald-500/15" />
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        <span className="sr-only">Plan wird geladen…</span>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-slate-950 to-slate-900/40 p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        Dein Plan für heute
      </div>

      <ol className="space-y-2">
        {items.map((item, idx) => {
          const s = severityStyle(item.severity);
          return (
            <li key={item.id} className={`rounded-lg border ${s.border} ${s.bg} p-3`}>
              <div className="flex items-start gap-3">
                <span className="font-mono text-sm font-bold text-slate-500">{idx + 1}</span>
                <span className="text-base leading-none">{s.icon}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className={`text-sm font-semibold ${s.text}`}>{item.title}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.border} ${s.text}`}>{s.badge}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.detail}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <CompoundProjection config={config} />

      <p className="rounded-lg border border-amber-500/20 bg-amber-950/15 p-2.5 text-[10px] leading-relaxed text-amber-200/80">
        Das ist ein Entscheidungs-Assistent, kein Wahrsager. Er verbessert deine Quote und Disziplin — er garantiert nichts. Jeder einzelne Trade kann verlieren. Keine Finanzberatung.
      </p>
    </section>
  );
}
