'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { PersonaId } from '@/lib/agents/personas';

interface Change {
  firma: PersonaId;
  firmaName: string;
  kind: 'verdict_flip' | 'coin_change' | 'passed_jump' | 'passed_drop';
  description: string;
}

function detectChanges(log: FirmaDecision[]): Change[] {
  if (log.length < 4) return [];
  // Group by firma, find last two dates.
  const byFirma = new Map<PersonaId, FirmaDecision[]>();
  for (const e of log) {
    if (!byFirma.has(e.firma)) byFirma.set(e.firma, []);
    byFirma.get(e.firma)!.push(e);
  }
  const changes: Change[] = [];
  for (const [firma, entries] of byFirma.entries()) {
    if (entries.length < 2) continue;
    const today = entries[entries.length - 1];
    const yesterday = entries[entries.length - 2];
    const firmaName = today.firmaName;
    if (today.verdict !== yesterday.verdict) {
      changes.push({
        firma,
        firmaName,
        kind: 'verdict_flip',
        description: `${firmaName}: gestern ${yesterday.verdict === 'BUY' ? 'KAUFEN' : 'WARTEN'} → heute ${today.verdict === 'BUY' ? 'KAUFEN' : 'WARTEN'}.`
      });
    } else if (today.coin && yesterday.coin && today.coin !== yesterday.coin) {
      changes.push({
        firma,
        firmaName,
        kind: 'coin_change',
        description: `${firmaName}: Ziel-Coin gewechselt — gestern ${yesterday.coin}, heute ${today.coin}.`
      });
    } else if (today.passedCount !== null && yesterday.passedCount !== null) {
      const delta = today.passedCount - yesterday.passedCount;
      if (delta >= 2 && today.coin) {
        changes.push({
          firma, firmaName,
          kind: 'passed_jump',
          description: `${firmaName}: ${today.coin} ist seit gestern um ${delta} Häkchen besser geworden (jetzt ${today.passedCount} von 12).`
        });
      } else if (delta <= -2 && today.coin) {
        changes.push({
          firma, firmaName,
          kind: 'passed_drop',
          description: `${firmaName}: ${today.coin} hat ${Math.abs(delta)} Häkchen verloren (jetzt nur noch ${today.passedCount} von 12).`
        });
      }
    }
  }
  return changes;
}

function changeAccent(kind: Change['kind']): string {
  if (kind === 'passed_jump') return 'border-l-emerald-400/70';
  if (kind === 'passed_drop' || kind === 'verdict_flip') return 'border-l-amber-400/60';
  return 'border-l-sky-400/60';
}

export function DiffVsYesterday() {
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
  const changes = detectChanges(log);
  if (changes.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Was hat sich seit gestern geändert?</h2>
      <ul className="space-y-1.5">
        {changes.map((c, i) => (
          <li key={i} className={`border-l-2 ${changeAccent(c.kind)} pl-2.5 text-[12px] leading-snug text-slate-200`}>
            {c.description}
          </li>
        ))}
      </ul>
    </section>
  );
}
