'use client';

import { useMemo, useState } from 'react';
import {
  calculateGoldHoldingPerformance,
  ALLOY_OPTIONS,
  type AmountUnit,
  type PurchasePriceMode,
  type MarketContext,
  type Verdict
} from '@/lib/gold/gold-holding-calculator';

interface HistoryPoint {
  dateIso: string;   // YYYY-MM-DD
  closeUsd: number;  // USD/oz
}

interface Props {
  // Wird vom Server bereitgestellt: PAXG-Tageskerzen als USD/oz proxy für die letzten 12 Monate.
  history: HistoryPoint[];
  currentGoldPricePerOz: number | null;
  todayIso: string;
  marketContext: MarketContext;
}

const UNIT_LABEL: Record<AmountUnit, string> = {
  gram: 'Gramm',
  ounce: 'Feinunze',
  kilogram: 'Kilogramm'
};

const MODE_LABEL: Record<PurchasePriceMode, string> = {
  'auto': 'Automatisch (historischer Tagespreis)',
  'total': 'Kaufpreis gesamt (USD)',
  'per-gram': 'Kaufpreis pro Gramm (USD)',
  'per-ounce': 'Kaufpreis pro Unze (USD)'
};

const VERDICT_TONE: Record<Verdict, { box: string; head: string; pill: string; emoji: string; intro: string }> = {
  VERKAUFEN:  { box: 'border-rose-500/50 bg-rose-950/20', head: 'text-rose-100', pill: 'bg-rose-500/30 text-rose-100', emoji: '🔻', intro: 'Der Markt spricht eher dafür, Position zu reduzieren oder zu schließen.' },
  HALTEN:     { box: 'border-emerald-500/50 bg-emerald-950/20', head: 'text-emerald-100', pill: 'bg-emerald-500/30 text-emerald-100', emoji: '🤝', intro: 'Der Markt spricht eher für Halten — der langfristige Trend ist intakt.' },
  NACHKAUFEN: { box: 'border-sky-500/50 bg-sky-950/20', head: 'text-sky-100', pill: 'bg-sky-500/30 text-sky-100', emoji: '➕', intro: 'Nachkaufen nur mit klar begrenzter Position — niemals alles auf einmal.' },
  BEOBACHTEN: { box: 'border-amber-500/50 bg-amber-950/20', head: 'text-amber-100', pill: 'bg-amber-500/30 text-amber-100', emoji: '👀', intro: 'Heute keine klare Aktion — den Markt erst stabilisieren lassen.' }
};

function fmtUsd(value: number | null, opts: { withSign?: boolean; decimals?: number } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const decimals = opts.decimals ?? 2;
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} $`;
}

function fmtPct(value: number | null, opts: { withSign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} %`;
}

function fmtGrams(value: number): string {
  return `${value.toFixed(3).replace(/\.?0+$/, '')} g`;
}

function fmtOunces(value: number): string {
  return `${value.toFixed(4).replace(/\.?0+$/, '')} oz`;
}

