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
import {
  isStaked,
  recordStake,
  WM_BANKROLL_LEDGER_CHANGED_EVENT
} from '@/lib/sport/wm-bankroll-ledger-store';
import { evaluateWmValue } from '@/lib/sport/wm-value-check';

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
  // Pro Pick: vom User angepasste Quote (Default 2.00).
  const [oddsDrafts, setOddsDrafts] = useState<Record<string, string>>({});
  // Tick fuer Re-Render nach Ledger-Schreiben (isStaked-Refresh).
  const [ledgerTick, setLedgerTick] = useState(0);

  useEffect(() => {
    const initial = loadBankroll();
    setBankroll(initial);
    if (initial !== null) setDraft(String(initial));
    setMounted(true);
    const sync = () => setLedgerTick((t) => t + 1);
    window.addEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, sync);
  }, []);

  const oddsFor = (pickId: string): number => {
    const raw = oddsDrafts[pickId];
    const n = raw === undefined ? NaN : parseFloat(raw.replace(',', '.'));
    return Number.isFinite(n) && n > 1 ? n : 2.0;
  };

  const suggestions = useMemo(() => {
    void ledgerTick;
    return picks.map((p) => suggestBankroll({
      pick: p,
      bankrollEur: bankroll,
      decimalOdds: oddsFor(`${p.fixture.id}-${p.winnerSide}`)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, bankroll, oddsDrafts, ledgerTick]);
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
          const pickId = `${p.fixture.id}-${p.winnerSide}`;
          const staked = mounted && isStaked(pickId);
          const oddsValue = oddsDrafts[pickId] ?? '2.00';
          const value = evaluateWmValue(p.modelProbabilityPct, oddsFor(pickId));
          const valueTone =
            value.verdict === 'value' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' :
            value.verdict === 'unter-quote' ? 'border-rose-400/60 bg-rose-500/15 text-rose-200' :
            value.verdict === 'fair' ? 'border-slate-700 bg-slate-900/40 text-slate-300' :
            'border-amber-400/40 bg-amber-500/10 text-amber-200';
          const valueShort =
            value.verdict === 'value' && value.edgePct !== null ? `Edge +${value.edgePct.toFixed(1)} %` :
            value.verdict === 'unter-quote' && value.edgePct !== null ? `Edge ${value.edgePct.toFixed(1)} %` :
            value.verdict === 'fair' ? 'fair' : 'ungueltig';
          return (
            <li key={s.pickId} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-[10.5px]">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-100">{p.winnerTeam}</span>
                <span className="text-slate-500">gegen</span>
                <span className="text-slate-300">{p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-400">{p.modelProbabilityPct} %</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                <span className="font-mono font-bold text-emerald-300">{s.stakePct.toFixed(2)} %</span>
                {s.stakeEur !== null && <span className="font-mono text-slate-200">≈ {s.stakeEur.toFixed(2)} EUR</span>}
                {s.cappedByTier && <span className="rounded border border-amber-500/40 bg-amber-950/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-200">tier-cap</span>}
                <span className="ml-auto inline-flex items-center gap-1">
                  <span className="text-slate-500">Quote</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={oddsValue}
                    onChange={(e) => setOddsDrafts((d) => ({ ...d, [pickId]: e.target.value }))}
                    className="w-14 rounded border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-center text-[11px] text-slate-100"
                    aria-label={`Buchmacher-Quote fuer ${p.winnerTeam}`}
                    disabled={staked}
                  />
                </span>
                {staked ? (
                  <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">im Ledger ✓</span>
                ) : (
                  <button
                    type="button"
                    className="rounded border border-sky-500/40 bg-sky-950/30 px-2 py-0.5 text-[9.5px] uppercase tracking-wider text-sky-200 hover:border-sky-400 disabled:opacity-40"
                    disabled={s.stakeEur === null || s.stakeEur <= 0}
                    onClick={() => {
                      if (s.stakeEur === null || s.stakeEur <= 0) return;
                      recordStake({
                        id: pickId,
                        fixtureId: p.fixture.id,
                        winnerSide: p.winnerSide,
                        winnerTeam: p.winnerTeam,
                        opponentTeam: p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam,
                        dateIso: p.fixture.date,
                        stakePct: s.stakePct,
                        stakeEur: s.stakeEur,
                        decimalOdds: oddsFor(pickId),
                        modelProbabilityPct: p.modelProbabilityPct,
                        tier: p.tier
                      });
                    }}
                  >Stake uebernehmen</button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-2 text-[10px]">
                <span className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${valueTone}`} title={value.hint}>{valueShort}</span>
                {value.fairOdds !== null && (
                  <span className="font-mono text-[9.5px] text-slate-500">faire Quote {value.fairOdds.toFixed(2)}</span>
                )}
              </div>
              <p className="mt-0.5 text-[9.5px] text-slate-500 truncate">{s.reason}</p>
            </li>
          );
        })}
      </ul>

      <p className="text-[9.5px] leading-snug text-slate-500">
        Quote pro Pick anpassbar (Default 2.00) — die Half-Kelly-Empfehlung rechnet live mit Deiner Quote. &bdquo;Stake uebernehmen&ldquo; schreibt den Einsatz ins virtuelle Ledger; das P&amp;L ergibt sich automatisch aus den Spielergebnissen. Bankroll noetig fuer EUR-Betraege. Tier-Caps schuetzen vor Einzel-Pick-Risiko. Modell-Tendenzen, keine Ergebnis-Zusage.
      </p>
    </section>
  );
}
