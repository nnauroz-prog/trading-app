// Konkrete Trade-Levels für eine Aktie oder einen Rohstoff: Einstieg
// (Marktpreis), Stop-Loss (entry − 2×ATR), TP1 (entry + 3×ATR), TP2
// (entry + 6×ATR). Risiko/Reward klar ausgewiesen. Nur eingeblendet,
// wenn das Setup nicht klar abzulehnen ist (Grade A oder B).

interface Props {
  price: number;
  atr: number;
  currency: string;
  grade: 'A' | 'B' | 'C' | 'D';
}

function fmt(value: number, currency: string): string {
  const safe = currency && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'USD';
  const decimals = Math.abs(value) >= 100 ? 2 : Math.abs(value) >= 1 ? 2 : 4;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: safe,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch {
    return `${value.toFixed(decimals)} ${safe}`;
  }
}

export function SuggestedLevelsCard({ price, atr, currency, grade }: Props) {
  if (atr <= 0) return null;
  if (grade === 'D') return null;

  const stop = price - 2 * atr;
  const tp1 = price + 3 * atr;
  const tp2 = price + 6 * atr;
  const stopDistPct = ((price - stop) / price) * 100;
  const tp1DistPct = ((tp1 - price) / price) * 100;
  const tp2DistPct = ((tp2 - price) / price) * 100;
  const rr1 = tp1DistPct / stopDistPct;
  const rr2 = tp2DistPct / stopDistPct;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Vorgeschlagene Trade-Levels</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Stop-Loss bei 2×ATR Abstand, Ziele bei 3× und 6× ATR. ATR ({fmt(atr, currency)}) misst die typische Tages-Schwankung.
          Klassisches Profi-Risiko-Management — keine Anlageempfehlung.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile
          label="Einstieg (Markt)"
          value={fmt(price, currency)}
          sub="aktueller Kurs"
          tone="neutral"
        />
        <Tile
          label="Stop-Loss"
          value={fmt(stop, currency)}
          sub={`−${stopDistPct.toFixed(2)} %`}
          tone="bad"
        />
        <Tile
          label="Ziel 1"
          value={fmt(tp1, currency)}
          sub={`+${tp1DistPct.toFixed(2)} % · R/R 1:${rr1.toFixed(1)}`}
          tone="good"
        />
        <Tile
          label="Ziel 2"
          value={fmt(tp2, currency)}
          sub={`+${tp2DistPct.toFixed(2)} % · R/R 1:${rr2.toFixed(1)}`}
          tone="good"
        />
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        Praxis-Tipp: Bei Erreichen von Ziel 1 die Hälfte verkaufen und Stop auf Einstieg nachziehen — danach ist der Rest &bdquo;gratis&ldquo;.
        ATR-basierte Stops sind klassisch, aber kein Garant gegen Lücken bei News.
      </p>
    </section>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-100';
  return (
    <div className={`rounded-lg border p-2 text-center ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
      <div className="text-[9.5px] opacity-80">{sub}</div>
    </div>
  );
}
