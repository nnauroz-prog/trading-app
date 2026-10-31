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
const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  crypto: 'Kryptowährung', stock: 'Aktie', optionsschein: 'Optionsschein', knockout: 'Knock-out-Produkt',
  certificate: 'Zertifikat', etf: 'Fonds (ETF)', unknown: 'Andere Anlage'
};
const brokerLabel = (broker: Broker) => broker === 'Unknown' ? 'Nicht angegeben' : broker;

type QuoteCurrency = Position['currency'] | 'USDT';

// The supplied feed contains crypto quotes. A USDT price is neither an EUR nor an USD price.
export function comparableCryptoPrice(position: Position, prices: Record<string, number | null>, quoteCurrency: QuoteCurrency): number | null {
  if (position.instrumentType !== 'crypto' || position.currency !== quoteCurrency) return null;
  const keys = [position.ticker, position.underlying].filter((key): key is string => !!key);
  for (const key of keys) {
    const price = prices[key.toLowerCase()];
    if (typeof price === 'number' && Number.isFinite(price) && price > 0) return price;
  }
  return null;
}

function exitHint(exit: ExitSignal, position: Position): { title: string; detail: string } {
  if (exit.verdict === 'STOP_HIT') return { title: 'Untere Preisgrenze erreicht', detail: 'Der Preis hat deine notierte Grenze erreicht. Prüfe, ob du verkaufen möchtest. Die App löst keinen Verkauf aus.' };
  if (exit.verdict === 'TARGET_HIT') return { title: 'Dein Wunschpreis ist erreicht', detail: 'Der aktuelle Preis liegt bei oder über deinem notierten Ziel. Prüfe, ob du einen Teil oder alles verkaufen möchtest.' };
  if (exit.verdict === 'TRAIL_STOP') return { title: 'Deinen Gewinn im Blick behalten', detail: 'Der Preis liegt über deinem Kaufpreis. Du kannst prüfen, ob du deine untere Preisgrenze anpassen möchtest. Ein Verlust bleibt möglich.' };
  if (exit.verdict === 'NEAR_STOP') return { title: 'Nahe an deiner unteren Preisgrenze', detail: 'Der aktuelle Preis nähert sich deiner notierten Grenze. Schau nach, ob dein ursprünglicher Plan noch passt.' };
  if (!position.stopLossPlanned || position.stopLossPlanned <= 0) return { title: 'Deine untere Preisgrenze fehlt noch', detail: 'Du kannst einen Preis notieren, ab dem du einen Verkauf prüfen möchtest. Das ist eine Erinnerung und kein automatischer Auftrag.' };
  return { title: 'Keine Preisgrenze erreicht', detail: 'Der aktuelle Preis liegt zwischen deinen notierten Grenzen. Du kannst deinen Kauf weiter beobachten.' };
}

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
  if (days < 1) return 'heute';
  if (days < 30) return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
  const months = Math.floor(days / 30);
  return `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`;
}

