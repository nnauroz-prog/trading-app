'use client';

import { useState } from 'react';
import type { RankedPrediction } from '@/lib/sport/quality-ranking';

interface Props {
  ranked: RankedPrediction[];
}

function fmtTime(date: string, time: string | null): string {
  if (!time) return '—';
  const d = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

// User wählt 2 Picks aus der Topliste und sieht sie nebeneinander.
// Hilft die Entscheidung „welcher der beiden lohnt sich" sichtbar zu machen.
export function QualityCompare({ ranked }: Props) {
  const top = ranked;
  const [leftId, setLeftId] = useState<string>(top[0]?.fixture.id ?? '');
  const [rightId, setRightId] = useState<string>(top[1]?.fixture.id ?? '');

  if (top.length < 2) return null;

  const left = top.find((r) => r.fixture.id === leftId) ?? top[0];
  const right = top.find((r) => r.fixture.id === rightId) ?? top[1];

  const Side = ({ side, current, onPick }: { side: 'links' | 'rechts'; current: RankedPrediction; onPick: (id: string) => void }) => (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{side}</span>
        <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-200">{current.quality.score}</span>
      </div>
      <select
        value={current.fixture.id}
        onChange={(e) => onPick(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
      >
        {top.map((r) => (
          <option key={r.fixture.id} value={r.fixture.id}>
            {r.fixture.homeTeam} – {r.fixture.awayTeam} · {r.quality.score}
          </option>
        ))}
      </select>
      <div className="text-[11px] text-slate-100">
        <div className="font-semibold">{current.fixture.homeTeam} – {current.fixture.awayTeam}</div>
        <div className="text-slate-500">{current.leagueName} · {fmtTime(current.fixture.date, current.fixture.time)}</div>
      </div>
      <dl className="grid grid-cols-2 gap-1.5 text-[10.5px]">
        <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
          <dt className="text-[9px] text-slate-500">Markt</dt>
          <dd className="font-semibold text-slate-100">{current.quality.recommendation.label}</dd>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
          <dt className="text-[9px] text-slate-500">Wahrscheinlichkeit</dt>
          <dd className="font-mono text-slate-100">{Math.round(current.quality.recommendation.probability * 100)} %</dd>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
          <dt className="text-[9px] text-slate-500">Datenlage</dt>
          <dd className="font-semibold text-slate-100">{current.fixture.probabilities?.dataQuality ?? '—'}</dd>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/60 p-1.5">
          <dt className="text-[9px] text-slate-500">Markt-Typ</dt>
          <dd className="font-semibold text-slate-100">{current.quality.recommendation.isStableMarket ? 'stabil' : 'eng'}</dd>
        </div>
      </dl>
    </div>
  );

  const diff = left.quality.score - right.quality.score;
  const winnerLabel = diff > 0 ? `Links führt um ${diff} Punkte`
    : diff < 0 ? `Rechts führt um ${-diff} Punkte`
    : 'Gleichstand';
  const winnerTone = diff > 0 ? 'text-emerald-300'
    : diff < 0 ? 'text-sky-300'
    : 'text-slate-300';

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100">
        ▸ Zwei Picks vergleichen
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-[10.5px] leading-snug text-slate-500">
          Wähle aus der heutigen Top-Liste zwei Begegnungen aus und sieh die Quality-Bestandteile nebeneinander.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Side side="links" current={left} onPick={setLeftId} />
          <Side side="rechts" current={right} onPick={setRightId} />
        </div>
        <p className={`text-center text-[12px] font-semibold ${winnerTone}`}>
          {winnerLabel}
        </p>
      </div>
    </details>
  );
}
