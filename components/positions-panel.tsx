'use client';

import { useCallback, useEffect, useState } from 'react';
import { Position } from '@/lib/types/positions';
import { Broker, InstrumentType } from '@/lib/types/ideas';
import { clearPrefill, loadPrefill } from '@/lib/position-prefill';
import { EmptyState } from '@/components/empty-state';
import { PanelSkeleton } from '@/components/skeleton';
import { ExitSignal, evaluatePositionExit } from '@/lib/risk/position-exit';

const EXIT_TONE: Record<ExitSignal['tone'], string> = {
  sell: 'border-rose-500/50 bg-rose-950/40 text-rose-100',
  trim: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-100',
  caution: 'border-amber-500/50 bg-amber-950/30 text-amber-100',
  hold: 'border-slate-700 bg-slate-900/60 text-slate-200'
};
import {
  POSITIONS_CHANGED_EVENT,
  addPosition,
  closePosition,
  computePositionStats,
  deletePosition,
  loadPositions,
  updatePositionNotes
} from '@/lib/positions';

const BROKERS: Broker[] = ['Coinbase', 'Scalable', 'Trade Republic', 'Bitpanda', 'Unknown'];
const INSTRUMENT_TYPES: InstrumentType[] = ['crypto', 'stock', 'optionsschein', 'knockout', 'certificate', 'etf', 'unknown'];

function fmtMoney(value: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  const sign = value >= 0 ? '+' : '−';
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}${symbol}${abs.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${sign}${symbol}${abs.toFixed(2)}`;
}

function fmtMoneyPlain(value: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (value >= 1000) return `${symbol}${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${value.toFixed(2)}`;
}

function fmtPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function fmtAge(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return `${Math.floor(diff / (60 * 60 * 1000))}h`;
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function StatusBadge({ status }: { status: Position['status'] }) {
  const map: Record<Position['status'], { label: string; classes: string }> = {
    open: { label: 'OPEN', classes: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    closed_win: { label: 'WIN', classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    closed_loss: { label: 'LOSS', classes: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
    closed_breakeven: { label: 'BE', classes: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
    reduced: { label: 'REDUCED', classes: 'border-orange-500/40 bg-orange-500/10 text-orange-300' }
  };
  const m = map[status];
  return <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.classes}`}>{m.label}</span>;
}

