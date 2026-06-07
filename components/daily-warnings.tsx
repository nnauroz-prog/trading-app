// Werte, die heute nicht angefasst werden sollten. Sachlich begründet pro Zeile.

import Link from 'next/link';
import type { WarningEntry } from '@/lib/daily/daily-decision-engine';

const SOURCE_EMOJI: Record<WarningEntry['source'], string> = {
  Aktien: '📈', Rohstoffe: '🛢️', Sport: '⚽', Krypto: '₿'
};

export function DailyWarnings({ warnings }: { warnings: WarningEntry[] }) {
  if (warnings.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">⚠️ Warnzone</h2>
        <p className="text-[11px] leading-snug text-slate-500">
          Kein Wert im klar negativen Bereich erkannt. Trotzdem gilt: nichts ohne Stop und ohne klares Setup.
        </p>
      </section>
    );
  }
  return (
    <section className="space-y-3 rounded-2xl border border-rose-400/40 bg-rose-950/15 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">⚠️ Warnzone — heute nicht anfassen</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-rose-100/70">
          Werte mit klaren Negativ-Signalen aus dem Sicherheits-Gate. Keine Empfehlung gegen sie zu wetten —
          nur eine Notiz, sie heute zu lassen.
        </p>
      </div>
      <ul className="space-y-1">
        {warnings.map((w, i) => (
          <li key={`${w.source}-${w.label}-${i}`}>
            {w.href ? (
              <Link href={w.href} className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-md border border-rose-400/30 bg-slate-950/40 px-2.5 py-1.5 text-[11px] transition hover:brightness-110">
                <Inner w={w} />
              </Link>
            ) : (
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-md border border-rose-400/30 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                <Inner w={w} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Inner({ w }: { w: WarningEntry }) {
  return (
    <>
      <span className="text-[14px] leading-none" aria-hidden>{SOURCE_EMOJI[w.source]}</span>
      <div className="min-w-0">
        <div className="truncate font-semibold text-slate-100">{w.label}{w.symbol && w.symbol !== w.label ? <span className="ml-1 font-mono text-[9.5px] text-slate-500">{w.symbol}</span> : null}</div>
        <div className="text-[10px] text-slate-400">{w.source} · {w.reason}</div>
      </div>
    </>
  );
}
