'use client';

import { useEffect, useState } from 'react';
import { AccountConfig, DEFAULT_CONFIG, loadConfig, saveConfig } from '@/lib/account-config';

export function AccountConfigBar() {
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [editing, setEditing] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  const [riskInput, setRiskInput] = useState('1');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const c = loadConfig();
    setConfig(c);
    setSizeInput(c.accountSize > 0 ? c.accountSize.toString() : '');
    setRiskInput(c.maxRiskPct.toString());
    setCurrency(c.currency);
    setMounted(true);
  }, []);

  const handleSave = () => {
    const size = parseFloat(sizeInput);
    const risk = parseFloat(riskInput);
    if (!Number.isFinite(size) || size < 0) return;
    if (!Number.isFinite(risk) || risk <= 0 || risk > 10) return;
    const next: AccountConfig = { accountSize: size, maxRiskPct: risk, currency, riskLimits: config.riskLimits };
    saveConfig(next);
    setConfig(next);
    setEditing(false);
  };

  const handleClear = () => {
    const next = DEFAULT_CONFIG;
    saveConfig(next);
    setConfig(next);
    setSizeInput('');
    setRiskInput('1');
    setCurrency('EUR');
    setEditing(false);
  };

  if (!mounted) {
    return <div className="h-[44px]" />;
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-emerald-300">Kapital</label>
          <input
            type="number"
            inputMode="decimal"
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            placeholder="z.B. 5000"
            className="w-28 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD')}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-emerald-300">Max Risk</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={riskInput}
            onChange={(e) => setRiskInput(e.target.value)}
            className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
          />
          <span className="text-xs text-slate-400">% pro Trade</span>
        </div>
        <button
          onClick={handleSave}
          className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
        >
          Speichern
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
        >
          Abbrechen
        </button>
        {config.accountSize > 0 && (
          <button
            onClick={handleClear}
            className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-1 text-xs text-rose-300 hover:bg-rose-900/40"
          >
            Zurücksetzen
          </button>
        )}
        <span className="text-[10px] text-slate-500">Wird nur lokal in deinem Browser gespeichert.</span>
      </div>
    );
  }

  if (config.accountSize <= 0) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-3 text-left transition hover:border-emerald-500/40 hover:bg-emerald-950/20"
      >
        <div>
          <div className="text-sm font-semibold text-slate-200">Trading-Kapital konfigurieren</div>
          <div className="text-xs text-slate-500">Damit jedes Signal dir konkret zeigt: wie viele Coins kaufen, wie viel € einsetzen, wie viel € riskieren.</div>
        </div>
        <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Setup
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-slate-500">Kapital</div>
          <div className="font-mono text-sm font-semibold text-white">
            {config.currency === 'EUR' ? '€' : '$'}{config.accountSize.toLocaleString('de-DE')}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-widest text-slate-500">Max Risk / Trade</div>
          <div className="font-mono text-sm font-semibold text-rose-300">{config.maxRiskPct}%</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-widest text-slate-500">Max Verlust / Trade</div>
          <div className="font-mono text-sm font-semibold text-rose-300">
            {config.currency === 'EUR' ? '€' : '$'}{((config.accountSize * config.maxRiskPct) / 100).toFixed(2)}
          </div>
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:border-emerald-500/40 hover:bg-slate-800 hover:text-emerald-200"
      >
        Ändern
      </button>
    </div>
  );
}