function AddPositionForm({ onClose }: { onClose: () => void }) {
  const [underlying, setUnderlying] = useState('');
  const [wkn, setWkn] = useState('');
  const [type, setType] = useState<InstrumentType>('stock');
  const [broker, setBroker] = useState<Broker>('Trade Republic');
  const [entryPrice, setEntryPrice] = useState('');
  const [positionSize, setPositionSize] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [thesis, setThesis] = useState('');
  const [prefillNotice, setPrefillNotice] = useState(false);

  useEffect(() => {
    const prefill = loadPrefill();
    if (!prefill) return;
    setUnderlying(prefill.underlying);
    if (prefill.wkn) setWkn(prefill.wkn);
    setType(prefill.instrumentType);
    if (prefill.broker !== 'Unknown') setBroker(prefill.broker);
    if (prefill.entryPrice > 0) setEntryPrice(prefill.entryPrice.toString());
    if (prefill.stopLossPlanned !== null) setStopLoss(prefill.stopLossPlanned.toString());
    if (prefill.takeProfitPlanned !== null) setTakeProfit(prefill.takeProfitPlanned.toString());
    setThesis(prefill.thesis);
    setPrefillNotice(true);
    clearPrefill();
  }, []);

  const handleSave = () => {
    const ep = parseFloat(entryPrice);
    const ps = parseFloat(positionSize);
    if (!Number.isFinite(ep) || !Number.isFinite(ps) || ep <= 0 || ps <= 0 || !underlying.trim()) return;
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    addPosition({
      underlying: underlying.trim().toUpperCase(),
      ticker: type === 'crypto' ? underlying.trim().toUpperCase() : undefined,
      wkn: type !== 'crypto' && wkn ? wkn.trim().toUpperCase() : undefined,
      instrumentType: type,
      broker,
      entryPrice: ep,
      entryDate: Date.now(),
      positionSize: ps,
      investmentQuote: ep * ps,
      currency,
      stopLossPlanned: Number.isFinite(sl) ? sl : null,
      takeProfitPlanned: Number.isFinite(tp) ? tp : null,
      thesis: thesis.trim(),
      status: 'open',
      notes: ''
    });
    onClose();
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
      <h3 className="mb-3 text-sm font-semibold text-emerald-200">Neue Position erfassen</h3>
      {prefillNotice && (
        <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-950/20 p-2 text-[11px] text-amber-200">
          ⚡ Vorbefüllt aus der Ideen-Analyse — bitte Werte prüfen und ggf. anpassen, bevor du speicherst.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs">
          <span className="text-slate-400">Basiswert / Ticker</span>
          <input value={underlying} onChange={(e) => setUnderlying(e.target.value)} placeholder="BMW / BTC" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="text-slate-400">WKN / ISIN (optional)</span>
          <input value={wkn} onChange={(e) => setWkn(e.target.value)} placeholder="519000" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Typ</span>
          <select value={type} onChange={(e) => setType(e.target.value as InstrumentType)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            {INSTRUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Broker</span>
          <select value={broker} onChange={(e) => setBroker(e.target.value as Broker)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Einstiegskurs</span>
          <input type="number" step="0.0001" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="75.00" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Menge / Stück</span>
          <input type="number" step="0.0001" value={positionSize} onChange={(e) => setPositionSize(e.target.value)} placeholder="10" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Währung</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD')} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Stop-Loss-Plan (optional)</span>
          <input type="number" step="0.0001" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="68" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Take-Profit-Plan (optional)</span>
          <input type="number" step="0.0001" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="90" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
      </div>
      <label className="mt-3 block text-xs">
        <span className="text-slate-400">These / Begründung</span>
        <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} rows={2} placeholder="Warum gekauft?" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white" />
      </label>
      <div className="mt-3 flex gap-2">
        <button onClick={handleSave} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30">Speichern</button>
        <button onClick={onClose} className="rounded-md border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200">Abbrechen</button>
      </div>
    </div>
  );
}

function PositionRow({ position, latestPrice, onDelete, onClose, onUpdateNotes }: {
  position: Position;
  latestPrice: number | null;
  onDelete: () => void;
  onClose: (price: number) => void;
  onUpdateNotes: (notes: string) => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(position.notes);
  const isOpen = position.status === 'open';

  const unrealizedPnl = isOpen && latestPrice !== null ? (latestPrice - position.entryPrice) * position.positionSize : null;
  const unrealizedPct = isOpen && latestPrice !== null ? ((latestPrice - position.entryPrice) / position.entryPrice) * 100 : null;
  const pnl = isOpen ? unrealizedPnl : position.realizedPnl ?? 0;
  const pnlPct = isOpen ? unrealizedPct : position.realizedPnlPct ?? 0;
  const pnlColor = (pnl ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const exit = isOpen ? evaluatePositionExit(position, latestPrice) : null;

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">{position.underlying}</span>
          {position.wkn && <span className="font-mono text-[10px] text-slate-500">{position.wkn}</span>}
          <StatusBadge status={position.status} />
          <span className="text-[10px] text-slate-500">{position.broker} · {position.instrumentType} · {fmtAge(position.entryDate)}</span>
        </div>
        <div className="text-right">
          {pnl !== null && pnlPct !== null && (
            <>
              <div className={`font-mono text-sm font-bold ${pnlColor}`}>{fmtMoney(pnl, position.currency)}</div>
              <div className={`font-mono text-[10px] ${pnlColor}`}>{fmtPct(pnlPct)} {isOpen ? 'unrealized' : 'realized'}</div>
            </>
          )}
          {isOpen && latestPrice === null && (
            <div className="font-mono text-[10px] text-slate-500">kein Live-Preis</div>
          )}
        </div>
      </div>
      {exit && (
        <div className={`mb-2 rounded-lg border p-2.5 ${EXIT_TONE[exit.tone]}`}>
          <div className="text-xs font-bold uppercase tracking-wider">{exit.action}</div>
          <div className="mt-0.5 text-[11px] leading-relaxed opacity-90">{exit.detail}</div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div>
          <div className="text-slate-500">Entry</div>
          <div className="font-mono text-slate-100">{fmtMoneyPlain(position.entryPrice, position.currency)}</div>
        </div>
        <div>
          <div className="text-slate-500">{isOpen ? 'Aktuell' : 'Exit'}</div>
          <div className="font-mono text-slate-100">
            {isOpen ? (latestPrice !== null ? fmtMoneyPlain(latestPrice, position.currency) : '—') : position.closePrice !== undefined ? fmtMoneyPlain(position.closePrice, position.currency) : '—'}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Menge</div>
          <div className="font-mono text-slate-100">{position.positionSize}</div>
        </div>
        <div>
          <div className="text-slate-500">Einsatz</div>
          <div className="font-mono text-slate-100">{fmtMoneyPlain(position.investmentQuote, position.currency)}</div>
        </div>
        {position.stopLossPlanned && (
          <div>
            <div className="text-rose-400">SL-Plan</div>
            <div className="font-mono text-rose-200">{fmtMoneyPlain(position.stopLossPlanned, position.currency)}</div>
          </div>
        )}
        {position.takeProfitPlanned && (
          <div>
            <div className="text-emerald-400">TP-Plan</div>
            <div className="font-mono text-emerald-200">{fmtMoneyPlain(position.takeProfitPlanned, position.currency)}</div>
          </div>
        )}
      </div>
      {position.thesis && (
        <p className="mt-2 text-[11px] italic text-slate-400">{`„`}{position.thesis}{`"`}</p>
      )}
      {editingNotes ? (
        <div className="mt-2 space-y-1">
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={2}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
          />
          <div className="flex gap-1">
            <button onClick={() => { onUpdateNotes(notesDraft); setEditingNotes(false); }} className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">OK</button>
            <button onClick={() => { setNotesDraft(position.notes); setEditingNotes(false); }} className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">Abbruch</button>
          </div>
        </div>
      ) : (
        position.notes && <p className="mt-2 text-[11px] text-slate-300">{position.notes}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2">
        {isOpen && latestPrice !== null && (
          <button onClick={() => onClose(latestPrice)} className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-500/20">Bei {fmtMoneyPlain(latestPrice, position.currency)} schließen</button>
        )}
        {isOpen && (
          <button
            onClick={() => {
              const input = prompt('Exit-Preis eingeben:');
              if (!input) return;
              const v = parseFloat(input);
              if (Number.isFinite(v)) onClose(v);
            }}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            Manuell schließen
          </button>
        )}
        <button onClick={() => setEditingNotes(true)} className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 hover:border-slate-600 hover:text-slate-200">Notiz</button>
        <button onClick={onDelete} className="ml-auto rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500 hover:border-rose-500/40 hover:text-rose-300">Löschen</button>
      </div>
    </div>
  );
}

export function PositionsPanel({ latestPrices }: { latestPrices: Record<string, number | null> }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(() => setPositions(loadPositions()), []);

  useEffect(() => {
    refresh();
    setMounted(true);
    if (loadPrefill()) setShowForm(true);
    window.addEventListener(POSITIONS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(POSITIONS_CHANGED_EVENT, refresh);
  }, [refresh]);

  if (!mounted) return <PanelSkeleton rows={4} />;

  const priceForPosition = (p: Position): number | null => {
    const keys = [p.ticker?.toLowerCase(), p.underlying.toLowerCase()].filter(Boolean) as string[];
    for (const k of keys) {
      const v = latestPrices[k];
      if (typeof v === 'number') return v;
    }
    return null;
  };

  const latestPriceMap: Record<string, number> = {};
  for (const [k, v] of Object.entries(latestPrices)) {
    if (typeof v === 'number') latestPriceMap[k] = v;
  }
  const stats = computePositionStats(positions, latestPriceMap);
  const open = positions.filter((p) => p.status === 'open').sort((a, b) => b.entryDate - a.entryDate);
  const closed = positions.filter((p) => p.status !== 'open').sort((a, b) => (b.closeDate ?? 0) - (a.closeDate ?? 0));
  const currencies = Array.from(new Set(positions.map((p) => p.currency)));

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meine Positionen</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Manuelle Erfassung deiner echten Käufe (jeder Broker, jeder Asset-Typ). Live-PnL für Crypto, bei Aktien/Optionsscheinen manueller Exit-Preis.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
        >
          {showForm ? '× Abbrechen' : '+ Position'}
        </button>
      </div>

      {showForm && <AddPositionForm onClose={() => setShowForm(false)} />}

      {positions.length === 0 && !showForm && (
        <EmptyState
          title="Noch keine Positionen"
          description="Erfasse deine offenen Trades, damit der Risk-Guardian Stop-Abstände, Klumpenrisiken und Portfolio-Heat live überwachen kann."
          steps={[
            'Trade erfassen: Basiswert, Einstieg, Größe.',
            'Stop-Loss und Take-Profit eintragen — damit Risiken berechenbar werden.',
            'Live-P/L und Warnungen erscheinen automatisch.'
          ]}
          actionLabel="Erste Position erfassen"
          onAction={() => setShowForm(true)}
          hint="Tipp: Aus einer analysierten Idee (/ideas) lässt sich eine Position direkt vorbefüllen."
        />
      )}

      {positions.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 border-y border-slate-800 py-4 md:grid-cols-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Positionen</div>
              <div className="mt-1 font-mono text-2xl font-bold text-white">{stats.total}</div>
              <div className="font-mono text-[10px] text-slate-500">{stats.open} offen · {stats.closed} zu</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Win-Rate</div>
              <div className={`mt-1 font-mono text-2xl font-bold ${stats.winRate !== null && stats.winRate >= 0.5 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {stats.winRate !== null ? `${(stats.winRate * 100).toFixed(0)}%` : '—'}
              </div>
              <div className="font-mono text-[10px] text-slate-500">{stats.wins}W / {stats.losses}L</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Realized</div>
              <div className="mt-1 space-y-0.5">
                {currencies.length === 0 ? <div className="font-mono text-2xl font-bold text-slate-500">—</div> : currencies.map((c) => {
                  const v = stats.realizedByCurrency[c] ?? 0;
                  return <div key={c} className={`font-mono text-xl font-bold ${v >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{fmtMoney(v, c)}</div>;
                })}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Unrealized</div>
              <div className="mt-1 space-y-0.5">
                {currencies.length === 0 ? <div className="font-mono text-2xl font-bold text-slate-500">—</div> : currencies.map((c) => {
                  const v = stats.unrealizedByCurrency[c] ?? 0;
                  return <div key={c} className={`font-mono text-xl font-bold ${v >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{fmtMoney(v, c)}</div>;
                })}
              </div>
            </div>
          </div>

          {open.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Offene Positionen ({open.length})</h3>
              {open.map((p) => (
                <PositionRow
                  key={p.id}
                  position={p}
                  latestPrice={priceForPosition(p)}
                  onDelete={() => deletePosition(p.id)}
                  onClose={(price) => closePosition(p.id, price)}
                  onUpdateNotes={(notes) => updatePositionNotes(p.id, notes)}
                />
              ))}
            </div>
          )}

          {closed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Geschlossene Positionen ({closed.length})</h3>
              {closed.map((p) => (
                <PositionRow
                  key={p.id}
                  position={p}
                  latestPrice={null}
                  onDelete={() => deletePosition(p.id)}
                  onClose={() => {}}
                  onUpdateNotes={(notes) => updatePositionNotes(p.id, notes)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
