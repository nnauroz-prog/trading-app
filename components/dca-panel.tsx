'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DCA_CHANGED_EVENT,
  DcaFrequency,
  DcaPlan,
  addDcaPlan,
  computeDcaStats,
  deleteDcaExecution,
  deleteDcaPlan,
  isDcaDue,
  loadDcaPlans,
  nextDcaDate,
  recordDcaExecution
} from '@/lib/dca';
import { TOP_50 } from '@/lib/coin-universe';
import { EmptyState } from '@/components/empty-state';

function fmtMoney(v: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  const sign = v >= 0 ? '+' : '−';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}${symbol}${abs.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${sign}${symbol}${abs.toFixed(2)}`;
}
function fmtPlain(v: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (v >= 1000) return `${symbol}${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${v.toFixed(2)}`;
}
function fmtCoins(v: number): string {
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.0001) return v.toFixed(6);
  return v.toFixed(8);
}
function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear().toString().slice(-2)}`;
}

const FREQ_LABEL: Record<DcaFrequency, string> = { weekly: 'wöchentlich', biweekly: '14-tägig', monthly: 'monatlich' };
const DCA_ASSETS = TOP_50.filter((c) => ['btc', 'eth', 'sol', 'bnb', 'xrp', 'ada', 'avax', 'link', 'dot'].includes(c.id));

function AddPlanForm({ onClose }: { onClose: () => void }) {
  const [assetId, setAssetId] = useState('btc');
  const [amount, setAmount] = useState('50');
  const [frequency, setFrequency] = useState<DcaFrequency>('weekly');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const coin = DCA_ASSETS.find((c) => c.id === assetId);
    if (!coin) return;
    addDcaPlan({ assetId, symbol: coin.symbol, amountPerBuy: amt, frequency, currency });
    onClose();
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
      <h3 className="mb-3 text-sm font-semibold text-emerald-200">Neuer DCA-Plan</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-xs">
          <span className="text-slate-400">Coin</span>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            {DCA_ASSETS.map((c) => <option key={c.id} value={c.id}>{c.symbol}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Betrag/Kauf</span>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Frequenz</span>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as DcaFrequency)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            <option value="weekly">wöchentlich</option>
            <option value="biweekly">14-tägig</option>
            <option value="monthly">monatlich</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Währung</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD')} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={handleSave} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30">Plan anlegen</button>
        <button onClick={onClose} className="rounded-md border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-400 hover:text-slate-200">Abbrechen</button>
      </div>
    </div>
  );
}

function PlanCard({ plan, currentPrice }: { plan: DcaPlan; currentPrice: number | null }) {
  const stats = computeDcaStats(plan, currentPrice);
  const due = isDcaDue(plan);
  const pnlColor = (stats.unrealizedPnl ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300';

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold text-white">{plan.symbol}</span>
          <span className="text-[11px] text-slate-500">{fmtPlain(plan.amountPerBuy, plan.currency)} {FREQ_LABEL[plan.frequency]}</span>
          {due && <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">Kauf fällig</span>}
        </div>
        <button onClick={() => deleteDcaPlan(plan.id)} className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500 hover:border-rose-500/40 hover:text-rose-300">Plan löschen</button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Investiert</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-white">{fmtPlain(stats.totalInvested, plan.currency)}</div>
          <div className="font-mono text-[10px] text-slate-500">{stats.executionCount} Käufe</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Bestand</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-white">{fmtCoins(stats.totalCoins)}</div>
          <div className="font-mono text-[10px] text-slate-500">{plan.symbol}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Ø Kaufkurs</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-slate-200">{stats.avgCostBasis !== null ? `$${stats.avgCostBasis.toFixed(stats.avgCostBasis < 1 ? 5 : 2)}` : '—'}</div>
          <div className="font-mono text-[10px] text-slate-500">aktuell {currentPrice !== null ? `$${currentPrice.toFixed(currentPrice < 1 ? 5 : 2)}` : '—'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Wert / PnL</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-slate-200">{stats.currentValue !== null ? fmtPlain(stats.currentValue, plan.currency) : '—'}</div>
          {stats.unrealizedPnl !== null && (
            <div className={`font-mono text-[10px] ${pnlColor}`}>{fmtMoney(stats.unrealizedPnl, plan.currency)} ({stats.unrealizedPnlPct?.toFixed(1)}%)</div>
          )}
        </div>
      </div>

      {stats.vsLumpSum !== null && (
        <div className="mt-2 text-[10px] text-slate-500">
          vs. Einmal-Invest am Start: <span className={stats.vsLumpSum >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{fmtMoney(stats.vsLumpSum, plan.currency)}</span> — {stats.vsLumpSum >= 0 ? 'DCA hat sich gelohnt (gekauft als günstiger)' : 'Einmal-Invest wäre besser gewesen (Markt stieg durchgehend)'}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
        <span className="text-[10px] text-slate-500">Nächster Kauf ~{fmtDate(nextDcaDate(plan))}</span>
        <button
          onClick={() => {
            if (currentPrice === null) {
              const input = prompt('Kaufkurs eingeben:');
              if (!input) return;
              const v = parseFloat(input);
              if (Number.isFinite(v)) recordDcaExecution(plan.id, v);
            } else {
              recordDcaExecution(plan.id, currentPrice);
            }
          }}
          className="ml-auto rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
        >
          Kauf erfassen{currentPrice !== null ? ` @ $${currentPrice.toFixed(currentPrice < 1 ? 5 : 2)}` : ''}
        </button>
      </div>

      {plan.executions.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300">{plan.executions.length} Käufe anzeigen</summary>
          <div className="mt-1 space-y-1">
            {[...plan.executions].reverse().map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10px]">
                <span className="font-mono text-slate-400">{fmtDate(e.date)}</span>
                <span className="font-mono text-slate-300">{fmtPlain(e.amountInvested, plan.currency)} @ ${e.price.toFixed(e.price < 1 ? 5 : 2)} = {fmtCoins(e.coinsBought)}</span>
                <button onClick={() => deleteDcaExecution(plan.id, e.id)} className="text-slate-600 hover:text-rose-300">✕</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function DcaPanel({ latestPrices }: { latestPrices: Record<string, number | null> }) {
  const [plans, setPlans] = useState<DcaPlan[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(() => setPlans(loadDcaPlans()), []);

  useEffect(() => {
    refresh();
    setMounted(true);
    window.addEventListener(DCA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DCA_CHANGED_EVENT, refresh);
  }, [refresh]);

  if (!mounted) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">DCA — Sparplan</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Dollar-Cost-Averaging: feste Beträge regelmäßig in Majors, egal wie der Markt steht. Reduziert Timing-Risiko, ist der ruhige Vermögens-Baustein neben den taktischen Trades. Besonders sinnvoll in No-Trade-Phasen.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30">
          {showForm ? '× Abbrechen' : '+ Plan'}
        </button>
      </div>

      {showForm && <AddPlanForm onClose={() => setShowForm(false)} />}

      {plans.length === 0 && !showForm && (
        <EmptyState
          title="Noch kein DCA-Plan"
          description="Sparpläne (Dollar-Cost-Averaging) glätten den Einstiegskurs über die Zeit. Erfasse hier deine regelmäßigen Käufe und sieh den Durchschnittskurs."
          steps={[
            'Sparplan anlegen: Asset, Betrag, Intervall (z.B. 50€/Woche in BTC).',
            'Ausgeführte Käufe beim Broker hier eintragen.',
            'Durchschnittskurs und Plan-Performance erscheinen automatisch.'
          ]}
          actionLabel="Ersten Sparplan anlegen"
          onAction={() => setShowForm(true)}
          hint="DCA garantiert keinen Gewinn — fällt ein Asset langfristig, verlierst du auch mit DCA. Keine Broker-Anbindung; Käufe selbst ausführen."
        />
      )}

      <div className="space-y-3">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} currentPrice={latestPrices[p.assetId] ?? null} />
        ))}
      </div>

      {plans.length > 0 && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-950/15 p-2.5 text-[10px] leading-relaxed text-amber-200/80">
          DCA garantiert keinen Gewinn — wenn ein Asset langfristig fällt, verlierst du auch mit DCA. Funktioniert nur bei Assets an die du langfristig glaubst. Käufe musst du selbst beim Broker ausführen und hier erfassen (keine Broker-Anbindung).
        </p>
      )}
    </section>
  );
}
