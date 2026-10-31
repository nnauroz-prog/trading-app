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
  'auto': 'Damals üblichen Goldpreis verwenden',
  'total': 'Gesamter Kaufpreis ($)',
  'per-gram': 'Kaufpreis pro Gramm ($)',
  'per-ounce': 'Kaufpreis pro Feinunze ($)'
};

const VERDICT_TONE: Record<Verdict, { box: string; head: string; title: string; intro: string }> = {
  VERKAUFEN: { box: 'border-rose-500/50 bg-rose-950/20', head: 'text-rose-100', title: 'Einen Verkauf prüfen', intro: 'Die bisherigen Kursregeln sprechen eher für einen Verkauf. Vergleiche zuerst den tatsächlichen Händlerpreis mit deinem Kaufpreis und deinem Geldplan.' },
  HALTEN: { box: 'border-emerald-500/50 bg-emerald-950/20', head: 'text-emerald-100', title: 'Behalten prüfen', intro: 'Der bisherige Kursverlauf spricht eher dafür, das Gold zu behalten. Ob das zu dir passt, hängt auch davon ab, wann du das Geld brauchst.' },
  NACHKAUFEN: { box: 'border-sky-500/50 bg-sky-950/20', head: 'text-sky-100', title: 'Einen weiteren Kauf prüfen', intro: 'Die bisherigen Kursregeln machen einen weiteren Kauf prüfenswert. Nutze dafür nur Geld, das in deinem Geldplan langfristig für Gold vorgesehen ist.' },
  BEOBACHTEN: { box: 'border-amber-500/50 bg-amber-950/20', head: 'text-amber-100', title: 'Erst einmal abwarten', intro: 'Der Kursverlauf liefert gerade keinen klaren Hinweis. Du kannst später erneut nachsehen.' }
};

