// Aktien-Detail-Seite. Lädt 1-Jahr-Tageskerzen + Live-Quote, berechnet die wichtigsten
// Indikatoren (MA50, MA200, RSI, ATR, 52W-Range, Mehrtages-Performance) und zeigt sie
// in einer übersichtlichen Karte. Bei API-Ausfall ehrlicher Empty-State.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AktienWatchlistToggle } from '@/components/aktien-watchlist-toggle';
import { InstrumentSafetyCard } from '@/components/instrument-safety-card';
import { STOCK_UNIVERSE } from '@/lib/market/stocks';
import { fetchYahooQuote, fmtCurrency, fmtChange } from '@/lib/market/yahoo-quote';
import { fetchYahooHistory, type PriceCandle } from '@/lib/market/yahoo-history';
import {
  atr, ema, fiftyTwoWeekRange, performancePct, rsi, sma, trendVerdict, volumeRatio
} from '@/lib/market/indicators';
import { evaluateInstrumentSafety } from '@/lib/market/instrument-safety';
import { backtestSafetyStrategy } from '@/lib/market/instrument-safety-backtest';
import { InstrumentSafetyBacktestMini } from '@/components/instrument-safety-backtest-mini';
import { getStockSafetyScan } from '@/lib/market/stock-safety-scan';
import { SectorPeerComparison } from '@/components/sector-peer-comparison';
import { SuggestedLevelsCard } from '@/components/suggested-levels-card';
import { PositionSizer } from '@/components/position-sizer';
import { computeSafetyScoreHistory } from '@/lib/market/safety-score-history';
import { SafetyScoreTrend } from '@/components/safety-score-trend';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface PageProps {
  params: Promise<{ symbol: string }>;
}

const TF_LABELS: Array<{ days: number; label: string }> = [
  { days: 1, label: '1T' },
  { days: 5, label: '1W' },
  { days: 21, label: '1M' },
  { days: 63, label: '3M' },
  { days: 126, label: '6M' },
  { days: 252, label: '1J' }
];

