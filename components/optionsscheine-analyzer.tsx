'use client';

import { useMemo, useState } from 'react';
import { analyzeOptionsscheinInput } from '@/lib/optionsscheine/analyze';
import { buildScenarios } from '@/lib/optionsscheine/scenarios';
import { addOptionsscheinToWatchlist } from '@/lib/optionsscheine/watchlist';

const RISK_TONE: Record<string, string> = {
  'Niedrigstes Risiko': 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
  'Niedriges Risiko': 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  'Mittleres Risiko': 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  'Hohes Risiko': 'border-rose-400/40 bg-rose-500/10 text-rose-100',
  'Sehr hohes Risiko': 'border-rose-500/60 bg-rose-500/15 text-rose-100',
  'Unbekanntes Risiko': 'border-slate-700 bg-slate-900/40 text-slate-200'
};

const THETA_TONE: Record<string, string> = {
  critical: 'text-rose-300',
  high: 'text-amber-300',
  moderate: 'text-sky-300',
  low: 'text-emerald-300'
};

const MONEYNESS_LABEL: Record<string, string> = {
  itm: 'Im Geld (ITM)',
  atm: 'Am Geld (ATM)',
  otm: 'Aus dem Geld (OTM)',
  deep_otm: 'Tief aus dem Geld',
  unknown: 'unbekannt'
};