function nearestHistoricalPrice(history: HistoryPoint[], purchaseDate: string): number | null {
  if (history.length === 0) return null;
  const target = new Date(`${purchaseDate}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  // Frühestes Datum im Datensatz (für Out-of-Range-Check).
  const sorted = [...history].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  const earliest = new Date(`${sorted[0].dateIso}T00:00:00`).getTime();
  if (target < earliest - 24 * 60 * 60 * 1000) return null;
  // Nächster Handelstag <= target (sonst nächstgelegener insgesamt im 7-Tage-Fenster).
  let bestAtOrBefore: HistoryPoint | null = null;
  let nearestDiff = Infinity;
  let nearest: HistoryPoint | null = null;
  for (const p of sorted) {
    const pMs = new Date(`${p.dateIso}T00:00:00`).getTime();
    const diff = Math.abs(pMs - target);
    if (pMs <= target) {
      if (!bestAtOrBefore || new Date(`${bestAtOrBefore.dateIso}T00:00:00`).getTime() < pMs) {
        bestAtOrBefore = p;
      }
    }
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearest = p;
    }
  }
  if (bestAtOrBefore) return bestAtOrBefore.closeUsd;
  if (nearest && nearestDiff <= 7 * 24 * 60 * 60 * 1000) return nearest.closeUsd;
  return null;
}

export function GoldHoldingCalculator({ history, currentGoldPricePerOz, todayIso, marketContext }: Props) {
  const [purchaseDate, setPurchaseDate] = useState<string>(() => {
    // Default: vor ~12 Monaten, wenn möglich aus History — sonst heute.
    if (history.length > 0) {
      const sorted = [...history].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
      return sorted[Math.floor(sorted.length / 2)].dateIso;
    }
    return todayIso;
  });
  const [amountStr, setAmountStr] = useState<string>('100');
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('gram');
  const [purityPromille, setPurityPromille] = useState<number>(999);
  const [customPromille, setCustomPromille] = useState<string>('');
  const [useCustomPromille, setUseCustomPromille] = useState(false);
  const [purchasePriceMode, setPurchasePriceMode] = useState<PurchasePriceMode>('auto');
  const [purchasePriceStr, setPurchasePriceStr] = useState<string>('');
  const [feesStr, setFeesStr] = useState<string>('');
  const [sellSpreadPctStr, setSellSpreadPctStr] = useState<string>('');

  const amount = Number.parseFloat(amountStr.replace(',', '.'));
  const validAmount = Number.isFinite(amount) && amount > 0;
  const effectivePromille = useCustomPromille
    ? Number.parseFloat(customPromille.replace(',', '.'))
    : purityPromille;
  const validPromille = Number.isFinite(effectivePromille) && effectivePromille > 0 && effectivePromille <= 1000;
  const purchasePrice = Number.parseFloat(purchasePriceStr.replace(',', '.'));
  const fees = Number.parseFloat(feesStr.replace(',', '.'));
  const sellSpreadPct = Number.parseFloat(sellSpreadPctStr.replace(',', '.'));

  const historical = useMemo(() => nearestHistoricalPrice(history, purchaseDate), [history, purchaseDate]);

  const result = useMemo(() => {
    if (!validAmount || !validPromille) return null;
    return calculateGoldHoldingPerformance({
      purchaseDate,
      amount,
      amountUnit,
      purityPromille: effectivePromille,
      purchasePriceMode,
      purchasePrice: Number.isFinite(purchasePrice) && purchasePrice > 0 ? purchasePrice : undefined,
      fees: Number.isFinite(fees) && fees > 0 ? fees : undefined,
      sellSpreadPct: Number.isFinite(sellSpreadPct) && sellSpreadPct > 0 ? sellSpreadPct : undefined,
      currentGoldPricePerOz,
      historicalGoldPricePerOz: historical,
      currentDate: todayIso,
      marketContext
    });
  }, [
    validAmount, validPromille, purchaseDate, amount, amountUnit, effectivePromille,
    purchasePriceMode, purchasePrice, fees, sellSpreadPct,
    currentGoldPricePerOz, historical, todayIso, marketContext
  ]);

  const verdictStyle = result ? VERDICT_TONE[result.verdict] : null;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-400">Gold-Holding-Rechner</div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Was ist dein Bestand wirklich wert?</h2>
        <p className="text-sm text-slate-400">
          Eingabe inkl. Legierung, Gebühren und Verkaufsspread. Der Rechner berücksichtigt die echte Feingoldmenge — nicht die Bruttomenge — und liefert ein Verkaufs-Urteil aus der aktuellen Marktstruktur.
        </p>
      </header>

      {/* ===== 1. Eingabe ===== */}
      <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">1. Eingabe</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Label text="Kaufdatum">
            <input
              type="date"
              value={purchaseDate}
              max={todayIso}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </Label>
          <Label text="Menge">
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
                aria-label="Menge"
              />
              <select
                value={amountUnit}
                onChange={(e) => setAmountUnit(e.target.value as AmountUnit)}
                className="shrink-0 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
                aria-label="Einheit"
              >
                {(Object.keys(UNIT_LABEL) as AmountUnit[]).map((u) => (
                  <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                ))}
              </select>
            </div>
          </Label>
          <Label text="Legierung / Feingehalt" className="sm:col-span-2">
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select
                value={useCustomPromille ? 'custom' : String(purityPromille)}
                onChange={(e) => {
                  if (e.target.value === 'custom') setUseCustomPromille(true);
                  else { setUseCustomPromille(false); setPurityPromille(Number(e.target.value)); }
                }}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
              >
                {ALLOY_OPTIONS.map((a) => (
                  <option key={a.promille} value={a.promille}>{a.label}</option>
                ))}
                <option value="custom">Benutzerdefiniert in Promille</option>
              </select>
              {useCustomPromille && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={customPromille}
                  onChange={(e) => setCustomPromille(e.target.value)}
                  placeholder="z.B. 833"
                  className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
                  aria-label="Feingehalt in Promille"
                />
              )}
            </div>
          </Label>
          <Label text="Kaufpreis (optional)" className="sm:col-span-2">
            <div className="mt-1 flex flex-wrap gap-2">
              <select
                value={purchasePriceMode}
                onChange={(e) => setPurchasePriceMode(e.target.value as PurchasePriceMode)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
              >
                {(Object.keys(MODE_LABEL) as PurchasePriceMode[]).map((m) => (
                  <option key={m} value={m}>{MODE_LABEL[m]}</option>
                ))}
              </select>
              {purchasePriceMode !== 'auto' && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={purchasePriceStr}
                  onChange={(e) => setPurchasePriceStr(e.target.value)}
                  placeholder={
                    purchasePriceMode === 'total' ? 'Gesamtsumme in USD'
                    : purchasePriceMode === 'per-gram' ? 'USD pro Gramm'
                    : 'USD pro Unze'
                  }
                  className="block w-full max-w-[14rem] rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
                />
              )}
            </div>
            {purchasePriceMode === 'auto' && historical === null && (
              <p className="mt-1.5 text-[10.5px] text-amber-300">
                Für dieses Kaufdatum ist kein historischer Goldpreis verfügbar.
              </p>
            )}
          </Label>
          <Label text="Gebühren / Aufgeld (USD, optional)">
            <input
              type="text"
              inputMode="decimal"
              value={feesStr}
              onChange={(e) => setFeesStr(e.target.value)}
              placeholder="0"
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </Label>
          <Label text="Verkaufsspread (%, optional)">
            <input
              type="text"
              inputMode="decimal"
              value={sellSpreadPctStr}
              onChange={(e) => setSellSpreadPctStr(e.target.value)}
              placeholder="z.B. 2.5"
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </Label>
        </div>
      </div>

      {!validAmount && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3 text-[12px] text-amber-100">
          Bitte eine gültige Menge eintragen, damit der Rechner loslegt.
        </p>
      )}
      {!validPromille && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3 text-[12px] text-amber-100">
          Feingehalt muss zwischen 1 und 1000 Promille liegen.
        </p>
      )}

      {result && (
        <>
          {/* ===== 2. Dein Goldbestand ===== */}
          <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">2. Dein Goldbestand</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Bruttomenge" value={fmtGrams(result.grossAmountGrams)} />
              <Tile label="Legierung" value={`${effectivePromille}/1000`} sub={useCustomPromille ? 'benutzerdefiniert' : (ALLOY_OPTIONS.find((a) => a.promille === purityPromille)?.label.split(' ')[0] ?? '—')} />
              <Tile label="Feingold (Gramm)" value={fmtGrams(result.pureGoldGrams)} />
              <Tile label="Feingold (Unzen)" value={fmtOunces(result.pureGoldOunces)} />
            </div>
          </div>

          {/* ===== 3. Einstand ===== */}
          <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">3. Einstand</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Tile label="Kaufdatum" value={new Date(`${purchaseDate}T00:00:00`).toLocaleDateString('de-DE')} />
              <Tile label="Kaufpreis je Unze" value={fmtUsd(result.purchasePricePerOz)} />
              <Tile label="Kaufwert gesamt" value={fmtUsd(result.purchaseValue)} sub={Number.isFinite(fees) && fees > 0 ? `inkl. ${fmtUsd(fees)} Gebühren` : undefined} />
              <Tile label="Gebühren" value={fmtUsd(Number.isFinite(fees) && fees > 0 ? fees : 0)} />
              <Tile label="Break-even je Unze" value={fmtUsd(result.breakEvenPricePerOz)} sub="Goldpreis, der den Einstand exakt deckt" />
            </div>
          </div>

          {/* ===== 4. Aktueller Wert ===== */}
          <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">4. Aktueller Wert</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Tile label="Aktueller Goldpreis" value={fmtUsd(currentGoldPricePerOz)} sub="USD pro Feinunze" />
              <Tile label="Aktueller Marktwert" value={fmtUsd(result.currentValue)} />
              <Tile label="Verkaufswert nach Spread" value={fmtUsd(result.estimatedSellValueAfterSpread)} sub={Number.isFinite(sellSpreadPct) && sellSpreadPct > 0 ? `nach ${sellSpreadPct.toFixed(2)} % Abschlag` : 'kein Spread eingegeben'} />
              <Tile label="Gewinn / Verlust absolut" value={fmtUsd(result.absolutePnL, { withSign: true })} tone={pnlTone(result.absolutePnL)} />
              <Tile label="Gewinn / Verlust in %" value={fmtPct(result.percentPnL, { withSign: true })} tone={pnlTone(result.percentPnL)} />
              <Tile label="Nach Spread" value={fmtUsd(result.pnlAfterSpread, { withSign: true })} tone={pnlTone(result.pnlAfterSpread)} />
            </div>
            <p className={`mt-1 text-[12px] font-semibold ${result.percentPnL === null ? 'text-slate-300' : result.percentPnL > 0 ? 'text-emerald-300' : result.percentPnL < 0 ? 'text-rose-300' : 'text-slate-300'}`}>
              {result.percentPnL === null ? 'Keine Performance berechenbar.'
                : result.percentPnL > 0 ? `Du bist im Gewinn (${result.percentPnL.toFixed(2)} %).`
                : result.percentPnL < 0 ? `Du bist im Verlust (${result.percentPnL.toFixed(2)} %).`
                : 'Du bist genau auf Break-even.'}
            </p>
          </div>

          {/* ===== 5. Haltedauer ===== */}
          <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">5. Haltedauer</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Tile label="Tage" value={`${result.holdingDays}`} />
              <Tile
                label="Monate / Jahre"
                value={result.holdingDays === 0 ? '—' : holdingMonthsYearsLabel(result.holdingDays)}
              />
              <Tile label="Annualisierte Rendite" value={fmtPct(result.annualizedReturn, { withSign: true })} sub="Compound (1 + r)^(365/d) − 1" tone={pnlTone(result.annualizedReturn)} />
            </div>
          </div>

          {/* ===== 6. Verkaufsurteil ===== */}
          {verdictStyle && (
            <section className={`space-y-3 rounded-2xl border-2 p-5 ${verdictStyle.box}`}>
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">6. Verkaufsurteil</div>
                  <h3 className={`mt-1 text-2xl font-bold ${verdictStyle.head}`}>{verdictStyle.emoji} {result.verdict}</h3>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${verdictStyle.pill}`}>
                  {result.verdict}
                </span>
              </div>
              <p className={`text-[12px] leading-snug ${verdictStyle.head} opacity-90`}>{verdictStyle.intro}</p>
              <ul className="space-y-1.5 text-[12px] text-slate-200">
                {result.verdictReasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 leading-snug">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              {result.warnings.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hinweise</div>
                  <ul className="flex flex-wrap gap-1.5">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="rounded border border-slate-700 bg-slate-950/60 px-2 py-0.5 text-[10px] text-slate-300">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-2.5 text-[11px] leading-relaxed text-slate-300">
                Modell-Hinweise aus Markt-Struktur und Position. Märkte können jederzeit drehen — nie mehr riskieren als du verlieren kannst, immer einen Stop einplanen. Keine Anlageberatung.
              </p>
              <p className="text-[10.5px] leading-snug text-slate-400">
                Steuerstatus bitte individuell prüfen. Die App ersetzt keine Steuerberatung.
              </p>
            </section>
          )}
        </>
      )}
    </section>
  );
}

function Label({ text, children, className = '' }: { text: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-[11px] text-slate-400 ${className}`}>
      <span className="font-semibold uppercase tracking-wider">{text}</span>
      {children}
    </label>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-100';
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[9.5px] opacity-70">{sub}</div>}
    </div>
  );
}

function pnlTone(value: number | null): 'good' | 'bad' | 'neutral' {
  if (value === null || !Number.isFinite(value)) return 'neutral';
  if (value > 0) return 'good';
  if (value < 0) return 'bad';
  return 'neutral';
}

function holdingMonthsYearsLabel(days: number): string {
  if (days < 30) return `${days} Tag${days === 1 ? '' : 'e'}`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `~${months} Monat${months === 1 ? '' : 'e'}`;
  }
  const years = days / 365;
  return `~${years.toFixed(1)} Jahr${years >= 2 ? 'e' : ''}`;
}
