'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, IntelSnapshot, computeIntelAccuracy, loadIntelLog } from '@/lib/intel/memory';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal, summariseTips } from '@/lib/sport/tip-journal';
import { computeFirmaAccuracy } from '@/lib/firma-accuracy';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</div>
    </div>
  );
}

export function AppPerformancePanel() {
  const [firmaLog, setFirmaLog] = useState<FirmaDecision[]>([]);
  const [intelLog, setIntelLog] = useState<IntelSnapshot[]>([]);
  const [sportLog, setSportLog] = useState<ReturnType<typeof loadTipJournal>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setFirmaLog(loadFirmaLog());
      setIntelLog(loadIntelLog());
      setSportLog(loadTipJournal());
    };
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
      window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;

  const priceMap = new Map<string, number>();
  for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
  const firmaAcc = computeFirmaAccuracy(firmaLog, (date) => priceMap.get(date) ?? null);
  const intelAcc = computeIntelAccuracy(intelLog);
  const sportStats = summariseTips(sportLog);

  const anyData = firmaAcc.some((a) => a.evaluated > 0) || intelAcc.evaluated > 0 || sportStats.total > 0;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dein lokaler Track-Record</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Alle Trefferquoten aus den lokalen Tagebüchern — Firmen-Tagebuch, Chefredakteur-Tagebuch, Sport-Tipps. Wächst über Tage und macht klar, ob die App in deiner Praxis hält, was die Backtests versprechen.
        </p>
      </div>

      {!anyData ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-center text-[11px] text-slate-500">
          Noch keine Daten. Die App über ein paar Tage öffnen, dann füllt sich das.
        </p>
      ) : (
        <div className="space-y-3">
          {firmaAcc.some((a) => a.evaluated > 0) && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Firmen-Trefferquote</div>
              <div className="grid grid-cols-3 gap-2">
                {firmaAcc.map((a) => (
                  <Stat
                    key={a.firma}
                    label={a.firmaName}
                    value={a.hitRatePct !== null ? `${a.hitRatePct}%` : '—'}
                    tone={a.hitRatePct !== null && a.hitRatePct >= 55 ? 'good' : a.hitRatePct !== null && a.hitRatePct < 45 ? 'bad' : 'neutral'}
                  />
                ))}
              </div>
            </div>
          )}
          {intelAcc.evaluated > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recherche-Chefredakteur</div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Auswertbar" value={String(intelAcc.evaluated)} />
                <Stat
                  label="Trefferquote"
                  value={intelAcc.hitRatePct !== null ? `${intelAcc.hitRatePct}%` : '—'}
                  tone={intelAcc.hitRatePct !== null && intelAcc.hitRatePct >= 55 ? 'good' : 'neutral'}
                />
              </div>
            </div>
          )}
          {sportStats.total > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sport-Tipps</div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Tipps" value={String(sportStats.total)} />
                <Stat label="Aufgelöst" value={String(sportStats.resolved)} />
                <Stat
                  label="Trefferquote"
                  value={sportStats.hitRatePct !== null ? `${sportStats.hitRatePct}%` : '—'}
                  tone={sportStats.hitRatePct !== null && sportStats.hitRatePct >= 50 ? 'good' : 'neutral'}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
