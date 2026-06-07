// Heute-Seite-Karte: zeigt die klarste WM-Empfehlung der nächsten 14 Tage
// kompakt. Verlinkt zur Sport-Seite mit Detail.

import Link from 'next/link';
import { rankWmTips } from '@/lib/sport/wm-tip-ranking';
import { bestWmMarket } from '@/lib/sport/wm-best-market';

interface Props {
  todayIso: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function HomeWmProCard({ todayIso }: Props) {
  const days = daysBetween(todayIso, '2026-06-11');
  if (days > 30 || days < -50) return null;

  const ranked = rankWmTips(todayIso, 14);
  const clear = ranked.find((r) => r.prediction.pick.clarity !== 'open');
  if (!clear) return null;

  const market = bestWmMarket(clear.prediction);

  return (
    <Link
      href="/sport"
      className="block space-y-1.5 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950/30 to-slate-900/40 p-3 transition hover:border-emerald-400/60"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
          🎯 WM-Profi-Tipp des Tages
        </span>
        <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200">
          {clear.prediction.pick.confidencePct}%
        </span>
      </div>
      <p className="text-[12px] leading-snug text-emerald-50">
        <span className="font-bold">{clear.fixture.homeTeam}</span>
        <span className="mx-1 text-emerald-200/60">vs.</span>
        <span className="font-bold">{clear.fixture.awayTeam}</span>
      </p>
      <p className="text-[10.5px] leading-snug text-emerald-100/85">
        Empfehlung: <span className="font-semibold text-emerald-50">{market.market}</span>
        <span className="text-emerald-200/60"> · {Math.round(market.probability * 100)} %</span>
      </p>
      <div className="flex items-baseline justify-between gap-2 text-[9.5px] text-emerald-300/80">
        <span>{fmtDate(clear.fixture.date)}{clear.fixture.time ? ` · ${clear.fixture.time}` : ''} · {clear.fixture.phase}{clear.fixture.group ? ` ${clear.fixture.group}` : ''}</span>
        <span>zur WM-Sektion →</span>
      </div>
    </Link>
  );
}
