'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RankedPrediction } from '@/lib/sport/quality-ranking';

interface Props {
  ranked: RankedPrediction[];
}

const STORAGE_KEY = 'trading-app.sport-quality-min-v1';

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

// User stellt eine Mindest-Score-Schwelle ein; nur Prognosen ≥ Schwelle
// werden gezeigt. Wert bleibt in localStorage erhalten.
export function QualityScoreFilter({ ranked }: Props) {
  const [minScore, setMinScore] = useState<number>(55);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const num = parseInt(raw, 10);
      if (Number.isFinite(num) && num >= 0 && num <= 100) setMinScore(num);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, String(minScore));
  }, [minScore, mounted]);

  const filtered = useMemo(() => ranked.filter((r) => r.quality.score >= minScore), [ranked, minScore]);

  if (!mounted) return null;
  // Bug-Fix: bei leerem Pool blendet sich der Schwellen-Regler aus statt
  // „Kein Spiel schafft heute ≥ X/100" als sinnlosen Hinweis zu zeigen.
  if (ranked.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Schwelle setzen — was ist dir gut genug?</h2>
        <span className="text-[10px] text-slate-500">{filtered.length}/{ranked.length} Spiele</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Bewege den Regler. Bei 0 siehst du alles, bei 70 nur „starke“ oder besser, bei 85 nur „sehr starke“ Prognosen. Wenig durchgelassen = bewusste Strenge.
      </p>
      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minScore}
          onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-400"
          aria-label="Mindest-Quality-Score"
          aria-valuenow={minScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${minScore} von 100, ${filtered.length} von ${ranked.length} Spielen ≥ Schwelle`}
        />
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>0</span>
          <span className="text-emerald-300">min: {minScore}/100</span>
          <span>100</span>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-500/30 bg-amber-950/15 p-3 text-[11px] leading-snug text-amber-100/80">
          Kein Spiel schafft heute ≥ {minScore}/100. Schwelle senken oder nichts tippen — Geduld ist ein gültiger Tipp.
        </p>
      ) : (
        <ul className="space-y-1">
          {filtered.slice(0, 10).map((rp) => {
            const { fixture, leagueName, quality } = rp;
            return (
              <li key={fixture.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
                <span className="font-mono text-[10px] text-slate-500">{fmtDate(fixture.date)} {fmtTime(fixture.date, fixture.time)}</span>
                <span className="min-w-0 truncate text-[11.5px] text-slate-100">
                  <span className="font-semibold">{fixture.homeTeam} – {fixture.awayTeam}</span>
                  <span className="text-slate-500"> · {leagueName} · {quality.recommendation.label}</span>
                </span>
                <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-200">{quality.score}</span>
              </li>
            );
          })}
        </ul>
      )}
      {filtered.length > 10 && (
        <p className="text-[10px] text-slate-500">Es gibt noch {filtered.length - 10} weitere ≥ {minScore} — feinere Schwelle setzen.</p>
      )}
    </section>
  );
}
