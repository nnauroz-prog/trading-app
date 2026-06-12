'use client';

// Mini-Inline-Form fuer den Endstand: zwei Number-Inputs + Speichern,
// schreibt in den manuellen Result-Store. Toggle "Endstand?"-Badge
// expandiert die Eingabe, Save schliesst sie wieder.

import { useState } from 'react';
import { setManualWmResult } from '@/lib/sport/wm-results-store';

interface Props {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
}

export function WmEndstandInputInline({ fixtureId, homeTeam, awayTeam }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');

  const handleSave = () => {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (!Number.isFinite(h) || !Number.isFinite(a) || h < 0 || a < 0) return;
    setManualWmResult(fixtureId, h, a);
    setExpanded(false);
    setHome('');
    setAway('');
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-amber-200 hover:border-amber-300"
        aria-label={`Endstand fuer ${homeTeam} gegen ${awayTeam} eintragen`}
      >Endstand?</button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-950/30 px-1 py-0.5">
      <input
        type="number"
        min={0}
        max={99}
        inputMode="numeric"
        value={home}
        onChange={(e) => setHome(e.target.value)}
        className="w-8 rounded border border-slate-700 bg-slate-950/70 px-0.5 text-center font-mono text-[11px] text-slate-100"
        aria-label={`Tore ${homeTeam}`}
        autoFocus
      />
      <span className="text-[10px] text-slate-400">:</span>
      <input
        type="number"
        min={0}
        max={99}
        inputMode="numeric"
        value={away}
        onChange={(e) => setAway(e.target.value)}
        className="w-8 rounded border border-slate-700 bg-slate-950/70 px-0.5 text-center font-mono text-[11px] text-slate-100"
        aria-label={`Tore ${awayTeam}`}
      />
      <button
        type="button"
        onClick={handleSave}
        className="rounded border border-emerald-400/60 bg-emerald-500/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-emerald-100 hover:border-emerald-300"
      >Speichern</button>
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="rounded border border-slate-700 bg-slate-900/60 px-1 py-0.5 text-[8.5px] uppercase tracking-wider text-slate-400 hover:text-slate-200"
        aria-label="Abbrechen"
      >×</button>
    </span>
  );
}