function fmtUsd(value: number | null, opts: { withSign?: boolean; decimals?: number } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const decimals = opts.decimals ?? 2;
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} $`;
}

function fmtPct(value: number | null, opts: { withSign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
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
        <div className="text-sm font-medium text-amber-400">Deine Goldmenge</div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Rechne mit deinem eigenen Gold.</h2>
        <p className="text-sm text-slate-400">
          Trage deine Goldmenge und das Kaufdatum ein. Du siehst den geschätzten Wert und den Unterschied zu deinem Kaufpreis. Alle Beträge sind in US-Dollar ($). Eine Feinunze entspricht etwa 31,1 Gramm.
        </p>
      </header>

      {/* ===== Deine Angaben ===== */}
      <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h3 className="text-sm font-semibold text-emerald-300">Deine Angaben</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Label text="Kaufdatum">
            <input
              type="date"
              value={purchaseDate}
              max={todayIso}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-2 py-2.5 text-base text-white focus:border-emerald-400 focus:outline-none"
            />
          </Label>
          <Label text="Menge">
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="block min-w-0 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2.5 font-mono text-base text-white focus:border-emerald-400 focus:outline-none"
                aria-label="Menge"
              />
              <select
                value={amountUnit}
                onChange={(e) => setAmountUnit(e.target.value as AmountUnit)}
                className="shrink-0 rounded border border-slate-700 bg-slate-950 px-2 py-2.5 text-base text-white focus:border-emerald-400 focus:outline-none"
                aria-label="Einheit"
              >
                {(Object.keys(UNIT_LABEL) as AmountUnit[]).map((u) => (
                  <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                ))}
              </select>
            </div>
          </Label>
          <Label text="Goldanteil (oft als Zahl eingeprägt)" className="sm:col-span-2">
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select
                value={useCustomPromille ? 'custom' : String(purityPromille)}
                onChange={(e) => {
                  if (e.target.value === 'custom') setUseCustomPromille(true);
                  else { setUseCustomPromille(false); setPurityPromille(Number(e.target.value)); }
                }}
                className="max-w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-base text-white focus:border-emerald-400 focus:outline-none"
              >
                {ALLOY_OPTIONS.map((a) => (
                  <option key={a.promille} value={a.promille}>{a.promille}er Gold · {(a.promille / 10).toLocaleString('de-DE')} % Gold</option>
                ))}
                <option value="custom">Andere Zahl eintragen</option>
              </select>
              {useCustomPromille && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={customPromille}
                  onChange={(e) => setCustomPromille(e.target.value)}
                  placeholder="z.B. 833"
                  className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-2.5 font-mono text-base text-white focus:border-emerald-400 focus:outline-none"
                  aria-label="Eingeprägte Goldzahl, zum Beispiel 585"
                />
              )}
            </div>
          </Label>
          <Label text="Was hast du bezahlt?" className="sm:col-span-2">
            <div className="mt-1 flex flex-wrap gap-2">
              <select
                value={purchasePriceMode}
                onChange={(e) => setPurchasePriceMode(e.target.value as PurchasePriceMode)}
                className="max-w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-base text-white focus:border-emerald-400 focus:outline-none"
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
                    purchasePriceMode === 'total' ? 'Gesamter Kaufpreis in $'
                    : purchasePriceMode === 'per-gram' ? '$ pro Gramm'
                    : '$ pro Feinunze'
                  }
                  className="block w-full max-w-[14rem] rounded border border-slate-700 bg-slate-950 px-2 py-2.5 font-mono text-base text-white focus:border-emerald-400 focus:outline-none"
                />
              )}
            </div>
            {purchasePriceMode === 'auto' && historical === null && (
              <p className="mt-1.5 text-sm text-amber-300">
                Für dieses Datum fehlt der damalige Kurs. Wähle stattdessen deinen eigenen Kaufpreis.
              </p>
            )}
          </Label>
          <details className="rounded-lg border border-slate-800 p-3 sm:col-span-2">
            <summary className="cursor-pointer text-sm text-slate-300">Kaufkosten und Verkaufsabzug ergänzen</summary>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Label text="Zusätzliche Kaufkosten ($, optional)">
            <input
              type="text"
              inputMode="decimal"
              value={feesStr}
              onChange={(e) => setFeesStr(e.target.value)}
              placeholder="0"
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-2 py-2.5 font-mono text-base text-white focus:border-emerald-400 focus:outline-none"
            />
          </Label>
          <Label text="Abzug beim Verkauf (%, optional)">
            <input
              type="text"
              inputMode="decimal"
              value={sellSpreadPctStr}
              onChange={(e) => setSellSpreadPctStr(e.target.value)}
              placeholder="Zum Beispiel: 2,5"
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-2 py-2.5 font-mono text-base text-white focus:border-emerald-400 focus:outline-none"
            />
          </Label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">Manche Händler zahlen weniger als den Börsenwert. Du kannst diesen Unterschied hier als Prozentwert eintragen.</p>
          </details>
        </div>
      </div>

      {!validAmount && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3 text-sm text-amber-100">
          Bitte eine gültige Menge eintragen, damit der Rechner loslegt.
        </p>
      )}
      {!validPromille && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3 text-sm text-amber-100">
          Die Goldzahl muss zwischen 1 und 1000 liegen. 585 bedeutet zum Beispiel 58,5 % Gold.
        </p>
      )}

      {result && (
        <>
          <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h3 className="text-lg font-semibold text-white">Dein geschätzter Goldwert</h3>
            <p className="font-mono text-3xl font-bold text-white">{fmtUsd(result.currentValue)}</p>
            <p className="text-sm leading-relaxed text-slate-400">Für {fmtGrams(result.pureGoldGrams)} reines Gold. Beim Händler können andere Preise gelten.</p>
            {Number.isFinite(sellSpreadPct) && sellSpreadPct > 0 && <p className="text-sm text-slate-300">Nach deinem eingetragenen Verkaufsabzug: <span className="font-semibold text-white">{fmtUsd(result.estimatedSellValueAfterSpread)}</span></p>}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Tile label="Was du bezahlt hast" value={fmtUsd(result.purchaseValue)} sub={Number.isFinite(fees) && fees > 0 ? 'Zusätzliche Kaufkosten sind enthalten' : undefined} />
              <Tile label="Gewinn oder Verlust vor Verkaufsabzug" value={fmtUsd(result.absolutePnL, { withSign: true })} sub={fmtPct(result.percentPnL, { withSign: true })} tone={pnlTone(result.absolutePnL)} />
              {Number.isFinite(sellSpreadPct) && sellSpreadPct > 0 && <Tile label="Gewinn oder Verlust nach Verkaufsabzug" value={fmtUsd(result.pnlAfterSpread, { withSign: true })} tone={pnlTone(result.pnlAfterSpread)} />}
            </dl>
            {!result.hasCompleteData && <p className="text-sm leading-relaxed text-amber-200">{result.currentValue === null ? 'Der aktuelle Kurs fehlt. Wir können den heutigen Wert noch nicht berechnen.' : 'Dein Kaufpreis fehlt. Trage ihn ein, damit wir Gewinn oder Verlust berechnen können.'}</p>}
          </section>

          {verdictStyle && result.hasCompleteData && <section className={`space-y-3 rounded-2xl border p-4 ${verdictStyle.box}`}>
            <h3 className={`text-lg font-semibold ${verdictStyle.head}`}>{verdictStyle.title}</h3>
            <p className="text-sm leading-relaxed text-slate-300">{verdictStyle.intro}</p>
            <p className="text-xs leading-relaxed text-slate-400">Diese Einschätzung beruht auf dem bisherigen Kursverlauf. Der Preis kann sich jederzeit anders entwickeln.</p>
          </section>}

          <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">Wie setzt sich der Wert zusammen?</summary>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Tile label="Gesamtgewicht" value={fmtGrams(result.grossAmountGrams)} />
              <Tile label="Goldanteil" value={`${(effectivePromille / 10).toLocaleString('de-DE')} %`} />
              <Tile label="Reines Gold" value={fmtGrams(result.pureGoldGrams)} sub={`${fmtOunces(result.pureGoldOunces)} · 1 Feinunze = etwa 31,1 g`} />
              <Tile label="Kaufdatum" value={new Date(`${purchaseDate}T00:00:00`).toLocaleDateString('de-DE')} />
              <Tile label="Kaufpreis pro Feinunze" value={fmtUsd(result.purchasePricePerOz)} />
              <Tile label="Goldkurs, der deine Kaufkosten deckt" value={fmtUsd(result.breakEvenPricePerOz)} sub="Pro Feinunze, vor einem Abzug beim Verkauf" />
              <Tile label="Heutiger Kurs pro Feinunze" value={fmtUsd(currentGoldPricePerOz)} />
              <Tile label="So lange gehört dir das Gold" value={holdingMonthsYearsLabel(result.holdingDays)} />
              <Tile label="Wertänderung auf ein Jahr umgerechnet" value={fmtPct(result.annualizedReturn, { withSign: true })} sub="Eine Vergleichsrechnung, keine Vorhersage" tone={pnlTone(result.annualizedReturn)} />
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function Label({ text, children, className = '' }: { text: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-sm text-slate-400 ${className}`}>
      <span className="font-medium">{text}</span>
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
      <div className="text-xs leading-relaxed opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs leading-relaxed opacity-70">{sub}</div>}
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
