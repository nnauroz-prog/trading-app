// Top-5-Tageschancen Cards. Ein Card pro Asset-Klasse, klar zur Detail-Seite verlinkt.

import Link from 'next/link';
import type { TopChance } from '@/lib/daily/daily-decision-engine';

const SOURCE_EMOJI: Record<TopChance['source'], string> = {
  Krypto: '₿', Aktien: '📈', Rohstoffe: '🛢️', Sport: '⚽', Watchlist: '⭐'
};

const VERDICT_TONE: Record<string, string> = {
  KAUFEN:    'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  TIPPEN:    'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  BEOBACHTEN:'border-amber-400/40 bg-amber-500/10 text-amber-100',
  WARTEN:    'border-slate-700 bg-slate-900/40 text-slate-300',
  WAIT:      'border-slate-700 bg-slate-900/40 text-slate-300'
};

export function DailyTopChances({ chances }: { chances: TopChance[] }) {
  if (chances.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">🎯 Top-Chancen heute</h2>
        <p className="text-[11px] leading-snug text-slate-500">
          Heute keine konkreten Tageschancen — kein Asset im Grade A/B, kein Sport-Tipp ≥70 %.
          Beobachten oder Cash halten ist die richtige Reaktion.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🎯 Top-{chances.length} Tageschancen</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-emerald-100/70">
          Pro Asset-Klasse das beste Setup heute — sortiert nach Score / Wahrscheinlichkeit. Modell-Hinweise, keine Garantien.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {chances.map((c) => (
          <li key={`${c.source}-${c.label}`}>
            <Link
              href={c.href}
              className={`flex h-full flex-col gap-1.5 rounded-xl border-2 p-3 transition hover:brightness-110 ${VERDICT_TONE[c.verdict] ?? 'border-slate-700 bg-slate-900/40 text-slate-300'}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {SOURCE_EMOJI[c.source]} {c.source}
                </span>
                <span className="rounded border border-current/40 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                  {c.verdict}
                </span>
              </div>
              <div className="text-[13px] font-bold leading-tight">{c.label}</div>
              <div className="text-[10.5px] opacity-80">{c.detail}</div>
              <div className="text-[10.5px] leading-snug opacity-90">{c.rationale}</div>
              {c.score !== null && (
                <div className="mt-0.5 font-mono text-[10px] opacity-80">Score: {c.score}</div>
              )}
              <div className="mt-0.5 text-[9.5px] opacity-60">
                Risiko-Hinweis: Stop setzen, max. 1–2 % vom Konto pro Idee.
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
