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

// Plausibles Fussball-Maximum — realistisch sind 9-10, mehr signalisiert
// Tippfehler oder Manipulation. 30 ist konservativ als historisches
// Worst-Case angesetzt (z.B. 31:0 fuer Australien vs Amerikanisch-Samoa).
const MAX_GOALS = 30;

function parseGoalsStrict(raw: string): number | null {
  // parseInt akzeptiert "0e10" und Leerzeichen-Praefix — wir wollen
  // ausschliesslich ein nicht-negatives Integer ohne Tricks.
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > MAX_GOALS) return null;
  return n;
}

export function WmEndstandInputInline({ fixtureId, homeTeam, awayTeam }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const h = parseGoalsStrict(home);
    const a = parseGoalsStrict(away);
    if (h === null || a === null) {
      setError(`Tore muessen ganze Zahlen zwischen 0 und ${MAX_GOALS} sein.`);
      return;
    }
    setError(null);
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

  const invalid = error !== null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 rounded border border-amber-500/40 bg-amber-950/30 px-1 py-0.5">
      <input
        type="number"
        min={0}
        max={MAX_GOALS}
        inputMode="numeric"
        value={home}
        onChange={(e) => { setHome(e.target.value); setError(null); }}
        className="w-10 rounded border border-slate-700 bg-slate-950/70 px-1 py-0.5 text-center font-mono text-[12px] text-slate-100"
        aria-label={`Tore ${homeTeam}`}
        aria-invalid={invalid}
        autoFocus
      />
      <span className="text-[10px] text-slate-400">:</span>
      <input
        type="number"
        min={0}
        max={MAX_GOALS}
        inputMode="numeric"
        value={away}
        onChange={(e) => { setAway(e.target.value); setError(null); }}
        className="w-10 rounded border border-slate-700 bg-slate-950/70 px-1 py-0.5 text-center font-mono text-[12px] text-slate-100"
        aria-label={`Tore ${awayTeam}`}
        aria-invalid={invalid}
      />
      <button
        type="button"
        onClick={handleSave}
        className="min-h-[28px] rounded border border-emerald-400/60 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100 hover:border-emerald-300"
      >Speichern</button>
      <button
        type="button"
        onClick={() => { setExpanded(false); setError(null); }}
        className="min-h-[28px] min-w-[28px] rounded border border-slate-700 bg-slate-900/60 px-1.5 py-1 text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-200"
        aria-label="Abbrechen"
      >×</button>
      {error && (
        <span role="alert" className="ml-1 text-[10px] text-rose-300">
          {error}
        </span>
      )}
    </span>
  );
}
