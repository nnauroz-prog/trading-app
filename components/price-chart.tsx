import { Candle } from '@/lib/types/domain';
import { ema, rsi, macd } from '@/lib/analysis/indicators';

interface ChartGeometry {
  width: number;
  height: number;
  candleArea: { x: number; y: number; w: number; h: number };
  rsiArea: { x: number; y: number; w: number; h: number };
  macdArea: { x: number; y: number; w: number; h: number };
}

const GEOMETRY: ChartGeometry = {
  width: 1000,
  height: 580,
  candleArea: { x: 60, y: 16, w: 920, h: 320 },
  rsiArea: { x: 60, y: 360, w: 920, h: 80 },
  macdArea: { x: 60, y: 460, w: 920, h: 100 }
};

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function PriceChart({ candles, title }: { candles: Candle[]; title: string }) {
  if (candles.length < 20) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-500">
        Nicht genug Kerzendaten ({candles.length}) — Chart wird gerendert, sobald 20+ Bars verfügbar sind.
      </div>
    );
  }

  const sliced = candles.slice(-120);
  const ema50Full = ema(candles.map((c) => c.close), 50);
  const ema50Tail = ema50Full.slice(-sliced.length);
  const rsiFull = rsi(candles.map((c) => c.close), 14);
  const rsiTail = rsiFull.slice(-sliced.length);
  const macdResult = macd(candles.map((c) => c.close));
  const macdTail = macdResult.macd.slice(-sliced.length);
  const signalTail = macdResult.signal.slice(-sliced.length);
  const histTail = macdResult.histogram.slice(-sliced.length);

  const priceMin = Math.min(...sliced.map((c) => c.low), ...ema50Tail.filter((v) => Number.isFinite(v)));
  const priceMax = Math.max(...sliced.map((c) => c.high), ...ema50Tail.filter((v) => Number.isFinite(v)));
  const priceRange = priceMax - priceMin || 1;
  const pricePad = priceRange * 0.05;
  const yMin = priceMin - pricePad;
  const yMax = priceMax + pricePad;

  const candleW = (GEOMETRY.candleArea.w / sliced.length) * 0.7;

  const yPx = (price: number) => {
    const a = GEOMETRY.candleArea;
    return a.y + a.h - ((price - yMin) / (yMax - yMin)) * a.h;
  };
  const xPx = (i: number) => GEOMETRY.candleArea.x + (i + 0.5) * (GEOMETRY.candleArea.w / sliced.length);

  const rsiYPx = (val: number) => {
    const a = GEOMETRY.rsiArea;
    return a.y + a.h - (val / 100) * a.h;
  };

  const macdValues = [...macdTail, ...signalTail, ...histTail];
  const macdMin = Math.min(...macdValues, 0);
  const macdMax = Math.max(...macdValues, 0);
  const macdRange = (macdMax - macdMin) || 1;
  const macdYPx = (val: number) => {
    const a = GEOMETRY.macdArea;
    return a.y + a.h - ((val - macdMin) / macdRange) * a.h;
  };

  const yTicks = 5;
  const priceLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const price = yMin + ((yMax - yMin) * (yTicks - i)) / yTicks;
    return { price, y: GEOMETRY.candleArea.y + (i * GEOMETRY.candleArea.h) / yTicks };
  });

  const xTickCount = 6;
  const xTickStep = Math.max(1, Math.floor(sliced.length / xTickCount));
  const xLabels: Array<{ label: string; x: number }> = [];
  for (let i = 0; i < sliced.length; i += xTickStep) {
    xLabels.push({ label: fmtTime(sliced[i].openTime), x: xPx(i) });
  }

  const emaPath = ema50Tail
    .map((v, i) => (i === 0 || !Number.isFinite(v) ? `M ${xPx(i)} ${yPx(v)}` : `L ${xPx(i)} ${yPx(v)}`))
    .join(' ');

  const rsiPath = rsiTail
    .map((v, i) => (i === 0 ? `M ${xPx(i)} ${rsiYPx(v)}` : `L ${xPx(i)} ${rsiYPx(v)}`))
    .join(' ');

  const macdPath = macdTail.map((v, i) => (i === 0 ? `M ${xPx(i)} ${macdYPx(v)}` : `L ${xPx(i)} ${macdYPx(v)}`)).join(' ');
  const signalPath = signalTail.map((v, i) => (i === 0 ? `M ${xPx(i)} ${macdYPx(v)}` : `L ${xPx(i)} ${macdYPx(v)}`)).join(' ');

  const macdZero = macdYPx(0);
  const lastClose = sliced[sliced.length - 1].close;
  const lastRsi = rsiTail[rsiTail.length - 1];

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</h3>
          <p className="text-[10px] text-slate-600">1h-Kerzen · letzte {sliced.length} Bars · EMA(50) Overlay</p>
        </div>
        <div className="text-right font-mono">
          <div className="text-lg font-bold text-white">${fmtPrice(lastClose)}</div>
          <div className="text-[10px] text-slate-500">letzter Close</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${GEOMETRY.width} ${GEOMETRY.height}`} className="w-full" style={{ aspectRatio: `${GEOMETRY.width}/${GEOMETRY.height}` }}>
        {priceLabels.map((p, i) => (
          <g key={`yh-${i}`}>
            <line x1={GEOMETRY.candleArea.x} y1={p.y} x2={GEOMETRY.candleArea.x + GEOMETRY.candleArea.w} y2={p.y} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2,3" />
            <text x={GEOMETRY.candleArea.x - 6} y={p.y + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="monospace">{fmtPrice(p.price)}</text>
          </g>
        ))}

        {sliced.map((c, i) => {
          const isUp = c.close >= c.open;
          const color = isUp ? '#34d399' : '#fb7185';
          const x = xPx(i);
          const bodyTop = yPx(Math.max(c.open, c.close));
          const bodyBottom = yPx(Math.min(c.open, c.close));
          const bodyH = Math.max(bodyBottom - bodyTop, 1);
          return (
            <g key={`c-${i}`}>
              <line x1={x} y1={yPx(c.high)} x2={x} y2={yPx(c.low)} stroke={color} strokeWidth={1} />
              <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} opacity={isUp ? 0.95 : 0.85} />
            </g>
          );
        })}

        <path d={emaPath} stroke="#fbbf24" strokeWidth={1.2} fill="none" opacity={0.85} />

        <line x1={GEOMETRY.candleArea.x} y1={GEOMETRY.candleArea.y + GEOMETRY.candleArea.h} x2={GEOMETRY.candleArea.x + GEOMETRY.candleArea.w} y2={GEOMETRY.candleArea.y + GEOMETRY.candleArea.h} stroke="#334155" strokeWidth={0.5} />

        <text x={GEOMETRY.candleArea.x} y={GEOMETRY.rsiArea.y - 4} fontSize={9} fill="#64748b" fontFamily="monospace" letterSpacing={1.5}>RSI(14)</text>
        <rect x={GEOMETRY.rsiArea.x} y={rsiYPx(70)} width={GEOMETRY.rsiArea.w} height={rsiYPx(30) - rsiYPx(70)} fill="#1e293b" opacity={0.3} />
        <line x1={GEOMETRY.rsiArea.x} y1={rsiYPx(70)} x2={GEOMETRY.rsiArea.x + GEOMETRY.rsiArea.w} y2={rsiYPx(70)} stroke="#475569" strokeWidth={0.4} strokeDasharray="2,3" />
        <line x1={GEOMETRY.rsiArea.x} y1={rsiYPx(50)} x2={GEOMETRY.rsiArea.x + GEOMETRY.rsiArea.w} y2={rsiYPx(50)} stroke="#1e293b" strokeWidth={0.4} strokeDasharray="2,3" />
        <line x1={GEOMETRY.rsiArea.x} y1={rsiYPx(30)} x2={GEOMETRY.rsiArea.x + GEOMETRY.rsiArea.w} y2={rsiYPx(30)} stroke="#475569" strokeWidth={0.4} strokeDasharray="2,3" />
        <text x={GEOMETRY.rsiArea.x - 6} y={rsiYPx(70) + 3} textAnchor="end" fontSize={8} fill="#64748b" fontFamily="monospace">70</text>
        <text x={GEOMETRY.rsiArea.x - 6} y={rsiYPx(30) + 3} textAnchor="end" fontSize={8} fill="#64748b" fontFamily="monospace">30</text>
        <path d={rsiPath} stroke="#a78bfa" strokeWidth={1.2} fill="none" />
        {lastRsi !== undefined && (
          <circle cx={xPx(sliced.length - 1)} cy={rsiYPx(lastRsi)} r={2} fill="#a78bfa" />
        )}

        <text x={GEOMETRY.candleArea.x} y={GEOMETRY.macdArea.y - 4} fontSize={9} fill="#64748b" fontFamily="monospace" letterSpacing={1.5}>MACD(12,26,9)</text>
        <line x1={GEOMETRY.macdArea.x} y1={macdZero} x2={GEOMETRY.macdArea.x + GEOMETRY.macdArea.w} y2={macdZero} stroke="#475569" strokeWidth={0.5} />
        {histTail.map((h, i) => {
          const x = xPx(i);
          const y0 = macdZero;
          const y1 = macdYPx(h);
          const color = h >= 0 ? '#34d399' : '#fb7185';
          const top = Math.min(y0, y1);
          const height = Math.abs(y1 - y0);
          return <rect key={`mh-${i}`} x={x - candleW / 2} y={top} width={candleW} height={Math.max(height, 0.5)} fill={color} opacity={0.5} />;
        })}
        <path d={macdPath} stroke="#60a5fa" strokeWidth={1.1} fill="none" />
        <path d={signalPath} stroke="#f59e0b" strokeWidth={1.1} fill="none" />

        {xLabels.map((l, i) => (
          <text key={`xl-${i}`} x={l.x} y={GEOMETRY.height - 6} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">{l.label}</text>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />Up-Candle</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-rose-400" />Down-Candle</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 bg-amber-400" />EMA(50)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 bg-violet-400" />RSI</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 bg-blue-400" />MACD</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 bg-amber-500" />Signal</span>
      </div>
    </div>
  );
}
