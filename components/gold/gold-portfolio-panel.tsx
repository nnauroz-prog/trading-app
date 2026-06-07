'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  GOLD_HOLDINGS_CHANGED_EVENT,
  addGoldHolding,
  loadGoldHoldings,
  removeGoldHolding,
  updateGoldHolding,
  type GoldHolding
} from '@/lib/gold/gold-holdings-store';
import {
  aggregateGoldPortfolio,
  sortPortfolioPositions,
  filterPortfolioByTax,
  type PortfolioHoldingInput,
  type PortfolioSummary,
  type PositionSortKey,
  type TaxFilter
} from '@/lib/gold/gold-portfolio-aggregator';
import { holdingsToCsv } from '@/lib/gold/gold-holdings-export';
import { GoldPortfolioSummary } from '@/components/gold/gold-portfolio-summary';
import {
  ALLOY_OPTIONS,
  type AmountUnit,
  type PurchasePriceMode,
  type MarketContext
} from '@/lib/gold/gold-holding-calculator';

interface HistoryPoint {
  dateIso: string;
  closeUsd: number;
}

interface Props {
  history: HistoryPoint[];
  currentGoldPricePerOz: number | null;
  todayIso: string;
  marketContext: MarketContext;
}

function nearestHistoricalPrice(history: HistoryPoint[], dateIso: string): number | null {
  if (history.length === 0) return null;
  const target = new Date(`${dateIso}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const sorted = [...history].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  const earliest = new Date(`${sorted[0].dateIso}T00:00:00`).getTime();
  if (target < earliest - 24 * 60 * 60 * 1000) return null;
  let atOrBefore: HistoryPoint | null = null;
  let nearest: HistoryPoint | null = null;
  let bestDiff = Infinity;
  for (const p of sorted) {
    const pMs = new Date(`${p.dateIso}T00:00:00`).getTime();
    const diff = Math.abs(pMs - target);
    if (pMs <= target) {
      if (!atOrBefore || new Date(`${atOrBefore.dateIso}T00:00:00`).getTime() < pMs) atOrBefore = p;
    }
    if (diff < bestDiff) { bestDiff = diff; nearest = p; }
  }
  if (atOrBefore) return atOrBefore.closeUsd;
  if (nearest && bestDiff <= 7 * 24 * 60 * 60 * 1000) return nearest.closeUsd;
  return null;
}

const UNIT_LABEL: Record<AmountUnit, string> = { gram: 'g', ounce: 'oz', kilogram: 'kg' };
const MODE_LABEL: Record<PurchasePriceMode, string> = {
  'auto': 'Automatisch',
  'total': 'Gesamtsumme USD',
  'per-gram': 'USD/Gramm',
  'per-ounce': 'USD/Unze'
};

function fmtUsd(value: number | null, opts: { withSign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} $`;
}

function fmtPct(value: number | null, opts: { withSign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} %`;
}

function pnlClass(value: number | null): string {
  if (value === null) return 'text-slate-300';
  if (value > 0) return 'text-emerald-300';
  if (value < 0) return 'text-rose-300';
  return 'text-slate-300';
}

export function GoldPortfolioPanel({ history, currentGoldPricePerOz, todayIso, marketContext }: Props) {
  const [holdings, setHoldings] = useState<GoldHolding[]>([]);
  const [mounted, setMounted] = useState(false);
  const [sortKey, setSortKey] = useState<PositionSortKey>('purchase-date-desc');
  const [taxFilter, setTaxFilter] = useState<TaxFilter>('all');
  // null = Add-Modus, sonst Editier-ID der zu ändernden Position.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form-State (Add ODER Edit — entscheidet sich über editingId)
  const [formLabel, setFormLabel] = useState('Krügerrand');
  const [formDate, setFormDate] = useState(todayIso);
  const [formAmount, setFormAmount] = useState('100');
  const [formUnit, setFormUnit] = useState<AmountUnit>('gram');
  const [formPromille, setFormPromille] = useState(999);
  const [formMode, setFormMode] = useState<PurchasePriceMode>('auto');
  const [formPrice, setFormPrice] = useState('');
  const [formFees, setFormFees] = useState('');
  const [formSpread, setFormSpread] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setHoldings(loadGoldHoldings());
    sync();
    setMounted(true);
    window.addEventListener(GOLD_HOLDINGS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(GOLD_HOLDINGS_CHANGED_EVENT, sync);
  }, []);

  const summary: PortfolioSummary = useMemo(() => {
    const inputs: PortfolioHoldingInput[] = holdings.map((h) => ({
      ...h,
      historicalGoldPricePerOz: nearestHistoricalPrice(history, h.purchaseDate)
    }));
    return aggregateGoldPortfolio(inputs, currentGoldPricePerOz, todayIso, marketContext);
  }, [holdings, history, currentGoldPricePerOz, todayIso, marketContext]);

  function startEdit(h: GoldHolding) {
    setEditingId(h.id);
    setFormLabel(h.label);
    setFormDate(h.purchaseDate);
    setFormAmount(String(h.amount));
    setFormUnit(h.amountUnit);
    setFormPromille(h.purityPromille);
    setFormMode(h.purchasePriceMode);
    setFormPrice(h.purchasePrice !== undefined ? String(h.purchasePrice) : '');
    setFormFees(h.fees !== undefined ? String(h.fees) : '');
    setFormSpread(h.sellSpreadPct !== undefined ? String(h.sellSpreadPct) : '');
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const amount = Number.parseFloat(formAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Bitte gültige Menge eintragen.');
      return;
    }
    if (!Number.isFinite(formPromille) || formPromille <= 0 || formPromille > 1000) {
      setFormError('Feingehalt muss zwischen 1 und 1000 Promille liegen.');
      return;
    }
    const priceNum = Number.parseFloat(formPrice.replace(',', '.'));
    const feesNum = Number.parseFloat(formFees.replace(',', '.'));
    const spreadNum = Number.parseFloat(formSpread.replace(',', '.'));
    const payload = {
      label: formLabel.trim() || 'Position',
      purchaseDate: formDate,
      amount,
      amountUnit: formUnit,
      purityPromille: formPromille,
      purchasePriceMode: formMode,
      purchasePrice: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : undefined,
      fees: Number.isFinite(feesNum) && feesNum > 0 ? feesNum : undefined,
      sellSpreadPct: Number.isFinite(spreadNum) && spreadNum > 0 ? spreadNum : undefined
    };
    if (editingId !== null) {
      updateGoldHolding(editingId, payload);
      setEditingId(null);
    } else {
      addGoldHolding(payload);
    }
    // Form-Inputs nicht resetten — der User will oft mehrere ähnliche Positionen eintragen.
  }

  function downloadCsv() {
    if (typeof window === 'undefined') return;
    const csv = holdingsToCsv(holdings);
    // BOM für Excel-DE-Unterstützung der deutschen Umlaute.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gold-holdings-${todayIso}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!mounted) {
    return null;
  }

  // Sortier- und Filter-Ansicht der Positionen.
  const filteredPositions = filterPortfolioByTax(summary.positions, taxFilter);
  const visiblePositions = sortPortfolioPositions(filteredPositions, sortKey);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">📒 Gold-Portfolio (lokal)</h3>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">
            Mehrere Käufe getrennt speichern. Alles bleibt nur in deinem Browser — kein Server, kein Account.
            Steuer-Status pro Position nach §23 EStG.
          </p>
        </div>
        {holdings.length > 0 && (
          <button
            type="button"
            onClick={downloadCsv}
            className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10.5px] font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-200"
          >
            ⬇ CSV-Export
          </button>
        )}
      </header>

      {holdings.length > 0 && <GoldPortfolioSummary summary={summary} />}

      {holdings.length === 0 && (
        <p className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3 text-[11px] leading-snug text-slate-400">
          Noch keine Position gespeichert. Trag unten dein Gold ein — sobald gespeichert, läuft das Aggregat oben durch.
        </p>
      )}

      {holdings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400">
          <label className="flex items-center gap-1">
            Sortieren:
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as PositionSortKey)}
              className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10.5px] text-slate-200 focus:border-amber-400 focus:outline-none"
            >
              <option value="purchase-date-desc">Datum, neuest zuerst</option>
              <option value="purchase-date-asc">Datum, ältest zuerst</option>
              <option value="value-desc">aktueller Wert, höchst zuerst</option>
              <option value="value-asc">aktueller Wert, niedrigst zuerst</option>
              <option value="pnl-desc">PnL, höchst zuerst</option>
              <option value="pnl-asc">PnL, niedrigst zuerst</option>
              <option value="label-asc">Bezeichnung, A–Z</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            Steuer-Status:
            <select
              value={taxFilter}
              onChange={(e) => setTaxFilter(e.target.value as TaxFilter)}
              className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10.5px] text-slate-200 focus:border-amber-400 focus:outline-none"
            >
              <option value="all">alle</option>
              <option value="tax-free">nur steuerfrei (§23 EStG)</option>
              <option value="taxable">nur noch steuerpflichtig</option>
            </select>
          </label>
          <span className="ml-auto font-mono text-[10px] text-slate-500">
            {visiblePositions.length} von {summary.positions.length} angezeigt
          </span>
        </div>
      )}

      {holdings.length > 0 && visiblePositions.length === 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-3 text-[11px] leading-snug text-amber-100">
          Keine Position passt zum aktiven Filter. Filter zurücksetzen oder anderen Steuer-Status wählen.
        </p>
      )}

      {visiblePositions.length > 0 && (
        <ul className="space-y-1">
          {visiblePositions.map((p) => {
            const tax = p.taxStatus;
            return (
              <li key={p.input.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="truncate font-semibold text-slate-100">{p.input.label}</span>
                    <span className="font-mono text-[9.5px] text-slate-500">
                      {p.input.amount} {UNIT_LABEL[p.input.amountUnit]} · {p.input.purityPromille}/1000 · {p.input.purchaseDate}
                    </span>
                    <span className={`rounded border px-1 py-0 text-[9px] font-bold uppercase tracking-wider ${tax.isTaxFree ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-amber-400/40 bg-amber-500/10 text-amber-200'}`}>
                      {tax.isTaxFree ? '§23 steuerfrei' : `${tax.daysToTaxFree}d bis steuerfrei`}
                    </span>
                  </div>
                  <div className="mt-0.5 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                    <div>Einstand: <span className="font-mono text-slate-200">{fmtUsd(p.purchaseValue)}</span></div>
                    <div>Aktuell: <span className="font-mono text-slate-200">{fmtUsd(p.currentValue)}</span></div>
                    <div>PnL: <span className={`font-mono ${pnlClass(p.absolutePnL)}`}>{fmtUsd(p.absolutePnL, { withSign: true })}</span> <span className={`font-mono ${pnlClass(p.percentPnL)}`}>({fmtPct(p.percentPnL, { withSign: true })})</span></div>
                  </div>
                  {!p.hasCompleteData && (
                    <p className="mt-1 text-[10px] text-amber-300">
                      Unvollständig — kein historischer Goldpreis für dieses Kaufdatum. Manuellen Kaufpreis ergänzen, um diese Position in die Summe aufzunehmen.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => {
                      const original = holdings.find((x) => x.id === p.input.id);
                      if (original) startEdit(original);
                    }}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-amber-400/50 hover:text-amber-200"
                    aria-label={`${p.input.label} bearbeiten`}
                  >
                    ✎ bearbeiten
                  </button>
                  <button
                    onClick={() => removeGoldHolding(p.input.id)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-rose-400/50 hover:text-rose-200"
                    aria-label={`${p.input.label} entfernen`}
                  >
                    × entfernen
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            {editingId !== null ? 'Position bearbeiten' : 'Position hinzufügen'}
          </div>
          {editingId !== null && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9.5px] text-slate-400 hover:text-rose-200"
            >
              Bearbeitung abbrechen
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            type="text"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="Bezeichnung"
            className="col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            aria-label="Bezeichnung"
          />
          <input
            type="date"
            value={formDate}
            max={todayIso}
            onChange={(e) => setFormDate(e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            aria-label="Kaufdatum"
          />
          <div className="flex gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="Menge"
              className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
              aria-label="Menge"
            />
            <select
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value as AmountUnit)}
              className="shrink-0 rounded border border-slate-700 bg-slate-950 px-1 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
              aria-label="Einheit"
            >
              <option value="gram">g</option>
              <option value="ounce">oz</option>
              <option value="kilogram">kg</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={formPromille}
            onChange={(e) => setFormPromille(Number(e.target.value))}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            aria-label="Legierung"
          >
            {ALLOY_OPTIONS.map((a) => (
              <option key={a.promille} value={a.promille}>{a.label}</option>
            ))}
          </select>
          <select
            value={formMode}
            onChange={(e) => setFormMode(e.target.value as PurchasePriceMode)}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            aria-label="Kaufpreis-Modus"
          >
            {(Object.keys(MODE_LABEL) as PurchasePriceMode[]).map((m) => (
              <option key={m} value={m}>{MODE_LABEL[m]}</option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            value={formPrice}
            onChange={(e) => setFormPrice(e.target.value)}
            placeholder={formMode === 'auto' ? '— (auto)' : 'Kaufpreis'}
            disabled={formMode === 'auto'}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none disabled:opacity-50"
            aria-label="Kaufpreis"
          />
          <div className="flex gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={formFees}
              onChange={(e) => setFormFees(e.target.value)}
              placeholder="Gebühren"
              className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
              aria-label="Gebühren"
            />
            <input
              type="text"
              inputMode="decimal"
              value={formSpread}
              onChange={(e) => setFormSpread(e.target.value)}
              placeholder="Spread %"
              className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
              aria-label="Verkaufsspread"
            />
          </div>
        </div>
        {formError && <p className="text-[11px] text-rose-300">{formError}</p>}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] leading-snug text-slate-500">
            Speichert nur in deinem Browser. Steuerhinweis: keine Steuerberatung — bei Unsicherheit Steuerberater fragen.
          </p>
          <button
            type="submit"
            className="shrink-0 rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
          >
            {editingId !== null ? '✓ Änderungen speichern' : '+ speichern'}
          </button>
        </div>
      </form>
    </section>
  );
}
