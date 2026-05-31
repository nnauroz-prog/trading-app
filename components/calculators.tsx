'use client';

import { useState } from 'react';
import { kellyFraction, positionSizing, rewardRisk } from '@/lib/calculators';

function Input({ label, value, onChange, placeholder, suffix }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex items-baseline gap-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[12px] text-slate-100"
        />
        {suffix && <span className="text-[10px] text-slate-500">{suffix}</span>}
      </div>
    </label>
  );
}

export function Calculators() {
  return (
    <div className="space-y-5">
      <PositionSizer />
      <RrCalc />
      <KellyCalc />
    </div>
  );
}

function PositionSizer() {
  const [acc, setAcc] = useState('10000');
  const [risk, setRisk] = useState('1');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');

  const result = positionSizing({
    accountBalance: parseFloat(acc) || 0,
    riskPerTradePct: parseFloat(risk) || 0,
    entryPrice: parseFloat(entry) || 0,
    stopPrice: parseFloat(stop) || 0
  });

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Position-Größe (Risk-Based)</h2>
      <p className="text-[11px] text-slate-500">Wie viele Einheiten kaufen, damit ein Stop-Hit nur X% des Accounts kostet?</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Account-Balance" value={acc} onChange={setAcc} suffix="€" />
        <Input label="Risk pro Trade" value={risk} onChange={setRisk} suffix="%" />
        <Input label="Einstiegspreis" value={entry} onChange={setEntry} placeholder="z.B. 100" />
        <Input label="Stop-Preis" value={stop} onChange={setStop} placeholder="z.B. 95" />
      </div>
      {result.feasible ? (
        <div className="space-y-1 rounded-md border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-[12px]">
          <div className="flex justify-between"><span className="text-slate-400">Position-Größe</span><span className="font-mono font-bold text-emerald-300">{result.positionSize.toFixed(4)} Einheiten</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Notional</span><span className="font-mono text-slate-100">{result.notional.toFixed(2)} €</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Risiko-Betrag bei Stop</span><span className="font-mono text-rose-300">{result.riskAmount.toFixed(2)} €</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Stop-Distanz</span><span className="font-mono text-slate-300">{result.stopDistancePct.toFixed(2)}%</span></div>
          {result.warning && <p className="mt-1 text-[10px] text-amber-300">⚠️ {result.warning}</p>}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">{result.warning}</p>
      )}
    </section>
  );
}

function RrCalc() {
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [tp1, setTp1] = useState('');
  const [tp2, setTp2] = useState('');

  const result = rewardRisk({
    entry: parseFloat(entry) || 0,
    stop: parseFloat(stop) || 0,
    target1: parseFloat(tp1) || 0,
    target2: tp2 ? parseFloat(tp2) : undefined
  });

  const verdictTone = result.verdict === 'sehr gut' || result.verdict === 'gut' ? 'text-emerald-300' :
                      result.verdict === 'ok' ? 'text-amber-300' : 'text-rose-300';

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Reward / Risk</h2>
      <p className="text-[11px] text-slate-500">Wie viel Risiko nimmst du für wie viel Reward auf dich? Faustregel: ≥ 2:1.</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Einstieg" value={entry} onChange={setEntry} />
        <Input label="Stop" value={stop} onChange={setStop} />
        <Input label="Ziel 1" value={tp1} onChange={setTp1} />
        <Input label="Ziel 2 (optional)" value={tp2} onChange={setTp2} />
      </div>
      {result.rrTp1 > 0 ? (
        <div className="space-y-1 rounded-md border border-slate-700 bg-slate-950/40 p-2.5 text-[12px]">
          <div className="flex justify-between"><span className="text-slate-400">R/R Ziel 1</span><span className={`font-mono font-bold ${verdictTone}`}>{result.rrTp1.toFixed(2)}:1 · {result.verdict}</span></div>
          {result.rrTp2 !== null && <div className="flex justify-between"><span className="text-slate-400">R/R Ziel 2</span><span className="font-mono text-slate-100">{result.rrTp2.toFixed(2)}:1</span></div>}
          <div className="flex justify-between"><span className="text-slate-400">Risiko</span><span className="font-mono text-rose-300">{result.riskPct.toFixed(2)}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Reward Ziel 1</span><span className="font-mono text-emerald-300">+{result.rewardPct1.toFixed(2)}%</span></div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">Einstieg, Stop und Ziel 1 ausfüllen.</p>
      )}
    </section>
  );
}

function KellyCalc() {
  const [winRate, setWinRate] = useState('60');
  const [avgWin, setAvgWin] = useState('3');
  const [avgLoss, setAvgLoss] = useState('1.5');

  const result = kellyFraction({
    winRatePct: parseFloat(winRate) || 0,
    avgWinPct: parseFloat(avgWin) || 0,
    avgLossPct: parseFloat(avgLoss) || 0
  });

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Kelly-Größe (für Tüftler)</h2>
      <p className="text-[11px] text-slate-500">Optimale Position-Fraktion basierend auf Win-Rate und durchschnittlichem Gewinn/Verlust. In der Praxis Half-Kelly oder weniger.</p>
      <div className="grid grid-cols-3 gap-2">
        <Input label="Win-Rate" value={winRate} onChange={setWinRate} suffix="%" />
        <Input label="Ø Gewinn" value={avgWin} onChange={setAvgWin} suffix="%" />
        <Input label="Ø Verlust" value={avgLoss} onChange={setAvgLoss} suffix="%" />
      </div>
      {result.feasible ? (
        <div className="space-y-1 rounded-md border border-slate-700 bg-slate-950/40 p-2.5 text-[12px]">
          <div className="flex justify-between"><span className="text-slate-400">Voller Kelly</span><span className={`font-mono font-bold ${result.kellyFraction > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{(result.kellyFraction * 100).toFixed(1)}% des Accounts</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Half-Kelly (sicherer)</span><span className="font-mono text-slate-100">{(result.halfKelly * 100).toFixed(1)}%</span></div>
          {result.warning && <p className="mt-1 text-[10px] text-amber-300">⚠️ {result.warning}</p>}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">{result.warning}</p>
      )}
    </section>
  );
}
