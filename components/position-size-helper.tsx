'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'trading-app.depot-capital-eur-v1';
const CAPITAL_CHANGED_EVENT = 'trading-app:depot-capital-changed';
const DEFAULT_RISK_PCT = 1; // 1 % des Depots pro Trade

interface Props {
  entry: number;
  stop: number;
  symbol: string;
}

// Position-Size-Helfer: User trägt einmalig sein Depot-Volumen in EUR ein
// (in localStorage gespeichert) und sieht dann pro Trade die konkrete Euro-
// Summe. Risiko pro Trade auf 1 % des Depots gekappt.
export function PositionSizeHelper({ entry, stop, symbol }: Props) {
  const [capital, setCapital] = useState<number>(0);
  const [riskPct, setRiskPct] = useState<number>(DEFAULT_RISK_PCT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.capital === 'number') setCapital(parsed.capital);
        if (typeof parsed.riskPct === 'number') setRiskPct(parsed.riskPct);
      } catch {
        // ignore
      }
    };
    sync();
    setMounted(true);
    window.addEventListener(CAPITAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CAPITAL_CHANGED_EVENT, sync);
  }, []);

  const save = (nextCapital: number, nextRisk: number) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ capital: nextCapital, riskPct: nextRisk }));
    window.dispatchEvent(new CustomEvent(CAPITAL_CHANGED_EVENT));
  };

  if (!mounted) return null;

  const stopDistancePct = entry > 0 ? Math.abs((entry - stop) / entry) * 100 : 0;
  const maxLossEur = capital * (riskPct / 100);
  const positionEur = stopDistancePct > 0 ? maxLossEur / (stopDistancePct / 100) : 0;
  const positionUnits = entry > 0 ? positionEur / entry : 0;
  const positionPctOfDepot = capital > 0 ? (positionEur / capital) * 100 : 0;

  return (
    <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Position-Größe für dich</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[9px] uppercase tracking-wider text-slate-500">Mein Depot (€)</span>
          <input
            type="number"
            min={0}
            value={capital || ''}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              setCapital(v);
              save(v, riskPct);
            }}
            placeholder="z. B. 5000"
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[12px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-wider text-slate-500">Risiko pro Trade (%)</span>
          <input
            type="number"
            min={0.1}
            max={5}
            step={0.1}
            value={riskPct}
            onChange={(e) => {
              const v = Number(e.target.value) || DEFAULT_RISK_PCT;
              setRiskPct(v);
              save(capital, v);
            }}
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[12px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
          />
        </label>
      </div>
      {capital > 0 ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-950/20 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300">Konkret jetzt</div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-[11.5px]">
            <div>
              <span className="text-slate-500">Kaufen für </span>
              <span className="font-mono font-bold text-emerald-100">€{positionEur.toFixed(2)}</span>
              <span className="text-slate-500"> ({positionPctOfDepot.toFixed(1)} % des Depots)</span>
            </div>
            <div>
              <span className="text-slate-500">Max. Verlust </span>
              <span className="font-mono font-bold text-rose-200">€{maxLossEur.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500">Einheiten </span>
              <span className="font-mono text-slate-100">{positionUnits.toFixed(positionUnits >= 1 ? 4 : 6)} {symbol}</span>
            </div>
            <div>
              <span className="text-slate-500">Stop-Abstand </span>
              <span className="font-mono text-slate-100">{stopDistancePct.toFixed(2)} %</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[10px] leading-snug text-slate-500">
          Trage einmalig dein Depot ein — die App rechnet dann pro Trade konkret aus, wie viel Euro reingehen sollen, damit der Stop höchstens {riskPct} % deines Kapitals kostet. Der Wert bleibt nur lokal in deinem Browser.
        </p>
      )}
    </div>
  );
}
