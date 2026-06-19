// Backtest-Card: zeigt fuer die drei Risiko-Stufen, wie sie historisch
// auf dem gegebenen Basiswert gelaufen waeren. Ehrliche Antwort auf
// "haette das Setup auf Apple in den letzten 2 Jahren funktioniert?".
//
// Bewusst eingeklappt — wer schnell entscheiden will, sieht oben die
// Vorschlaege, wer Substanz pruefen will, klappt das hier auf.

import { backtestSuggestions, type BacktestStats } from '@/lib/optionsscheine/backtest';

interface Props {
  underlyingName: string;
  closes: number[];
  dates?: string[];
  sigma?: number;
  assetClass: 'aktie' | 'krypto';
  direction?: 'call' | 'put';
}

const RISK_LABEL: Record<string, string> = {
  niedrig: 'Niedrig',
  mittel: 'Mittel',
  hoch: 'Hoch'
};

const RISK_HEADER_TONE: Record<string, string> = {
  niedrig: 'text-emerald-300',
  mittel: 'text-amber-300',
  hoch: 'text-rose-300'
};

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} %`;
}

function returnTone(n: number): string {
  if (n > 50) return 'text-emerald-300 font-bold';
  if (n > 0) return 'text-emerald-300';
  if (n < -50) return 'text-rose-300 font-bold';
  if (n < 0) return 'text-rose-300';
  return 'text-slate-400';
}

function winRateTone(pct: number): string {
  if (pct >= 60) return 'text-emerald-300';
  if (pct >= 40) return 'text-amber-300';
  return 'text-rose-300';
}

export function OptionsscheineBacktestCard({ underlyingName, closes, dates, sigma, assetClass, direction = 'call' }: Props) {
  if (!Array.isArray(closes) || closes.length < 200) return null;

  const stats = backtestSuggestions({ closes, dates, sigma, assetClass, direction });
  if (stats.length === 0) return null;

  const lookbackDays = Math.min(closes.length, 730);
  const sampleStepLabel = '~30';

  return (
    <details className="rounded-2xl border border-sky-400/30 bg-slate-900/30 p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300">Backtest · ehrliche Statistik</div>
            <div className="text-[12.5px] font-semibold text-slate-100">
              Wie haetten die drei Setups auf {underlyingName} historisch gelaufen? ▸
            </div>
          </div>
          <span className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">aufklappen</span>
        </div>
      </summary>

      <div className="mt-4 space-y-3">
        <p className="text-[10.5px] leading-snug text-slate-400">
          Pro Risiko-Stufe wird alle <span className="font-mono text-slate-300">{sampleStepLabel}</span> Handelstage ein Setup generiert und bis zum Verfall durchgerechnet (Innerer Wert am Verfallstag minus damalige Modell-Praemie). Sample: letzte <span className="font-mono text-slate-300">{lookbackDays}</span> Handelstage. Modell-Vola: <span className="font-mono text-slate-300">{Math.round((sigma ?? 0.30) * 100)} % p.a.</span>
        </p>

        <div className="grid gap-2 md:grid-cols-3">
          {stats.map((s) => <StatCard key={s.risk} stats={s} />)}
        </div>

        <div className="rounded-md border border-amber-400/30 bg-amber-950/15 p-2.5 text-[10px] leading-snug text-amber-100/90">
          <span className="font-bold text-amber-300">Wichtig:</span> der Backtest nutzt nur den Modell-Premium (vereinfachte Black-Scholes-Approximation), keine echten Schein-Kurse. Reale Spreads, Liquiditaets-Engpaesse und Vola-Spruenge koennen die Ergebnisse spuerbar verschieben. Sample-Groesse pro Stufe ist klein (10-25 Trades). Trefferquote ist keine Garantie.
        </div>
      </div>
    </details>
  );
}

const VERDICT_TONE: Record<string, string> = {
  good: 'border-emerald-400/40 bg-emerald-950/15 text-emerald-100',
  mixed: 'border-amber-400/40 bg-amber-950/15 text-amber-100',
  bad: 'border-rose-400/40 bg-rose-950/15 text-rose-100'
};

function StatCard({ stats }: { stats: BacktestStats }) {
  const tone = RISK_HEADER_TONE[stats.risk];
  const winTone = winRateTone(stats.winRatePct);
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${tone}`}>
          {RISK_LABEL[stats.risk]}-Schein
        </div>
        <span className="text-[9px] uppercase tracking-wider text-slate-500">{stats.monthsToExpiry} Monate</span>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10.5px]">
        <BtStat label="Trades" value={String(stats.count)} />
        <BtStat label="Win-Rate" value={`${stats.winRatePct.toFixed(0)} %`} toneClass={winTone} />
        <BtStat label="Mean Return" value={fmtPct(stats.meanReturnPct)} toneClass={returnTone(stats.meanReturnPct)} />
        <BtStat label="Median" value={fmtPct(stats.medianReturnPct)} toneClass={returnTone(stats.medianReturnPct)} />
        <BtStat label="Max Gain" value={fmtPct(stats.maxGainPct)} toneClass="text-emerald-300" />
        <BtStat label="Max Loss" value={fmtPct(stats.maxLossPct)} toneClass="text-rose-300" />
        <BtStat label="Totalverluste" value={`${stats.fullLossCount}/${stats.count}`} toneClass={stats.fullLossCount > 0 ? 'text-rose-300' : 'text-slate-400'} />
        <BtStat label="Aktie Mean" value={fmtPct(stats.aktienReturnPctMean)} toneClass="text-slate-300" />
      </div>

      <p className={`rounded border px-2 py-1.5 text-[10px] leading-snug ${VERDICT_TONE[stats.verdictTone]}`}>
        {stats.verdict}
      </p>
    </div>
  );
}

function BtStat({ label, value, toneClass }: { label: string; value: string; toneClass?: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-[11px] ${toneClass ?? 'text-slate-100'}`}>{value}</div>
    </div>
  );
}