function fmtEur(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number | null | undefined, withSign = true): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const sign = withSign && n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} %`;
}

interface OptionsscheineAnalyzerProps {
  defaultUnderlyingName?: string;
  defaultUnderlyingPrice?: string;
}

export function OptionsscheineAnalyzer({ defaultUnderlyingName = '', defaultUnderlyingPrice = '' }: OptionsscheineAnalyzerProps = {}) {
  const [underlyingName, setUnderlyingName] = useState(defaultUnderlyingName);
  const [underlyingPrice, setUnderlyingPrice] = useState(defaultUnderlyingPrice);
  const [strike, setStrike] = useState('');
  const [direction, setDirection] = useState<'call' | 'put'>('call');
  const [expiryIso, setExpiryIso] = useState('');
  const [knockOut, setKnockOut] = useState(false);
  const [wkn, setWkn] = useState('');
  const [premiumQuoted, setPremiumQuoted] = useState('');
  const [ratio, setRatio] = useState('');
  const [note, setNote] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const input = useMemo(() => ({
    underlyingName,
    underlyingPrice: parseFloat(underlyingPrice.replace(',', '.')),
    strike: parseFloat(strike.replace(',', '.')),
    direction,
    expiryIso: expiryIso || undefined,
    knockOut,
    wkn: wkn.trim() || undefined,
    premiumQuoted: premiumQuoted ? parseFloat(premiumQuoted.replace(',', '.')) : undefined,
    ratio: ratio ? parseFloat(ratio.replace(',', '.')) : undefined
  }), [underlyingName, underlyingPrice, strike, direction, expiryIso, knockOut, wkn, premiumQuoted, ratio]);

  const analysis = useMemo(() => analyzeOptionsscheinInput(input), [input]);
  const scenarios = useMemo(() => {
    if (!analysis) return [];
    return buildScenarios({
      underlyingPrice: analysis.underlyingPrice,
      strike: input.strike,
      direction,
      expiryIso: input.expiryIso,
      ratio: analysis.ratio,
      premiumQuoted: analysis.premiumQuoted
    });
  }, [analysis, input.strike, direction, input.expiryIso]);

  function handleSave() {
    if (!analysis) return;
    addOptionsscheinToWatchlist({
      underlyingName: analysis.underlyingName,
      underlyingPrice: analysis.underlyingPrice,
      strike: input.strike,
      direction,
      wkn: input.wkn,
      expiryIso: input.expiryIso,
      knockOut: input.knockOut,
      premiumQuoted: analysis.premiumQuoted ?? undefined,
      ratio: analysis.ratio,
      note: note.trim() || undefined
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <header className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Optionsschein-Analyse</h2>
        <p className="text-[10.5px] leading-snug text-slate-400">
          Modell-Schaetzung mit Standard-Vola 30 % und vereinfachter Delta-Tabelle. <span className="font-semibold text-amber-300">Keine Black-Scholes-Bewertung — Hinweis, kein Kauf-Trigger.</span> Markt-Premium und Bezugsverhaeltnis sind optional, aber wenn vorhanden wird der echte Hebel ausgewiesen.
        </p>
      </header>

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <Field label="Basiswert (Name)" required>
          <input
            type="text"
            value={underlyingName}
            onChange={(e) => setUnderlyingName(e.target.value)}
            placeholder="SAP / Dax / Tesla"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          />
        </Field>
        <Field label="Basiswert-Kurs (EUR/USD)" required>
          <input
            type="text"
            inputMode="decimal"
            value={underlyingPrice}
            onChange={(e) => setUnderlyingPrice(e.target.value)}
            placeholder="200.50"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-right font-mono text-[12px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          />
        </Field>
        <Field label="Basispreis (Strike)" required>
          <input
            type="text"
            inputMode="decimal"
            value={strike}
            onChange={(e) => setStrike(e.target.value)}
            placeholder="220.00"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-right font-mono text-[12px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          />
        </Field>
        <Field label="Richtung">
          <div className="flex gap-1.5">
            {(['call', 'put'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                  direction === d
                    ? d === 'call'
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                      : 'border-rose-400/60 bg-rose-500/15 text-rose-100'
                    : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500'
                }`}
              >
                {d === 'call' ? 'Call' : 'Put'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Verfallsdatum">
          <input
            type="date"
            value={expiryIso}
            onChange={(e) => setExpiryIso(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[12px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
          />
        </Field>
        <Field label="WKN (optional)">
          <input
            type="text"
            value={wkn}
            onChange={(e) => setWkn(e.target.value.toUpperCase())}
            placeholder="HX1ABC"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[12px] uppercase tracking-wider text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          />
        </Field>
        <Field label="Markt-Premium pro Schein (optional)">
          <input
            type="text"
            inputMode="decimal"
            value={premiumQuoted}
            onChange={(e) => setPremiumQuoted(e.target.value)}
            placeholder="2.45"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-right font-mono text-[12px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          />
        </Field>
        <Field label="Bezugsverhaeltnis (optional)">
          <input
            type="text"
            inputMode="decimal"
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
            placeholder="10"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-right font-mono text-[12px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          />
        </Field>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="knockout"
            type="checkbox"
            checked={knockOut}
            onChange={(e) => setKnockOut(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-400/40"
          />
          <label htmlFor="knockout" className="text-[11.5px] text-slate-200">
            Knock-Out (Faktor-Zertifikat oder Turbo) — Totalverlust bei Knock-Out-Schwelle
          </label>
        </div>
      </form>

      {analysis ? (
        <>
          <div className={`rounded-xl border-2 p-3 ${RISK_TONE[analysis.riskClass]}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-[9.5px] uppercase tracking-[0.25em] opacity-80">Risiko-Klasse</div>
                <div className="text-base font-bold">{analysis.riskClass}</div>
              </div>
              <div className="text-right text-[10.5px] leading-tight opacity-90">
                <div>Moneyness: <span className="font-semibold">{MONEYNESS_LABEL[analysis.moneyness.classification]}</span></div>
                <div>Strike-Abstand: <span className="font-mono">{fmtPct(analysis.moneyness.distancePct)}</span></div>
              </div>
            </div>
            <p className="mt-2 text-[11.5px] leading-snug">{analysis.recommendation}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Delta (Schaetzung)" value={analysis.estimatedDelta?.toFixed(2) ?? '—'} />
            <Stat label="Modell-Hebel" value={analysis.estimatedLeverage ? `~${analysis.estimatedLeverage.toFixed(1)}×` : '—'} />
            <Stat label="Markt-Hebel (effektiv)" value={analysis.effectiveLeverage ? `${analysis.effectiveLeverage.toFixed(1)}×` : '—'} tone="emphasis" />
            <Stat label="Restlaufzeit" value={analysis.daysToExpiry !== null ? `${analysis.daysToExpiry} Tage` : '—'} />
            <Stat label="Break-even (Basiswert)" value={fmtEur(analysis.approxBreakeven)} />
            <Stat label="Break-even-Move" value={fmtPct(analysis.breakevenMovePct)} />
            <Stat label="Theta-Druck" value={analysis.thetaUrgency} tone={THETA_TONE[analysis.thetaUrgency] ? 'theta' : 'neutral'} thetaToneClass={THETA_TONE[analysis.thetaUrgency]} />
            <Stat label="Bezugsverhaeltnis" value={`${analysis.ratio}:1`} />
          </div>

          {analysis.warnings.length > 0 && (
            <div className="space-y-1 rounded-lg border border-amber-400/40 bg-amber-950/15 p-3">
              <div className="text-[9.5px] font-semibold uppercase tracking-wider text-amber-300">Warnungen ({analysis.warnings.length})</div>
              <ul className="space-y-1 text-[11.5px] leading-snug text-amber-100/95">
                {analysis.warnings.map((w, i) => <li key={i}>· {w}</li>)}
              </ul>
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">Szenarien — was passiert mit dem Schein, wenn der Basiswert sich bewegt</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-2 py-1 text-left">Basiswert-Move</th>
                      <th className="px-2 py-1 text-right">Basiswert-Preis</th>
                      <th className="px-2 py-1 text-right">Schein-Wert (Modell)</th>
                      <th className="px-2 py-1 text-right">Innerer Wert</th>
                      <th className="px-2 py-1 text-right">Schein-Veraenderung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s) => {
                      const isToday = s.underlyingDeltaPct === 0;
                      const deltaTone = s.premiumDeltaPct === null
                        ? 'text-slate-400'
                        : s.premiumDeltaPct > 0 ? 'text-emerald-300'
                        : s.premiumDeltaPct < 0 ? 'text-rose-300'
                        : 'text-slate-400';
                      return (
                        <tr key={s.underlyingDeltaPct} className={`border-t border-slate-800 ${isToday ? 'bg-slate-950/60' : ''}`}>
                          <td className="px-2 py-1 font-mono text-slate-400">{isToday ? 'heute' : fmtPct(s.underlyingDeltaPct)}</td>
                          <td className="px-2 py-1 text-right font-mono text-slate-200">{fmtEur(s.underlyingPriceScenario)}</td>
                          <td className="px-2 py-1 text-right font-mono text-slate-100">{fmtEur(s.approxPremium)}</td>
                          <td className="px-2 py-1 text-right font-mono text-slate-500">{fmtEur(s.intrinsic)}</td>
                          <td className={`px-2 py-1 text-right font-mono font-bold ${deltaTone}`}>{fmtPct(s.premiumDeltaPct)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[9.5px] leading-snug text-slate-500">
                Veraenderung wird relativ zum Markt-Premium berechnet (wenn vorhanden). Ohne Markt-Premium ist nur der absolute Modell-Schein-Wert sichtbar. Implizite Vola wird mit 30 % konstant angenommen — bei einem echten Volatilitaets-Sprung kann der reale Schein deutlich anders reagieren.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notiz fuer die Watchlist (optional)"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11.5px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/25"
            >
              {savedFlash ? '✓ gespeichert' : '+ auf Watchlist'}
            </button>
          </div>
        </>
      ) : (
        <p className="rounded-md border border-dashed border-slate-700 bg-slate-950/40 p-3 text-[11.5px] text-slate-400">
          Trage Basiswert-Name, Basiswert-Kurs und Strike ein — Risiko-Analyse und Szenarien erscheinen sofort hier.
        </p>
      )}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
        {label}{required && <span className="ml-1 text-rose-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value, tone, thetaToneClass }: { label: string; value: string; tone?: 'emphasis' | 'theta' | 'neutral'; thetaToneClass?: string }) {
  const valueColor = tone === 'emphasis'
    ? 'text-emerald-300'
    : tone === 'theta' && thetaToneClass
      ? thetaToneClass
      : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-[13px] font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}
