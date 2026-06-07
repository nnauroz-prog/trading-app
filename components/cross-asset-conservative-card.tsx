// Cross-Asset-Synthese: was sagen die drei konservativen Vorstände heute?
// Die Krypto-„Konservativ"-Persona, die Aktien-„Konservativ" und die
// Rohstoff-„Konservativ". Wenn alle drei KAUFEN sagen → echter Maximum-Tag.

import Link from 'next/link';

export interface CrossAssetConservativeRow {
  klass: 'krypto' | 'aktien' | 'rohstoffe';
  label: string;
  emoji: string;
  verdict: 'KAUFEN' | 'BEOBACHTEN' | 'WARTEN' | 'BUY' | 'WAIT';
  target: { symbol: string; name: string } | null;
  href: string;
}

const VERDICT_TONE: Record<string, string> = {
  KAUFEN: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  BUY: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  BEOBACHTEN: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  WAIT: 'border-slate-700 bg-slate-900/40 text-slate-300',
  WARTEN: 'border-slate-700 bg-slate-900/40 text-slate-300'
};

export function CrossAssetConservativeCard({ rows }: { rows: CrossAssetConservativeRow[] }) {
  const buyCount = rows.filter((r) => r.verdict === 'KAUFEN' || r.verdict === 'BUY').length;
  const total = rows.length;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">🛡️ Konservative Vorstände — Cross-Asset</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Die strengsten Persönlichkeiten aus jedem Bereich. {buyCount} von {total} sagen heute KAUFEN.
          {' '}{buyCount === total ? 'Maximum-Konsens — sehr selten.' : buyCount === 0 ? 'Niemand kauft — abwarten ist die Position.' : 'Gemischt — keine Pauschal-Aktion.'}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {rows.map((r) => (
          <li key={r.klass}>
            <Link
              href={r.href}
              className={`flex h-full flex-col gap-1 rounded-xl border-2 p-3 transition hover:brightness-110 ${VERDICT_TONE[r.verdict] ?? 'border-slate-700 bg-slate-900/40 text-slate-300'}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-bold">
                  {r.emoji} {r.label}
                </span>
                <span className="rounded border border-current/40 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                  {r.verdict}
                </span>
              </div>
              {r.target ? (
                <div className="text-[11px]">
                  <span className="font-semibold">{r.target.name}</span>
                  <span className="ml-1 font-mono text-[9.5px] opacity-70">{r.target.symbol}</span>
                </div>
              ) : (
                <div className="text-[11px] italic opacity-80">Kein Target heute.</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
