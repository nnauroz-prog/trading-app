'use client';

import { useState } from 'react';

// Rechnet aus, wie viele Aktien gekauft werden können, wenn pro Trade nur ein
// festgelegter Risiko-Betrag (z. B. 1 % vom Konto) verloren werden darf —
// auf Basis des Einstiegs- und Stop-Loss-Preises.

interface Props {
  entryPrice: number;
  stopPrice: number;
  currency: string;
}

function fmtCurrency(value: number, currency: string): string {
  const safe = currency && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'USD';
  const decimals = Math.abs(value) >= 1000 ? 0 : 2;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: safe,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${safe}`;
  }
}

export function PositionSizer({ entryPrice, stopPrice, currency }: Props) {
  const [riskInput, setRiskInput] = useState('100');
  const riskAmount = Number.parseFloat(riskInput.replace(',', '.'));
  const validRisk = Number.isFinite(riskAmount) && riskAmount > 0;
  const riskPerShare = entryPrice - stopPrice;
  const validSetup = riskPerShare > 0;

  const shares = validRisk && validSetup ? Math.floor(riskAmount / riskPerShare) : 0;
  const positionCost = shares * entryPrice;
  const actualRisk = shares * riskPerShare;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Positions-Größen-Rechner</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Wie viele Aktien für dein Risiko? Trage ein, wie viel du maximal verlieren willst — der Rechner sagt dir die Stückzahl,
          mit der das exakt diesem Risiko entspricht (basiert auf Einstieg − Stop).
        </p>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-slate-300">
        <span className="shrink-0">Max. Risiko / Trade:</span>
        <input
          type="text"
          inputMode="decimal"
          value={riskInput}
          onChange={(e) => setRiskInput(e.target.value)}
          className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          aria-label="Maximales Risiko in der angezeigten Währung"
        />
        <span className="text-[10px] text-slate-500">{currency || 'USD'}</span>
      </label>
      {!validRisk && (
        <p className="text-[10.5px] text-rose-300">Bitte einen positiven Betrag eintragen.</p>
      )}
      {!validSetup && (
        <p className="text-[10.5px] text-rose-300">Stop liegt nicht unter dem Einstieg — Setup nicht handelbar.</p>
      )}
      {validRisk && validSetup && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Stück" value={shares.toString()} tone={shares > 0 ? 'good' : 'neutral'} />
          <Tile label="Risiko pro Stück" value={fmtCurrency(riskPerShare, currency)} tone="bad" />
          <Tile label="Positions-Wert" value={fmtCurrency(positionCost, currency)} tone="neutral" />
          <Tile label="Tatsächliches Risiko" value={fmtCurrency(actualRisk, currency)} tone="bad" />
        </div>
      )}
      <p className="text-[10px] leading-snug text-slate-500">
        Faustregel: nie mehr als 1–2 % deines Konto-Kapitals pro Trade riskieren — bei 10 Verlustern in Folge fehlen sonst {' '}
        20 % oder mehr, was schwer aufzuholen ist.
      </p>
    </section>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-100';
  return (
    <div className={`rounded-lg border p-2 text-center ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}
