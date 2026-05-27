import { Candle } from '@/lib/types/domain';

export function Sparkline({
  candles,
  width = 120,
  height = 32,
  showFill = true
}: {
  candles: Candle[];
  width?: number;
  height?: number;
  showFill?: boolean;
}) {
  if (candles.length < 2) {
    return <div style={{ width, height }} className="rounded-md bg-slate-900/40" />;
  }

  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const step = width / (closes.length - 1);

  const points = closes.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = closes[0];
  const last = closes[closes.length - 1];
  const isUp = last >= first;
  const lineColor = isUp ? '#34d399' : '#fb7185';
  const fillColor = isUp ? 'rgba(52, 211, 153, 0.18)' : 'rgba(251, 113, 133, 0.18)';
  const gradId = `sparkline-grad-${isUp ? 'u' : 'd'}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {showFill && (
        <polygon
          points={`0,${height} ${points.join(' ')} ${width},${height}`}
          fill={`url(#${gradId})`}
          stroke="none"
        />
      )}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={(closes.length - 1) * step} cy={height - ((last - min) / range) * (height - 4) - 2} r={2} fill={lineColor} />
    </svg>
  );
}