export default async function AktienDetailPage({ params }: PageProps) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  const stock = STOCK_UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol);
  if (!stock) notFound();

  const [quote, history, safetyScan] = await Promise.all([
    fetchYahooQuote(stock.symbol, stock.name),
    fetchYahooHistory(stock.symbol),
    getStockSafetyScan()
  ]);
  const sectorPeers = safetyScan.filter((e) => e.group === stock.group);

  const closes = history?.candles.map((c) => c.close) ?? [];
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const ema20 = ema(closes, 20);
  const rsi14 = rsi(closes, 14);
  const atr14 = history ? atr(history.candles, 14) : null;
  const range52w = history ? fiftyTwoWeekRange(history.candles) : null;
  const volRatio = history ? volumeRatio(history.candles, 20) : null;
  const verdict = quote ? trendVerdict(quote.last, ma50, ma200) : 'neutral';
  const safety = quote && history ? evaluateInstrumentSafety({ price: quote.last, candles: history.candles }) : null;
  const safetyBacktest = history ? backtestSafetyStrategy(history.candles) : null;
  const scoreHistory = history ? computeSafetyScoreHistory(history.candles, 60) : [];

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/aktien" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Aktien-Übersicht
      </Link>

      <header className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">📈 {stock.group}</div>
            <h1 className="truncate text-2xl font-bold tracking-tight text-white">{stock.name}</h1>
            <div className="font-mono text-[11px] text-slate-500">{stock.symbol}</div>
          </div>
          <div className="shrink-0 text-right">
            {quote ? (
              <>
                <div className="font-mono text-2xl font-bold text-slate-100">{fmtCurrency(quote.last, quote.currency)}</div>
                <div className={`font-mono text-xs font-semibold ${quote.changePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {fmtChange(quote.changePct)}
                </div>
              </>
            ) : (
              <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                Quote nicht verfügbar
              </span>
            )}
          </div>
        </div>
        <div className="pt-1">
          <AktienWatchlistToggle symbol={stock.symbol} name={stock.name} currentPrice={quote?.last} />
        </div>
      </header>

      {!history ? (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-sm text-slate-400">
          Historische Tageskerzen für die Indikatoren sind gerade nicht verfügbar. Bitte später erneut laden.
        </section>
      ) : (
        <>
          {safety && <InstrumentSafetyCard assessment={safety} name={stock.name} />}

          {safety && quote && atr14 !== null && (
            <SuggestedLevelsCard
              price={quote.last}
              atr={atr14}
              currency={history.currency}
              grade={safety.grade}
            />
          )}

          {safety && quote && atr14 !== null && safety.grade !== 'D' && (
            <PositionSizer
              entryPrice={quote.last}
              stopPrice={quote.last - 2 * atr14}
              currency={history.currency}
            />
          )}

          {safetyBacktest && <InstrumentSafetyBacktestMini result={safetyBacktest} name={stock.name} />}

          {scoreHistory.length >= 2 && <SafetyScoreTrend points={scoreHistory} />}

          {safety && sectorPeers.length >= 2 && (
            <SectorPeerComparison
              symbol={stock.symbol}
              group={stock.group}
              ownScore={safety.score}
              peers={sectorPeers}
            />
          )}

          <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Trend &amp; Indikatoren</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="MA50" value={ma50 !== null ? fmtCurrency(ma50, history.currency) : '—'}
                tone={quote && ma50 !== null ? (quote.last > ma50 ? 'good' : 'bad') : 'neutral'}
                hint={quote && ma50 !== null ? `Preis ${quote.last > ma50 ? 'über' : 'unter'} MA50` : null}
              />
              <Stat label="MA200" value={ma200 !== null ? fmtCurrency(ma200, history.currency) : '—'}
                tone={quote && ma200 !== null ? (quote.last > ma200 ? 'good' : 'bad') : 'neutral'}
                hint={quote && ma200 !== null ? `Preis ${quote.last > ma200 ? 'über' : 'unter'} MA200` : null}
              />
              <Stat label="EMA20" value={ema20 !== null ? fmtCurrency(ema20, history.currency) : '—'} tone="neutral" />
              <Stat label="Trend" value={verdict === 'bullish' ? 'Aufwärts' : verdict === 'bearish' ? 'Abwärts' : 'Seitwärts'}
                tone={verdict === 'bullish' ? 'good' : verdict === 'bearish' ? 'bad' : 'neutral'}
                hint={verdict === 'bullish' ? 'Preis > MA50 > MA200' : verdict === 'bearish' ? 'Preis < MA50 < MA200' : 'gemischt'}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="RSI (14)" value={rsi14 !== null ? rsi14.toFixed(0) : '—'}
                tone={rsi14 === null ? 'neutral' : rsi14 >= 70 ? 'bad' : rsi14 <= 30 ? 'good' : 'neutral'}
                hint={rsi14 === null ? null : rsi14 >= 70 ? 'überkauft' : rsi14 <= 30 ? 'überverkauft' : 'gesunde Range'}
              />
              <Stat label="ATR (14)" value={atr14 !== null ? fmtCurrency(atr14, history.currency) : '—'}
                tone="neutral"
                hint={atr14 !== null && quote ? `~${((atr14 / quote.last) * 100).toFixed(1)}% des Kurses` : null}
              />
              <Stat label="Volumen (heute)" value={volRatio !== null ? `${volRatio.toFixed(2)}×` : '—'}
                tone={volRatio === null ? 'neutral' : volRatio >= 1.5 ? 'good' : volRatio <= 0.7 ? 'bad' : 'neutral'}
                hint={volRatio === null ? null : volRatio >= 1.5 ? 'erhöhtes Interesse' : volRatio <= 0.7 ? 'unter Schnitt' : 'normal'}
              />
              {range52w && (
                <Stat label="52W-Position" value={`${range52w.positionPct.toFixed(0)} %`}
                  tone={range52w.positionPct >= 80 ? 'good' : range52w.positionPct <= 20 ? 'bad' : 'neutral'}
                  hint={range52w.positionPct >= 80 ? 'nahe Jahres-Hoch' : range52w.positionPct <= 20 ? 'nahe Jahres-Tief' : 'mittig'}
                />
              )}
            </div>
          </section>

          {range52w && (
            <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">52-Wochen-Range</h2>
              <div className="relative h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="absolute top-0 h-full w-1 rounded-full bg-emerald-300"
                  style={{ left: `calc(${range52w.positionPct}% - 2px)` }}
                />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-slate-500">
                <span>{fmtCurrency(range52w.low, history.currency)}</span>
                <span>{fmtCurrency(range52w.high, history.currency)}</span>
              </div>
            </section>
          )}

          <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Performance</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {TF_LABELS.map(({ days, label }) => {
                const p = performancePct(history.candles, days);
                return (
                  <div key={label} className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-2 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
                    <div className={`mt-0.5 font-mono text-xs font-bold ${p === null ? 'text-slate-500' : p >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {p === null ? '—' : `${p >= 0 ? '+' : ''}${p.toFixed(1)} %`}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <Sparkline candles={history.candles} />
        </>
      )}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Datenquelle: Yahoo Finance v8 Chart API (1-Jahr-Tageskerzen, Cache 1h).
        Indikatoren rein technisch — Hilfsmittel, keine Anlageberatung.
      </footer>
    </main>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral'; hint?: string | null }) {
  const toneClass = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-200';
  return (
    <div className={`rounded-lg border p-2 ${toneClass}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-[9.5px] opacity-80">{hint}</div>}
    </div>
  );
}

function Sparkline({ candles }: { candles: PriceCandle[] }) {
  const W = 320;
  const H = 80;
  if (candles.length < 2) return null;
  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = Math.max(1e-6, max - min);
  const xs = (i: number) => (i / (closes.length - 1)) * (W - 2) + 1;
  const ys = (v: number) => H - 1 - ((v - min) / range) * (H - 2);
  const path = closes.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(' ');
  const positive = closes[closes.length - 1] >= closes[0];
  const stroke = positive ? '#34d399' : '#fb7185';
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">12-Monats-Verlauf</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Kursverlauf 12 Monate">
        <path d={path} stroke={stroke} strokeWidth={1.4} fill="none" />
      </svg>
    </section>
  );
}
