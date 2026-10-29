'use client';

import { useEffect, useState } from 'react';
import { compound, kellyFraction, positionSizing, rewardRisk } from '@/lib/calculators';
import { loadConfig, saveConfig } from '@/lib/account-config';

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
      <SimplePositionSizer />
      <details className="rounded-2xl border border-slate-800 bg-slate-900/30">
        <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 hover:text-slate-200">
          ▸ Mehr Rechner (für Profis) — Reward/Risk, Zinseszins, Kelly
        </summary>
        <div className="space-y-5 border-t border-slate-800 p-3 sm:p-4">
          <RrCalc />
          <CompoundCalc />
          <KellyCalc />
        </div>
      </details>
    </div>
  );
}

// Einfacher Positionsrechner — der eine, den fast jeder braucht.
// Konto-Groesse wird gemerkt (einmal eintippen, nie wieder), Risiko per
// Tipp-Chip, Ergebnis in Klartext statt Zahlenkolonne.
function SimplePositionSizer() {
  const [acc, setAcc] = useState('');
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [loaded, setLoaded] = useState(false);

  // Gespeicherte Konto-Groesse laden (einmal eintippen reicht).
  useEffect(() => {
    try {
      const c = loadConfig();
      if (c.accountSize > 0) setAcc(String(c.accountSize));
      if (c.maxRiskPct > 0) setRiskPct(c.maxRiskPct);
      setCurrency(c.currency);
    } catch { /* localStorage evtl. blockiert — Defaults bleiben */ }
    setLoaded(true);
  }, []);

  // Konto-Groesse + Risiko merken, sobald geaendert.
  useEffect(() => {
    if (!loaded) return;
    const size = parseFloat(acc);
    if (!Number.isFinite(size) || size <= 0) return;
    try {
      const c = loadConfig();
      saveConfig({ ...c, accountSize: size, maxRiskPct: riskPct, currency });
    } catch { /* ignore */ }
  }, [acc, riskPct, currency, loaded]);

  const result = positionSizing({
    accountBalance: parseFloat(acc) || 0,
    riskPerTradePct: riskPct,
    entryPrice: parseFloat(entry) || 0,
    stopPrice: parseFloat(stop) || 0
  });

  const cur = currency === 'USD' ? '$' : '€';
  const accNum = parseFloat(acc) || 0;
  const needEntryStop = !(parseFloat(entry) > 0 && parseFloat(stop) > 0);

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/30 bg-slate-900/50 p-4">
      <div className="space-y-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Wie viel kaufen?</div>
        <h2 className="text-lg font-bold tracking-tight text-white">Positionsgröße — in einem Schritt</h2>
        <p className="text-[11.5px] leading-snug text-slate-400">
          Sag mir dein Konto und wo dein Stop liegt — ich sage dir, wie viel du kaufst und was dich das im schlimmsten Fall kostet.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Dein Konto (wird gemerkt)</span>
        <div className="flex items-baseline gap-1.5">
          <input
            type="number" inputMode="decimal" value={acc} onChange={(e) => setAcc(e.target.value)}
            placeholder="z.B. 10000"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono text-[13px] text-slate-100"
          />
          <span className="text-[12px] text-slate-400">{cur}</span>
        </div>
      </label>

      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Wie viel darf ein Fehltrade kosten?</span>
        <div className="flex gap-1.5">
          {[0.5, 1, 2].map((p) => (
            <button
              key={p} type="button" onClick={() => setRiskPct(p)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-[12px] font-semibold transition ${
                riskPct === p
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
              }`}
            >
              {p} %{accNum > 0 ? ` · ${((accNum * p) / 100).toFixed(0)} ${cur}` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Kaufkurs</span>
          <input type="number" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="z.B. 100"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono text-[13px] text-slate-100" />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Stop (Ausstieg)</span>
          <input type="number" inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="z.B. 95"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono text-[13px] text-slate-100" />
        </label>
      </div>

      {accNum > 0 && !needEntryStop && result.feasible ? (
        <div className="space-y-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-3">
          <p className="text-[13px] leading-snug text-white">
            Kauf <span className="font-mono font-bold text-emerald-300">{result.positionSize.toFixed(result.positionSize < 1 ? 4 : 2)}</span> Einheiten
            {' '}(≈ <span className="font-mono text-emerald-200">{result.notional.toFixed(0)} {cur}</span> Einsatz).
          </p>
          <p className="text-[12px] leading-snug text-slate-300">
            Wenn dein Stop ausgelöst wird, verlierst du maximal{' '}
            <span className="font-mono font-semibold text-rose-300">{result.riskAmount.toFixed(0)} {cur}</span>
            {' '}— das sind {riskPct} % deines Kontos. Mehr ist nicht in Gefahr.
          </p>
          {result.warning && <p className="text-[10.5px] text-amber-300">⚠️ {result.warning}</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-[11.5px] text-slate-500">
          {accNum <= 0
            ? 'Trag zuerst dein Konto ein.'
            : needEntryStop
              ? 'Trag Kaufkurs und Stop ein — den Rest rechne ich.'
              : (result.warning ?? 'Stop muss unter dem Kaufkurs liegen (Long).')}
        </div>
      )}
    </section>
  );
}

function CompoundCalc() {
  const [start, setStart] = useState('5000');
  const [annual, setAnnual] = useState('8');
  const [years, setYears] = useState('10');
  const [contrib, setContrib] = useState('1200');

  const result = compound({
    startAmount: parseFloat(start) || 0,
    annualReturnPct: parseFloat(annual) || 0,
    years: parseInt(years) || 0,
    yearlyContribution: parseFloat(contrib) || 0
  });

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Zinseszins / Compound</h2>
      <p className="text-[11px] text-slate-500">Was wird aus deinem Geld bei X% jährlich plus monatlichen Einzahlungen? Realitäts-Check: 8% ist langfristiger Aktien-Durchschnitt, mehr ist optimistisch.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input label="Startbetrag" value={start} onChange={setStart} suffix="€" />
        <Input label="Ø Rendite p.a." value={annual} onChange={setAnnual} suffix="%" />
        <Input label="Laufzeit" value={years} onChange={setYears} suffix="Jahre" />
        <Input label="Pro Jahr drauflegen" value={contrib} onChange={setContrib} suffix="€" />
      </div>
      {result.yearlyValues.length > 1 && (
        <div className="space-y-1 rounded-md border border-slate-700 bg-slate-950/40 p-2.5 text-[12px]">
          <div className="flex justify-between"><span className="text-slate-400">Endwert</span><span className="font-mono font-bold text-emerald-300">{result.finalValue.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Eingezahlt insgesamt</span><span className="font-mono text-slate-100">{result.totalContributions.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Wachstum (vor Steuer)</span><span className={`font-mono ${result.totalGrowth > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{result.totalGrowth >= 0 ? '+' : ''}{result.totalGrowth.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span></div>
          <p className="mt-1 text-[10px] italic text-slate-500">Vereinfacht: keine Steuern, keine Inflation, keine Schwankungen. Realer Markt hat Drawdowns — die Durchschnittsrendite kommt nur, wenn man Krisen durchhält.</p>
        </div>
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
