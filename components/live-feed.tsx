import Link from 'next/link';
import { FeedEvent } from '@/lib/analysis/event-feed';

const ICON_BY_KIND: Record<FeedEvent['kind'], string> = {
  volume_spike: '🔊',
  rsi_oversold: '↘',
  rsi_overbought: '↗',
  macd_cross: '⚡',
  macd_approaching: '◐',
  breakout_up: '▲',
  breakdown: '▼',
  higher_lows: '↗',
  top_mover: '★'
};

const COLOR_BY_SEVERITY: Record<FeedEvent['severity'], string> = {
  alert: 'border-emerald-500/30 bg-emerald-950/20',
  note: 'border-amber-500/20 bg-amber-950/10',
  info: 'border-slate-800 bg-slate-950/40'
};

const TITLE_COLOR_BY_SEVERITY: Record<FeedEvent['severity'], string> = {
  alert: 'text-emerald-200',
  note: 'text-amber-200',
  info: 'text-slate-200'
};

export function LiveFeed({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Feed</h3>
        <p className="mt-2 text-sm text-slate-500">Aktuell keine bemerkenswerten Events. Engine scant alle 30s.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live Feed
        </h3>
        <span className="font-mono text-[10px] text-slate-600">{new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })}</span>
      </div>
      <ul className="space-y-2">
        {events.map((e) => (
          <li
            key={e.id}
            className={`rounded-lg border p-3 transition hover:border-slate-700 ${COLOR_BY_SEVERITY[e.severity]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg leading-none">{ICON_BY_KIND[e.kind]}</div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/assets/${e.symbol.toLowerCase()}`}
                    className={`text-sm font-semibold hover:underline ${TITLE_COLOR_BY_SEVERITY[e.severity]}`}
                  >
                    {e.title}
                  </Link>
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-slate-400">{e.detail}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
