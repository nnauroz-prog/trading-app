'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { PersonaId } from '@/lib/agents/personas';

interface CoinRow {
  coin: string;
  totalMentions: number;
  perFirma: Record<PersonaId, { mentions: number; buys: number }>;
}

function aggregate(log: FirmaDecision[]): CoinRow[] {
  const rows = new Map<string, CoinRow>();
  for (const d of log) {
    if (!d.coin) continue;
    if (!rows.has(d.coin)) {
      rows.set(d.coin, {
        coin: d.coin, totalMentions: 0,
        perFirma: {
          conservative: { mentions: 0, buys: 0 },
          balanced: { mentions: 0, buys: 0 },
          aggressive: { mentions: 0, buys: 0 }
        }
      });
    }
    const r = rows.get(d.coin)!;
    r.totalMentions++;
    r.perFirma[d.firma].mentions++;
    if (d.verdict === 'BUY') r.perFirma[d.firma].buys++;
  }
  return Array.from(rows.values()).sort((a, b) => b.totalMentions - a.totalMentions);
}

function cellTone(mentions: number, buys: number): string {
  if (mentions === 0) return 'bg-slate-950';
  if (buys > 0 && buys / mentions >= 0.5) return 'bg-emerald-500/30 text-emerald-100';
  if (mentions >= 3) return 'bg-sky-500/20 text-sky-100';
  return 'bg-slate-800 text-slate-300';
}

export function FirmaCoinHeatmap() {
  const [log, setLog] = useState<FirmaDecision[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadFirmaLog());
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const rows = aggregate(log).slice(0, 12);
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Firma-Coin-Heatmap</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Welche Firma hat welchen Coin wie oft im Visier gehabt? Zahl = Erwähnungen insgesamt. Farbe = Anteil tatsächlicher Kauf-Verdikte (grün = Firma wollte oft kaufen, blau = oft erwähnt aber meist gewartet, dunkel = kaum erwähnt).
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-2 py-1.5 text-left">Coin</th>
              <th className="px-2 py-1.5 text-center">Konservativ</th>
              <th className="px-2 py-1.5 text-center">Balanciert</th>
              <th className="px-2 py-1.5 text-center">Aggressiv</th>
              <th className="px-2 py-1.5 text-right">Σ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.coin} className="border-b border-slate-900 last:border-b-0">
                <td className="px-2 py-1 font-mono font-bold text-white">{r.coin}</td>
                {(['conservative', 'balanced', 'aggressive'] as PersonaId[]).map((f) => {
                  const c = r.perFirma[f];
                  return (
                    <td key={f} className="px-1 py-0.5">
                      <div className={`mx-auto flex h-6 w-12 items-center justify-center rounded font-mono text-[10px] ${cellTone(c.mentions, c.buys)}`}>
                        {c.mentions > 0 ? (
                          <>
                            {c.mentions}
                            {c.buys > 0 && <span className="ml-1 text-[8px]">★{c.buys}</span>}
                          </>
                        ) : '—'}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right font-mono text-slate-300">{r.totalMentions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] italic text-slate-500">★ = davon wirklich gekauft. Spalten ohne Stern bedeuten: Coin im Visier, aber meist WARTEN.</p>
    </section>
  );
}
