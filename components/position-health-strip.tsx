'use client';

import { useEffect, useState } from 'react';
import { POSITIONS_CHANGED_EVENT, loadPositions } from '@/lib/positions';
import { Position } from '@/lib/types/positions';
import { SafetyAssessment } from '@/lib/analysis/safety-gate';

export interface CoinHealth {
  symbol: string;
  safety: SafetyAssessment;
  priceChangePct24h: number | null;
}

const TONE: Record<SafetyAssessment['grade'], { dot: string; label: string; text: string }> = {
  A: { dot: 'bg-emerald-400', label: 'Setup intakt', text: 'text-emerald-300' },
  B: { dot: 'bg-sky-400', label: 'fast intakt', text: 'text-sky-300' },
  C: { dot: 'bg-amber-400', label: 'Lage hat sich verschlechtert', text: 'text-amber-300' },
  D: { dot: 'bg-rose-400', label: 'Kauf-Bedingungen weg', text: 'text-rose-300' }
};

export function PositionHealthStrip({ healthByCoin }: { healthByCoin: Record<string, CoinHealth> }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setPositions(loadPositions());
    sync();
    setMounted(true);
    window.addEventListener(POSITIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(POSITIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;

  const cryptoOpen = positions.filter((p) => p.instrumentType === 'crypto' && p.status === 'open');
  if (cryptoOpen.length === 0) return null;

  const rows = cryptoOpen.map((p) => {
    const key = p.underlying.toLowerCase();
    const health = healthByCoin[key] ?? null;
    return { position: p, health };
  });

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4" aria-label="Positions-Gesundheits-Check">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gesundheits-Check für offene Krypto-Positionen</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Pro offener Position: gelten die Kauf-Bedingungen aktuell noch? Bei Grade C oder D den Stop besonders ernst nehmen — egal was du beim Kauf gedacht hast.
        </p>
      </div>
      <ul className="space-y-1.5">
        {rows.map(({ position, health }) => {
          if (!health) {
            return (
              <li key={position.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2 text-[11px]">
                <span className="font-mono font-bold text-white">{position.underlying}</span>
                <span className="text-[10px] text-slate-500">keine Live-Bewertung verfügbar</span>
              </li>
            );
          }
          const t = TONE[health.safety.grade];
          const missing = health.safety.criteria.filter((c) => !c.passed && c.id !== 'backtest-edge' && c.id !== 'rel-strength');
          const change = health.priceChangePct24h;
          return (
            <li
              key={position.id}
              className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2 text-[11px]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                  <span className="font-mono font-bold text-white">{position.underlying}</span>
                  <span className={`text-[10px] ${t.text}`}>{t.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {change !== null && (
                    <span className={`font-mono text-[10px] ${change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(1)}% (24h)
                    </span>
                  )}
                  <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${t.text} border-current/40`}>
                    Grade {health.safety.grade}
                  </span>
                </div>
              </div>
              {!health.safety.maxSafety && missing.length > 0 && (
                <p className="text-[10.5px] leading-snug text-slate-400">
                  Fehlt für sicheres Setup: {missing.slice(0, 3).map((c) => c.label).join(' · ')}
                  {missing.length > 3 && <span className="text-slate-600"> (+{missing.length - 3})</span>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2 text-[10px] leading-relaxed text-slate-500">
        Keine Empfehlung zum Verkaufen — das entscheidest du. Aber wenn die Bedingungen weg sind, ist der Stop deine wichtigste Regel.
      </p>
    </section>
  );
}
