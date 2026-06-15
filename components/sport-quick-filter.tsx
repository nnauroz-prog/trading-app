'use client';

import { useEffect, useState } from 'react';
import type { RankedPrediction } from '@/lib/sport/quality-ranking';

interface Props {
  ranked: RankedPrediction[];
  todayIso: string;
  tomorrowIso: string;
}

type Mode = 'heute' | 'morgen' | 'alle' | 'stark+';

function fmtTime(date: string, time: string | null): string {
  if (!time) return '—';
  const d = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

const STORAGE_KEY = 'trading-app.sport-quick-filter-v1';

// Schnellfilter-Buttons über der Topliste — Heute / Morgen / Alle / Stark+.
// Spart Scrollen und mehrfaches Reload.
export function SportQuickFilter({ ranked, todayIso, tomorrowIso }: Props) {
  const [mode, setMode] = useState<Mode>('heute');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'heute' || raw === 'morgen' || raw === 'alle' || raw === 'stark+') setMode(raw);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, mounted]);

  if (!mounted) return null;
  // Bug-Fix: bei komplett leerem Pool (Sommerpause) blendet sich der
  // Filter sauber aus, statt „0/0 Nichts passt" als pseudo-aktiv zu zeigen.
  if (ranked.length === 0) return null;

  const filtered =
    mode === 'heute' ? ranked.filter((r) => r.fixture.date === todayIso)
    : mode === 'morgen' ? ranked.filter((r) => r.fixture.date === tomorrowIso)
    : mode === 'stark+' ? ranked.filter((r) => r.quality.score >= 70)
    : ranked;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Schnellfilter</h2>
        <span className="text-[10px] text-slate-500">{filtered.length}/{ranked.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10.5px]">
        {(['heute', 'morgen', 'alle', 'stark+'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md border px-2 py-1 transition ${mode === m
              ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40'}`}
          >
            {m === 'heute' ? 'Heute' : m === 'morgen' ? 'Morgen' : m === 'alle' ? 'Alle' : 'Stark+ (≥70)'}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-700 bg-slate-950/40 p-2.5 text-[11px] leading-snug text-slate-400">
          Nichts passt — anderen Filter wählen.
        </p>
      ) : (
        <ul className="space-y-1">
          {filtered.map((rp) => (
            <li key={rp.fixture.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
              <span className="font-mono text-[10px] text-slate-500">{fmtDate(rp.fixture.date)} {fmtTime(rp.fixture.date, rp.fixture.time)}</span>
              <span className="min-w-0 truncate text-[11px] text-slate-100">
                <span className="font-semibold">{rp.fixture.homeTeam} – {rp.fixture.awayTeam}</span>
                <span className="text-slate-500"> · {rp.quality.recommendation.label}</span>
              </span>
              <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-200">{rp.quality.score}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
