'use client';

import { useEffect, useState } from 'react';
import { AccountConfig, DEFAULT_CONFIG, DEFAULT_RISK_LIMITS, RiskLimits, loadConfig, saveConfig } from '@/lib/account-config';

interface FieldDef {
  key: keyof RiskLimits;
  label: string;
  unit: string;
  hint: string;
  min: number;
  max: number;
  step: number;
}

const FIELDS: FieldDef[] = [
  { key: 'maxPositionPct', label: 'Max. Positionsgröße', unit: '% des Kapitals', hint: 'Warnung ab diesem Anteil in einer Position — kritisch ab dem Doppelten.', min: 1, max: 100, step: 1 },
  { key: 'maxPortfolioHeatPct', label: 'Max. Portfolio-Heat', unit: '% Risk gesamt', hint: 'Summe aller Stop-Risiken. Profi-Maximum ~6%. Kritisch ab dem Doppelten.', min: 0.5, max: 100, step: 0.5 },
  { key: 'maxHebelCount', label: 'Max. Hebelprodukte', unit: 'gleichzeitig', hint: 'Ab so vielen offenen Hebelprodukten (OS/KO) kommt eine Warnung.', min: 1, max: 50, step: 1 },
  { key: 'maxOpenPositions', label: 'Max. offene Positionen', unit: 'Stück', hint: 'Ab so vielen offenen Positionen kommt ein Hinweis (nicht bei „sehr spekulativ").', min: 1, max: 100, step: 1 }
];

export function RiskLimitsPanel() {
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [inputs, setInputs] = useState<Record<keyof RiskLimits, string>>({
    maxPositionPct: '25',
    maxPortfolioHeatPct: '6',
    maxHebelCount: '3',
    maxOpenPositions: '8'
  });
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = loadConfig();
    setConfig(c);
    setInputs({
      maxPositionPct: String(c.riskLimits.maxPositionPct),
      maxPortfolioHeatPct: String(c.riskLimits.maxPortfolioHeatPct),
      maxHebelCount: String(c.riskLimits.maxHebelCount),
      maxOpenPositions: String(c.riskLimits.maxOpenPositions)
    });
    setMounted(true);
  }, []);

  const setField = (key: keyof RiskLimits, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    const limits: RiskLimits = { ...config.riskLimits };
    for (const f of FIELDS) {
      const v = parseFloat(inputs[f.key]);
      if (Number.isFinite(v) && v >= f.min && v <= f.max) {
        limits[f.key] = v;
      }
    }
    const next: AccountConfig = { ...config, riskLimits: limits };
    saveConfig(next);
    setConfig(next);
    setInputs({
      maxPositionPct: String(limits.maxPositionPct),
      maxPortfolioHeatPct: String(limits.maxPortfolioHeatPct),
      maxHebelCount: String(limits.maxHebelCount),
      maxOpenPositions: String(limits.maxOpenPositions)
    });
    setSaved(true);
  };

  const handleReset = () => {
    const next: AccountConfig = { ...config, riskLimits: DEFAULT_RISK_LIMITS };
    saveConfig(next);
    setConfig(next);
    setInputs({
      maxPositionPct: String(DEFAULT_RISK_LIMITS.maxPositionPct),
      maxPortfolioHeatPct: String(DEFAULT_RISK_LIMITS.maxPortfolioHeatPct),
      maxHebelCount: String(DEFAULT_RISK_LIMITS.maxHebelCount),
      maxOpenPositions: String(DEFAULT_RISK_LIMITS.maxOpenPositions)
    });
    setSaved(true);
  };

  if (!mounted) return <div className="h-40 rounded-2xl border border-slate-800/80 bg-slate-900/40" />;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk-Guardian Schwellenwerte</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Ab wann der Risk-Guardian warnt. Die Voreinstellungen entsprechen gängigen Profi-Faustregeln — passe sie an deinen Stil an. Keine Finanzberatung.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <label className="text-[11px] font-semibold text-slate-200">{f.label}</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step={f.step}
                min={f.min}
                max={f.max}
                value={inputs[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400">{f.unit}</span>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleSave} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30">
          Speichern
        </button>
        <button onClick={handleReset} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600">
          Auf Standard zurücksetzen
        </button>
        {saved && <span className="text-[11px] text-emerald-300">✓ Gespeichert — wirkt sofort auf den Risk-Guardian.</span>}
      </div>
    </section>
  );
}
