// Zeigt die Aktien aus dem Sicherheits-Scan, die alle 8 Kriterien (Grade A)
// erfüllen. Mit Link zur Detail-Seite, Grade-Badge und Score.

import Link from 'next/link';
import type { StockSafetyEntry } from '@/lib/market/stock-safety-scan';

export function SafeStockPicks({ entries, limit = 6 }: { entries: StockSafetyEntry[]; limit?: number }) {
  const gradeA = entries.filter((e) => e.assessment.grade === 'A');
  const fallbackTopB = entries
    .filter((e) => e.assessment.grade === 'B')
    .sort((a, b) => b.assessment.score - a.assessment.score)
    .slice(0, limit);

  const picks = gradeA.length > 0 ? gradeA.slice(0, limit) : fallbackTopB;
  if (picks.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">🛡️ Sichere Kauf-Kandidaten heute</h2>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Keine Aktie im Universum erfüllt aktuell alle 8 Sicherheits-Kriterien. Bewusst kein Vorschlag — Cash halten ist auch eine Position.
        </p>
      </section>
    );
  }

  const allA = gradeA.length > 0;
  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          🛡️ {allA ? 'Sichere Kauf-Kandidaten heute' : 'Beste Kandidaten heute (Grade B)'}
        </h2>
        <span className="text-[10px] text-emerald-200/70">
          {gradeA.length} Grade A · {entries.length} geprüft
        </span>
      </div>
      <p className="text-[10.5px] leading-snug text-emerald-100/70">
        8-Punkt-Sicherheits-Gate: Preis über MA50 &amp; MA200, MA-Stack gesund, RSI 30–70, 52W-Position 30–90&nbsp;%,
        Volumen lebt, 1-Monats-Performance ≥ −5 %. {allA ? 'Grade A heißt: alle Kriterien.' : 'Heute kein Grade A — Top-Grade-B als nächstbeste Option.'}
      </p>
      <ul className="space-y-1">
        {picks.map((p) => (
          <li key={p.symbol}>
            <Link
              href={`/aktien/${encodeURIComponent(p.symbol)}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11.5px] transition hover:brightness-110"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-100">{p.name}</span>
                <span className="block text-[9.5px] text-slate-500">{p.symbol} · {p.group}</span>
              </span>
              <span className="font-mono text-[10.5px] text-slate-300">
                {p.assessment.passedHard}/{p.assessment.totalHard}
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                p.assessment.grade === 'A' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                  : p.assessment.grade === 'B' ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                  : p.assessment.grade === 'C' ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                  : 'border-rose-500/50 bg-rose-500/15 text-rose-200'
              }`}>
                {p.assessment.grade} · {p.assessment.score}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
