'use client';

// Kompakte Status-Pille fuer die Home. Zeigt sich nur, wenn der
// Daten-Integritaets-Agent gerade Picks blockiert oder Warnungen
// hat. Bei sauberer Datenbasis: unsichtbar.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { evaluateIntegrityAction, type IntegrityAction } from '@/lib/sport/wm-data-integrity-action';

interface Props {
  initial: IntegrityAction;
  // Server-seitig ermittelte Reconciler-Mismatches (externe Quelle
  // widerspricht interner Paarung). Zaehlen als zusaetzliche Blocks.
  reconcilerMismatches?: number;
}

const REFRESH_MS = 30_000;

export function WmIntegrityPill({ initial, reconcilerMismatches = 0 }: Props) {
  const [action, setAction] = useState<IntegrityAction>(initial);

  useEffect(() => {
    const tick = () => setAction(evaluateIntegrityAction());
    const id = setInterval(tick, REFRESH_MS);
    tick();
    return () => clearInterval(id);
  }, []);

  const blocked = action.issues.filter((i) => i.severity === 'BLOCKIERT').length + reconcilerMismatches;
  const warnings = action.issues.filter((i) => i.severity === 'WARNUNG').length;
  if (blocked === 0 && warnings === 0) return null;

  const cls = blocked > 0
    ? 'border-rose-500/60 bg-rose-950/30 text-rose-100'
    : 'border-amber-500/40 bg-amber-950/20 text-amber-100';

  return (
    <Link
      href="/sport"
      className={`flex items-center gap-2 rounded-2xl border-2 p-2 text-[11px] hover:opacity-90 ${cls}`}
      aria-label="WM Datenintegritaet — zu Details"
    >
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      <span className="font-semibold">Daten-Integritaets-Agent live:</span>
      {blocked > 0 && <span className="font-mono">{blocked} BLOCKIERT</span>}
      {reconcilerMismatches > 0 && <span className="font-mono">davon {reconcilerMismatches} Quellen-Konflikt</span>}
      {warnings > 0 && <span className="font-mono">{warnings} WARNUNG</span>}
      {action.activeBlocks > 0 && <span className="font-mono">{action.activeBlocks} Veto aktiv</span>}
      <span className="ml-auto text-[10px] opacity-70">→ /sport</span>
    </Link>
  );
}
