'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Candle } from '@/lib/types/domain';
import { ema, macd, rsi } from '@/lib/analysis/indicators';

const INTERVALS = [
  { id: '15m', label: '15M' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' }
] as const;

type IntervalId = (typeof INTERVALS)[number]['id'];

interface ChartGeom {
  width: number;
  height: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  candleH: number;
  volH: number;
  rsiH: number;
  macdH: number;
  gap: number;
}

const GEOM: ChartGeom = {
  width: 1000,
  height: 620,
  marginLeft: 50,
  marginRight: 60,
  marginTop: 16,
  candleH: 320,
  volH: 60,
  rsiH: 70,
  macdH: 90,
  gap: 14
};

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(3);
  return value.toFixed(5);
}

function fmtDate(ms: number, interval: IntervalId): string {
  const d = new Date(ms);
  if (interval === '1d' || interval === '1w') {
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear().toString().slice(-2)}`;
  }
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function fmtVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

export function InteractiveChart({
  assetId,
  initialCandles,
  initialInterval,
  title
}: {
  assetId: string;
  initialCandles: Candle[];
  initialInterval: IntervalId;
  title: string;
}) {
  const [candles, setCandles] = useState<Candle[]>(initialCandles);
  const [interval, setInterval] = useState<IntervalId>(initialInterval);
  const [loading, setLoading] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [show, setShow] = useState({ ema50: true, ema20: true, rsi: true, macd: true, volume: true });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (interval === initialInterval) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/candles?assetId=${assetId}&interval=${interval}&limit=200`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.ok && Array.isArray(d.candles)) setCandles(d.candles);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [interval, assetId, initialInterval]);

  const view = useMemo(() => candles.slice(-120), [candles]);

  const closes = useMemo(() => view.map((c) => c.close), [view]);
  const fullCloses = useMemo(() => candles.map((c) => c.close), [candles]);
  const ema50Full = useMemo(() => ema(fullCloses, 50), [fullCloses]);
  const ema20Full = useMemo(() => ema(fullCloses, 20), [fullCloses]);
  const ema50Tail = useMemo(() => ema50Full.slice(-view.length), [ema50Full, view.length]);
  const ema20Tail = useMemo(() => ema20Full.slice(-view.length), [ema20Full, view.length]);
  const rsiFull = useMemo(() => rsi(fullCloses, 14), [fullCloses]);
  const rsiTail = useMemo(() => rsiFull.slice(-view.length), [rsiFull, view.length]);
  const macdResult = useMemo(() => macd(fullCloses), [fullCloses]);
  const macdTail = useMemo(() => macdResult.macd.slice(-view.length), [macdResult.macd, view.length]);
  const signalTail = useMemo(() => macdResult.signal.slice(-view.length), [macdResult.signal, view.length]);
  const histTail = useMemo(() => macdResult.histogram.slice(-view.length), [macdResult.histogram, view.length]);

  const priceMin = useMemo(() => {
    const candleLow = Math.min(...view.map((c) => c.low));
    const emaLow = Math.min(...ema50Tail.filter(Number.isFinite), ...ema20Tail.filter(Number.isFinite));
    return Math.min(candleLow, emaLow);
  }, [view, ema50Tail, ema20Tail]);
  const priceMax = useMemo(() => {
    const candleHigh = Math.max(...view.map((c) => c.high));
    const emaHigh = Math.max(...ema50Tail.filter(Number.isFinite), ...ema20Tail.filter(Number.isFinite));
    return Math.max(candleHigh, emaHigh);
  }, [view, ema50Tail, ema20Tail]);

  const priceRange = priceMax - priceMin || 1;
  const pricePad = priceRange * 0.06;
  const yMin = priceMin - pricePad;
  const yMax = priceMax + pricePad;

  const innerLeft = GEOM.marginLeft;
  const innerWidth = GEOM.width - GEOM.marginLeft - GEOM.marginRight;

  const candleTop = GEOM.marginTop;
  const candleBottom = candleTop + GEOM.candleH;
  const volTop = candleBottom + GEOM.gap;
  const volBottom = show.volume ? volTop + GEOM.volH : volTop;
  const rsiTop = volBottom + GEOM.gap;
  const rsiBottom = show.rsi ? rsiTop + GEOM.rsiH : rsiTop;
  const macdTop = rsiBottom + GEOM.gap;
  const macdBottom = show.macd ? macdTop + GEOM.macdH : macdTop;

  const candleSpacing = innerWidth / view.length;
  const candleBodyW = Math.max(1.5, candleSpacing * 0.7);

  const xAt = (i: number) => innerLeft + (i + 0.5) * candleSpacing;
  const yPrice = (p: number) => candleTop + GEOM.candleH - ((p - yMin) / (yMax - yMin)) * GEOM.candleH;

  const maxVol = useMemo(() => Math.max(...view.map((c) => c.volume), 1), [view]);
  const yVol = (v: number) => volTop + GEOM.volH - (v / maxVol) * GEOM.volH;

  const yRsi = (v: number) => rsiTop + GEOM.rsiH - (v / 100) * GEOM.rsiH;

  const macdVals = [...macdTail, ...signalTail, ...histTail];
  const macdMin = Math.min(...macdVals, 0);
  const macdMax = Math.max(...macdVals, 0);
  const macdRangeVal = macdMax - macdMin || 1;
  const yMacd = (v: number) => macdTop + GEOM.macdH - ((v - macdMin) / macdRangeVal) * GEOM.macdH;

  const priceTicks = useMemo(() => {
    const N = 5;
    const out: { p: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const p = yMin + ((yMax - yMin) * (N - i)) / N;
      out.push({ p, y: candleTop + (i * GEOM.candleH) / N });
    }
    return out;
  }, [yMin, yMax, candleTop]);

  const handleMove = useCallback((clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    const xRel = ((clientX - rect.left) / rect.width) * GEOM.width;
    const idx = Math.floor((xRel - innerLeft) / candleSpacing);
    if (idx >= 0 && idx < view.length) setHoverIdx(idx);
    else setHoverIdx(null);
  }, [candleSpacing, innerLeft, view.length]);

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    handleMove(e.clientX, e.currentTarget);
  };
  const onTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX, e.currentTarget);
    }
  };
  const onLeave = () => setHoverIdx(null);

  const last = view[view.length - 1];
  const hovered = hoverIdx !== null ? view[hoverIdx] : null;
  const displayCandle = hovered ?? last;
  const displayIdx = hoverIdx ?? view.length - 1;
  const hoverX = hovered ? xAt(hoverIdx!) : null;
  const hoverRsi = displayIdx >= 0 && displayIdx < rsiTail.length ? rsiTail[displayIdx] : undefined;
  const hoverMacdHist = displayIdx >= 0 && displayIdx < histTail.length ? histTail[displayIdx] : undefined;

  const change = displayCandle ? displayCandle.close - displayCandle.open : 0;
  const changePct = displayCandle ? (change / displayCandle.open) * 100 : 0;
  const changeColor = change >= 0 ? 'text-emerald-300' : 'text-rose-300';

  const emaLinePath = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yPrice(v).toFixed(1)}`).join(' ');

  const rsiLinePath = rsiTail.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yRsi(v).toFixed(1)}`).join(' ');
  const macdLinePath = macdTail.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yMacd(v).toFixed(1)}`).join(' ');
  const signalLinePath = signalTail.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yMacd(v).toFixed(1)}`).join(' ');
  const macdZeroY = yMacd(0);

  const xTickCount = 6;
  const xTickStep = Math.max(1, Math.floor(view.length / xTickCount));
  const xLabels: Array<{ label: string; x: number }> = [];
  for (let i = 0; i < view.length; i += xTickStep) {
    xLabels.push({ label: fmtDate(view[i].openTime, interval), x: xAt(i) });
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</h3>
          <p className="text-[10px] text-slate-600">
            {view.length} Kerzen · EMA(20) · EMA(50) · RSI(14) · MACD(12,26,9) {loading && '· lade…'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/60 p-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv.id}
              onClick={() => setInterval(iv.id)}
              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                interval === iv.id
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      {displayCandle && (
        <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
          <span className="font-mono text-2xl font-bold text-white">${fmtPrice(displayCandle.close)}</span>
          <span className={`font-mono text-sm font-semibold ${changeColor}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(Math.abs(change) >= 1 ? 2 : 5)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            O {fmtPrice(displayCandle.open)} · H {fmtPrice(displayCandle.high)} · L {fmtPrice(displayCandle.low)} · V {fmtVolume(displayCandle.volume)}
          </span>
          <span className="font-mono text-[11px] text-slate-500">{fmtDate(displayCandle.openTime, interval)}</span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${GEOM.width} ${macdBottom + 30}`}
        className="w-full touch-none select-none"
        style={{ aspectRatio: `${GEOM.width}/${macdBottom + 30}` }}
        onMouseMove={onMouseMove}
        onMouseLeave={onLeave}
        onTouchMove={onTouchMove}
        onTouchEnd={onLeave}
      >
        {priceTicks.map((t, i) => (
          <g key={`yp-${i}`}>
            <line x1={innerLeft} y1={t.y} x2={innerLeft + innerWidth} y2={t.y} stroke="#1e293b" strokeWidth={0.4} strokeDasharray="2,3" />
            <text x={innerLeft - 6} y={t.y + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="monospace">{fmtPrice(t.p)}</text>
          </g>
        ))}

        {view.map((c, i) => {
          const isUp = c.close >= c.open;
          const color = isUp ? '#34d399' : '#fb7185';
          const x = xAt(i);
          const top = yPrice(Math.max(c.open, c.close));
          const bot = yPrice(Math.min(c.open, c.close));
          const h = Math.max(bot - top, 0.8);
          return (
            <g key={`c-${i}`}>
              <line x1={x} y1={yPrice(c.high)} x2={x} y2={yPrice(c.low)} stroke={color} strokeWidth={1} />
              <rect x={x - candleBodyW / 2} y={top} width={candleBodyW} height={h} fill={color} opacity={isUp ? 0.95 : 0.88} />
            </g>
          );
        })}

        {show.ema20 && <path d={emaLinePath(ema20Tail)} stroke="#60a5fa" strokeWidth={1.1} fill="none" opacity={0.9} />}
        {show.ema50 && <path d={emaLinePath(ema50Tail)} stroke="#fbbf24" strokeWidth={1.2} fill="none" opacity={0.9} />}

        {show.volume && (
          <>
            <line x1={innerLeft} y1={volTop} x2={innerLeft + innerWidth} y2={volTop} stroke="#1e293b" strokeWidth={0.3} />
            <text x={innerLeft} y={volTop - 4} fontSize={9} fill="#64748b" fontFamily="monospace" letterSpacing={1.5}>VOLUME</text>
            {view.map((c, i) => {
              const isUp = c.close >= c.open;
              const color = isUp ? 'rgba(52,211,153,0.55)' : 'rgba(251,113,133,0.55)';
              const x = xAt(i);
              const y = yVol(c.volume);
              const h = volTop + GEOM.volH - y;
              return <rect key={`v-${i}`} x={x - candleBodyW / 2} y={y} width={candleBodyW} height={h} fill={color} />;
            })}
          </>
        )}

        {show.rsi && (
          <>
            <text x={innerLeft} y={rsiTop - 4} fontSize={9} fill="#64748b" fontFamily="monospace" letterSpacing={1.5}>RSI(14)</text>
            <rect x={innerLeft} y={yRsi(70)} width={innerWidth} height={yRsi(30) - yRsi(70)} fill="#1e293b" opacity={0.3} />
            <line x1={innerLeft} y1={yRsi(70)} x2={innerLeft + innerWidth} y2={yRsi(70)} stroke="#475569" strokeWidth={0.4} strokeDasharray="2,3" />
            <line x1={innerLeft} y1={yRsi(30)} x2={innerLeft + innerWidth} y2={yRsi(30)} stroke="#475569" strokeWidth={0.4} strokeDasharray="2,3" />
            <text x={innerLeft - 4} y={yRsi(70) + 3} textAnchor="end" fontSize={8} fill="#64748b" fontFamily="monospace">70</text>
            <text x={innerLeft - 4} y={yRsi(30) + 3} textAnchor="end" fontSize={8} fill="#64748b" fontFamily="monospace">30</text>
            <path d={rsiLinePath} stroke="#a78bfa" strokeWidth={1.2} fill="none" />
          </>
        )}

        {show.macd && (
          <>
            <text x={innerLeft} y={macdTop - 4} fontSize={9} fill="#64748b" fontFamily="monospace" letterSpacing={1.5}>MACD(12,26,9)</text>
            <line x1={innerLeft} y1={macdZeroY} x2={innerLeft + innerWidth} y2={macdZeroY} stroke="#475569" strokeWidth={0.4} />
            {histTail.map((h, i) => {
              const x = xAt(i);
              const y1 = yMacd(h);
              const top = Math.min(macdZeroY, y1);
              const height = Math.abs(y1 - macdZeroY);
              const color = h >= 0 ? '#34d399' : '#fb7185';
              return <rect key={`mh-${i}`} x={x - candleBodyW / 2} y={top} width={candleBodyW} height={Math.max(height, 0.5)} fill={color} opacity={0.55} />;
            })}
            <path d={macdLinePath} stroke="#60a5fa" strokeWidth={1.1} fill="none" />
            <path d={signalLinePath} stroke="#f59e0b" strokeWidth={1.1} fill="none" />
          </>
        )}

        {hoverX !== null && (
          <>
            <line x1={hoverX} y1={candleTop} x2={hoverX} y2={macdBottom} stroke="#94a3b8" strokeWidth={0.6} strokeDasharray="3,3" />
            {displayCandle && (
              <line
                x1={innerLeft}
                y1={yPrice(displayCandle.close)}
                x2={innerLeft + innerWidth}
                y2={yPrice(displayCandle.close)}
                stroke="#94a3b8"
                strokeWidth={0.6}
                strokeDasharray="3,3"
              />
            )}
            {displayCandle && (
              <g>
                <rect
                  x={innerLeft + innerWidth + 2}
                  y={yPrice(displayCandle.close) - 8}
                  width={GEOM.marginRight - 4}
                  height={16}
                  fill="#0f172a"
                  stroke="#475569"
                  strokeWidth={0.5}
                  rx={3}
                />
                <text
                  x={innerLeft + innerWidth + GEOM.marginRight / 2}
                  y={yPrice(displayCandle.close) + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#e2e8f0"
                  fontFamily="monospace"
                  fontWeight={600}
                >
                  {fmtPrice(displayCandle.close)}
                </text>
              </g>
            )}
          </>
        )}

        {xLabels.map((l, i) => (
          <text key={`xl-${i}`} x={l.x} y={macdBottom + 14} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">
            {l.label}
          </text>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px]">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />Up</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-rose-400" />Down</span>
        </div>
        <button
          onClick={() => setShow((s) => ({ ...s, ema20: !s.ema20 }))}
          className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${show.ema20 ? 'text-blue-300' : 'text-slate-600'}`}
        >
          <span className="inline-block h-0.5 w-3 bg-blue-400" />EMA(20)
        </button>
        <button
          onClick={() => setShow((s) => ({ ...s, ema50: !s.ema50 }))}
          className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${show.ema50 ? 'text-amber-300' : 'text-slate-600'}`}
        >
          <span className="inline-block h-0.5 w-3 bg-amber-400" />EMA(50)
        </button>
        <button
          onClick={() => setShow((s) => ({ ...s, volume: !s.volume }))}
          className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${show.volume ? 'text-slate-300' : 'text-slate-600'}`}
        >
          <span className="inline-block h-2 w-2 rounded-sm bg-slate-400" />Volume
        </button>
        <button
          onClick={() => setShow((s) => ({ ...s, rsi: !s.rsi }))}
          className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${show.rsi ? 'text-violet-300' : 'text-slate-600'}`}
        >
          <span className="inline-block h-0.5 w-3 bg-violet-400" />RSI
        </button>
        <button
          onClick={() => setShow((s) => ({ ...s, macd: !s.macd }))}
          className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${show.macd ? 'text-blue-300' : 'text-slate-600'}`}
        >
          <span className="inline-block h-0.5 w-3 bg-blue-400" />MACD
        </button>
        {hoverRsi !== undefined && (
          <span className="ml-auto font-mono text-[10px] text-slate-500">
            RSI <span className="text-violet-300">{hoverRsi.toFixed(0)}</span>
            {hoverMacdHist !== undefined && (
              <>
                {' · '}MACD-Hist <span className={hoverMacdHist >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                  {hoverMacdHist >= 0 ? '+' : ''}{hoverMacdHist.toFixed(3)}
                </span>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
