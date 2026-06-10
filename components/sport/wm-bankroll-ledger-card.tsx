'use client';

// Virtuelles P&L-Ledger uebers Turnier: alle uebernommenen Stakes,
// Outcomes per Join aus dem Pick-Lern-Log, Netto-P&L + ROI + Equity-
// Sparkline. Versteckt sich, solange kein Stake uebernommen wurde.

import { useEffect, useMemo, useState } from 'react';
import {
  loadStakeRecords,
  removeStake,
  WM_BANKROLL_LEDGER_CHANGED_EVENT
} from '@/lib/sport/wm-bankroll-ledger-store';
import {
  joinLedger,
  summarizeLedger,
  type LedgerRow
} from '@/lib/sport/wm-bankroll-ledger';
import {
  loadWmPickLog,
  WM_PICK_LEARNING_CHANGED_EVENT
} from '@/lib/sport/wm-pick-learning-store';
import type { StakeRecord } from '@/lib/sport/wm-bankroll-ledger';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 160;
  const h = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(' ');
  const lastPositive = points[points.length - 1] >= 0;
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <path d={path} fill="none" stroke={lastPositive ? '#34d399' : '#fb7185'} strokeWidth="1.5" />
    </svg>
  );
}

const OUTCOME_CLASS: Record<LedgerRow['outcome'], string> = {
  win: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200',
  loss: 'border-rose-400/60 bg-rose-500/15 text-rose-200',
  push: 'border-slate-700 bg-slate-900 text-slate-300',
  pending: 'border-amber-500/40 bg-amber-950/20 text-amber-200'
};

const OUTCOME_LABEL: Record<LedgerRow['outcome'], string> = {
  win: 'Treffer',
  loss: 'daneben',
  push: 'Remis',
  pending: 'offen'
};

export function WmBankrollLedgerCard() {
  const [stakes, setStakes] = useState<StakeRecord[]>([]);
  const [log, setLog] = useState<WmPickLogEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const syncStakes = () => setStakes(loadStakeRecords());
    const syncLog = () => setLog(loadWmPickLog());
    syncStakes();
    syncLog();
    setMounted(true);
    window.addEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, syncStakes);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, syncLog);
    return () => {
      window.removeEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, syncStakes);
      window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, syncLog);
    };
  }, []);

  const rows = useMemo(() => joinLedger(stakes, log), [stakes, log]);
  const summary = useMemo(() => summarizeLedger(rows), [rows]);

  if (!mounted) return null;
  if (rows.length === 0) return null;

  const pnlColor = summary.netPnlEur > 0 ? 'text-emerald-200' : summary.netPnlEur < 0 ? 'text-rose-200' : 'text-slate-200';

  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-950/10 p-3" aria-label="WM Bankroll-Ledger">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Turnier-Ledger · virtuelles P&amp;L</h3>
        <span className="text-[10px] text-emerald-200/70">{summary.totalEntries} Stakes · {summary.pendingCount} offen</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded border border-slate-800 bg-slate-950/40 p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Netto P&amp;L</div>
          <div className={`font-mono text-lg font-bold ${pnlColor}`}>{summary.netPnlEur >= 0 ? '+' : ''}{summary.netPnlEur.toFixed(2)} €</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/40 p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">ROI</div>
          <div className={`font-mono text-lg font-bold ${pnlColor}`}>{summary.roiPct !== null ? `${summary.roiPct >= 0 ? '+' : ''}${summary.roiPct} %` : '—'}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/40 p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Hit-Rate</div>
          <div className="font-mono text-lg font-bold text-slate-100">{summary.hitRatePct !== null ? `${summary.hitRatePct} %` : '—'}</div>
          <div className="text-[9px] text-slate-500">{summary.wins}W / {summary.losses}L / {summary.pushes}P</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/40 p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Equity</div>
          <Sparkline points={summary.equityCurve} />
        </div>
      </div>

      <details className="rounded border border-slate-800 bg-slate-950/30 p-2">
        <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Alle Stakes ({rows.length})
        </summary>
        <ul className="mt-1.5 space-y-1">
          {[...rows].sort((a, b) => b.recordedAt - a.recordedAt).map((r) => (
            <li key={r.id} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-[10.5px]">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={`rounded border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${OUTCOME_CLASS[r.outcome]}`}>{OUTCOME_LABEL[r.outcome]}</span>
                <span className="font-semibold text-slate-100">{r.winnerTeam}</span>
                <span className="text-slate-500">vs. {r.opponentTeam}</span>
                <span className="ml-auto font-mono text-[9.5px] text-slate-500">{r.dateIso}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-2 text-[10px]">
                <span className="font-mono text-slate-300">{r.stakeEur.toFixed(2)} € @ {r.decimalOdds.toFixed(2)}</span>
                {r.pnlEur !== null && (
                  <span className={`font-mono font-bold ${r.pnlEur > 0 ? 'text-emerald-300' : r.pnlEur < 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                    {r.pnlEur >= 0 ? '+' : ''}{r.pnlEur.toFixed(2)} €
                  </span>
                )}
                {r.outcome === 'pending' && (
                  <button
                    type="button"
                    className="ml-auto rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
                    onClick={() => removeStake(r.id)}
                  >entfernen</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </details>

      <p className="text-[9.5px] leading-snug text-slate-500">
        Virtuelles Ledger: nur Stakes die Du explizit uebernommen hast. Outcomes kommen aus dem Pick-Lern-Log (automatisch oder manuell aufgeloest). Remis bei Sieger-Pick = Einsatz zurueck (konservative Annahme — Buchmacher koennen anders werten). Offene Stakes lassen sich entfernen, resolved nicht.
      </p>
    </section>
  );
}