function StatusBadge({ status }: { status: Position['status'] }) {
  const map: Record<Position['status'], { label: string; classes: string }> = {
    open: { label: 'Offen', classes: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    closed_win: { label: 'Mit Gewinn verkauft', classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    closed_loss: { label: 'Mit Verlust verkauft', classes: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
    closed_breakeven: { label: 'Ohne Gewinn verkauft', classes: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
    reduced: { label: 'Teilweise verkauft', classes: 'border-orange-500/40 bg-orange-500/10 text-orange-300' }
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

  const epNum = parseFloat(entryPrice);
  const psNum = parseFloat(positionSize);
  const canSave = !!underlying.trim() && Number.isFinite(epNum) && epNum > 0 && Number.isFinite(psNum) && psNum > 0;

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
      <h3 className="mb-3 text-sm font-semibold text-emerald-200">Kauf eintragen</h3>
      {prefillNotice && (
        <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-950/20 p-2 text-[11px] text-amber-200">
          Die Angaben wurden übernommen. Prüfe sie kurz, bevor du speicherst.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs">
          <span className="text-slate-400">Was hast du gekauft?</span>
          <input value={underlying} onChange={(e) => setUnderlying(e.target.value)} placeholder="BMW / BTC" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>

        <label className="text-xs">
          <span className="text-slate-400">Art der Anlage</span>
          <select value={type} onChange={(e) => setType(e.target.value as InstrumentType)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            {INSTRUMENT_TYPES.map((t) => <option key={t} value={t}>{INSTRUMENT_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Wo hast du gekauft?</span>
          <select value={broker} onChange={(e) => setBroker(e.target.value as Broker)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            {BROKERS.map((b) => <option key={b} value={b}>{brokerLabel(b)}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Preis beim Kauf</span>
          <input type="number" step="0.0001" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="75.00" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Anzahl</span>
          <input type="number" step="0.0001" value={positionSize} onChange={(e) => setPositionSize(e.target.value)} placeholder="10" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="text-slate-400">Währung</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD')} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
            <option value="EUR">Euro (€)</option>
            <option value="USD">US-Dollar ($)</option>
          </select>
        </label>
      </div>
      <details className="mt-4 rounded-lg border border-slate-800 p-3 text-sm text-slate-400">
        <summary className="cursor-pointer hover:text-slate-200">Weitere Angaben und eigene Preisgrenzen</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="text-slate-400">Kennnummer, falls bekannt</span>
            <input value={wkn} onChange={(e) => setWkn(e.target.value)} placeholder="519000" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
          </label>
          <label className="text-xs">
            <span className="text-slate-400">Untere Preisgrenze (optional)</span>
            <input type="number" step="0.0001" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="68" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
          </label>
          <label className="text-xs">
            <span className="text-slate-400">Gewünschter Verkaufspreis (optional)</span>
            <input type="number" step="0.0001" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="90" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
          </label>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Deine Preisgrenzen sind persönliche Notizen. Die App kauft und verkauft nichts automatisch.</p>
        <label className="mt-3 block text-xs">
          <span className="text-slate-400">Warum hast du gekauft?</span>
          <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} rows={2} placeholder="Warum gekauft?" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white" />
        </label>
      </details>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={handleSave} disabled={!canSave} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/50 disabled:text-slate-500">Speichern</button>
        <button onClick={onClose} className="rounded-md border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200">Abbrechen</button>
        {!canSave && <span className="text-[11px] text-amber-300/80">Bitte Name, Kaufpreis und Anzahl eingeben. Preis und Anzahl müssen größer als null sein.</span>}
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
  const hint = exit ? exitHint(exit, position) : null;

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">{position.underlying}</span>
          {position.wkn && <span className="font-mono text-[10px] text-slate-500">{position.wkn}</span>}
          <StatusBadge status={position.status} />
          <span className="text-[10px] text-slate-500">{brokerLabel(position.broker)} · {INSTRUMENT_LABELS[position.instrumentType]} · {fmtAge(position.entryDate)}</span>
        </div>
        <div className="text-right">
          {pnl !== null && pnlPct !== null && (
            <>
              <div className={`font-mono text-sm font-bold ${pnlColor}`}>{fmtMoney(pnl, position.currency)}</div>
              <div className={`font-mono text-[10px] ${pnlColor}`}>{fmtPct(pnlPct)} {isOpen ? 'seit deinem Kauf' : 'beim Verkauf'}</div>
            </>
          )}
          {isOpen && latestPrice === null && (
            <div className="text-[11px] text-slate-500">Preisvergleich in {position.currency === 'EUR' ? 'Euro' : 'US-Dollar'} gerade nicht verfügbar</div>
          )}
        </div>
      </div>
      {exit && (
        <div className={`mb-2 rounded-lg border p-2.5 ${EXIT_TONE[exit.tone]}`}>
          <div className="text-xs font-bold uppercase tracking-wider">{hint?.title}</div>
          <div className="mt-0.5 text-[11px] leading-relaxed opacity-90">{hint?.detail}</div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div>
          <div className="text-slate-500">Kaufpreis</div>
          <div className="font-mono text-slate-100">{fmtMoneyPlain(position.entryPrice, position.currency)}</div>
        </div>
        <div>
          <div className="text-slate-500">{isOpen ? 'Aktueller Preis' : 'Verkaufspreis'}</div>
          <div className="font-mono text-slate-100">
            {isOpen ? (latestPrice !== null ? fmtMoneyPlain(latestPrice, position.currency) : '—') : position.closePrice !== undefined ? fmtMoneyPlain(position.closePrice, position.currency) : '—'}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Menge</div>
          <div className="font-mono text-slate-100">{position.positionSize}</div>
        </div>
        <div>
          <div className="text-slate-500">Bezahlt</div>
          <div className="font-mono text-slate-100">{fmtMoneyPlain(position.investmentQuote, position.currency)}</div>
        </div>
        {position.stopLossPlanned && (
          <div>
            <div className="text-rose-400">Untere Preisgrenze</div>
            <div className="font-mono text-rose-200">{fmtMoneyPlain(position.stopLossPlanned, position.currency)}</div>
          </div>
        )}
        {position.takeProfitPlanned && (
          <div>
            <div className="text-emerald-400">Gewünschter Verkaufspreis</div>
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
            <button onClick={() => { onUpdateNotes(notesDraft); setEditingNotes(false); }} className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">Notiz speichern</button>
            <button onClick={() => { setNotesDraft(position.notes); setEditingNotes(false); }} className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">Abbrechen</button>
          </div>
        </div>
      ) : (
        position.notes && <p className="mt-2 text-[11px] text-slate-300">{position.notes}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2">
        {isOpen && latestPrice !== null && (
          <button onClick={() => onClose(latestPrice)} className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-500/20">Verkauf zu {fmtMoneyPlain(latestPrice, position.currency)} eintragen</button>
        )}
        {isOpen && (
          <button
            onClick={() => {
              const input = prompt(`Zu welchem Preis hast du verkauft? Bitte in ${position.currency === 'EUR' ? 'Euro' : 'US-Dollar'} pro Stück angeben.`);
              if (!input) return;
              const v = Number(input.trim().replace(',', '.'));
              if (Number.isFinite(v) && v > 0) onClose(v);
            }}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            Verkauf eintragen
          </button>
        )}
        <button onClick={() => setEditingNotes(true)} className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 hover:border-slate-600 hover:text-slate-200">Notiz</button>
        <button onClick={() => { if (window.confirm('Diesen gespeicherten Kauf löschen? Das lässt sich nicht rückgängig machen.')) onDelete(); }} className="ml-auto rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500 hover:border-rose-500/40 hover:text-rose-300">Löschen</button>
      </div>
    </div>
  );
}

export function PositionsPanel({ latestPrices, quoteCurrency }: { latestPrices: Record<string, number | null>; quoteCurrency: QuoteCurrency }) {
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

  const priceForPosition = (position: Position) => comparableCryptoPrice(position, latestPrices, quoteCurrency);
  const stats = computePositionStats(positions, {});
  const open = positions.filter((p) => p.status === 'open').sort((a, b) => b.entryDate - a.entryDate);
  const closed = positions.filter((p) => p.status !== 'open').sort((a, b) => (b.closeDate ?? 0) - (a.closeDate ?? 0));
  const currencies = Array.from(new Set(positions.map((p) => p.currency)));
  const currentChangeByCurrency: Record<string, number | null> = {};
  for (const currency of currencies) {
    const purchases = open.filter(position => position.currency === currency);
    const prices = purchases.map(priceForPosition);
    currentChangeByCurrency[currency] = purchases.length === 0 || prices.some(price => price === null)
      ? null
      : purchases.reduce((total, position, index) => total + (prices[index]! - position.entryPrice) * position.positionSize, 0);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meine Käufe</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Trage deine Käufe und Verkäufe ein. Gewinne oder Verluste werden aus deinen Angaben berechnet.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
        >
          {showForm ? '× Abbrechen' : '+ Kauf eintragen'}
        </button>
      </div>

      {showForm && <AddPositionForm onClose={() => setShowForm(false)} />}

      {positions.length === 0 && !showForm && (
        <EmptyState
          title="Noch keine Käufe gespeichert"
          description="Trage deinen ersten Kauf ein. Dann siehst du, was du bezahlt hast. Verkäufe kannst du später ergänzen."
          steps={[
            'Name der Anlage, Kaufpreis und Anzahl eintragen.',
            'Wenn du möchtest, eigene Preisgrenzen als Erinnerung notieren.',
            'Einen späteren Verkauf mit dem tatsächlichen Verkaufspreis ergänzen.'
          ]}
          actionLabel="Ersten Kauf eintragen"
          onAction={() => setShowForm(true)}
          hint="Du kannst Käufe von verschiedenen Banken und Anbietern an einem Ort sammeln."
        />
      )}

      {positions.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 border-y border-slate-800 py-4 md:grid-cols-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Gespeicherte Käufe</div>
              <div className="mt-1 font-mono text-2xl font-bold text-white">{stats.total}</div>
              <div className="font-mono text-[10px] text-slate-500">{stats.open} offen · {stats.closed} verkauft</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Verkäufe mit Gewinn</div>
              <div className={`mt-1 font-mono text-2xl font-bold ${stats.winRate !== null && stats.winRate >= 0.5 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {stats.winRate !== null ? `${(stats.winRate * 100).toFixed(0)}%` : '—'}
              </div>
              <div className="font-mono text-[10px] text-slate-500">{stats.wins} mit Gewinn · {stats.losses} ohne Gewinn</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Ergebnis der Verkäufe</div>
              <div className="mt-1 space-y-0.5">
                {currencies.length === 0 ? <div className="font-mono text-2xl font-bold text-slate-500">—</div> : currencies.map((c) => {
                  const v = stats.realizedByCurrency[c] ?? 0;
                  return <div key={c} className={`font-mono text-xl font-bold ${v >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{fmtMoney(v, c)}</div>;
                })}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Änderung seit dem Kauf</div>
              <div className="mt-1 space-y-0.5">
                {currencies.length === 0 ? <div className="font-mono text-2xl font-bold text-slate-500">—</div> : currencies.map((c) => {
                  const v = currentChangeByCurrency[c];
                  return <div key={c} className={`font-mono text-xl font-bold ${v == null ? 'text-slate-500' : v >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{v == null ? '—' : fmtMoney(v, c)}</div>;
                })}
              </div>
            </div>
          </div>

          {open.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Noch nicht verkauft ({open.length})</h3>
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
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Bereits verkauft ({closed.length})</h3>
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
