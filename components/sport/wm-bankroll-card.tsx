'use client';

// Bankroll-Empfehlung pro WM-Pick. Half-Kelly mit Tier-Cap.
// Versteckt sich, wenn keine Picks vorhanden sind oder der User noch
// keine Bankroll definiert hat (er wird zur Eingabe aufgefordert).
//
// localStorage: trading-app.wm-bankroll-eur-v1 (number).
// Wording streng ohne verbotene Begriffe.

import { useEffect, useMemo, useState } from 'react';
import { suggestBankroll } from '@/lib/sport/wm-bankroll';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

const STORAGE_KEY = 'trading-app.wm-bankroll-eur-v1';

interface Props {
  picks: WmWinnerPick[];
}

function loadBankroll(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function saveBankroll(eur: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(eur));
}

export function WmBankrollCard({ picks }: Props) {
  const [bankroll, setBankroll] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = loadBankroll();
    setBankroll(initial);
    if (initial !== null) setDraft(String(initial));
    setMounted(true);
  }, []);

  const suggestions = useMemo(() => picks.map((p) => suggestBankroll({ pick: p, bankrollEur: bankroll })), [picks, bankroll]);
  const totalStake = suggestions.reduce((s, x) => s + (x.stakeEur ?? 0), 0);

  if (!mounted || picks.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-sky-400/30 bg-sky-950/15 p-3" aria-label="Bankroll-Empfehlung">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Bankroll-Empfehlung · Half-Kelly</h3>
        <span className="text-[10px] text-sky-200/70">Tier-Cap 4 % / 2 %</span>
      </div>

      <div className="flex flex-wrap items-baseline gap-2 rounded border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
        <span className="text-slate-300">Deine Bankroll:</span>
        <input
          type="number"
          min={0}
          step={10}
          inputMode="numeric"
          placeholder="z.B. 500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-24 rounded border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-center text-[12px] text-slate-100"
          aria-label="Bankroll in Euro"
        />
        <span className="text-slate-500">EUR</span>
        <button
          type="button"
          className="rounded border border-emerald-500/40 bg-emerald-950/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200 hover:border-emerald-400"
          onClick={() => {
            const n = parseFloat(draft);
            if (Number.isFinite(n) && n > 0) { saveBankroll(n); setBankroll(n); }
          }}
        >Setzen</button>
        {bankroll !== null && (
          <span className="ml-auto font-mono text-slate-300">
            Gesamt-Stake heute: {totalStake.toFixed(2)} EUR ({(totalStake / bankroll * 100).toFixed(1)} %)
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {suggestions.map((s, i) => {
          const p = picks[i];
          return (
            <li key={s.pickId} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-[10.5px]">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-100">{p.winnerTeam}</span>
                <span className="text-slate-500">gegen</span>
                <span className="text-slate-300">{p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-400">{p.modelProbabilityPct} % bei Quote {s.decimalOdds.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-2 text-[10px]">
                <span className="font-mono font-bold text-emerald-300">{s.stakePct.toFixed(2)} %</span>
                {s.stakeEur !== null && <span className="font-mono text-slate-200">≈ {s.stakeEur.toFixed(2)} EUR</span>}
                {s.cappedByTier && <span className="rounded border border-amber-500/40 bg-amber-950/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-200">tier-cap</span>}
                <span className="ml-auto text-[9.5px] text-slate-500 truncate">{s.reason}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[9.5px] leading-snug text-slate-500">
        Default-Quote 2.00 (Sieger-Tipp). Wenn Deine Buchmacher-Quote davon abweicht, ist die Empfehlung entsprechend anders. Tier-Caps schuetzen die Bankroll vor Einzel-Pick-Risiko. Modell-Tendenzen, keine Ergebnis-Zusage.
      </p>
    </section>
  );
}
