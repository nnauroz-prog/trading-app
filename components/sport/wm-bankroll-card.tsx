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
import { bestOddsFromDrafts } from '@/lib/sport/wm-best-odds';
import { evaluateStakeWindow } from '@/lib/sport/wm-stake-window';
import { adjustStake, labelForMode, STAKE_MODES, type WmStakeMode } from '@/lib/sport/wm-stake-adjust';
import { computeWmDayCapStatus } from '@/lib/sport/wm-day-cap';
import { loadStakeRecords } from '@/lib/sport/wm-bankroll-ledger-store';
import {
  loadAllQuotes,
  WM_ODDS_COMPARE_CHANGED_EVENT
} from '@/lib/sport/wm-odds-compare-store';

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
  // Pro Pick: aktiver Stake-Mode (Default standard).
  const [stakeModes, setStakeModes] = useState<Record<string, WmStakeMode>>({});
  // Tick fuer Re-Render nach Ledger-Schreiben (isStaked-Refresh).
  const [ledgerTick, setLedgerTick] = useState(0);
  // Minuten-Tick fuer das Stake-Fenster (Anstoss-Sperre).
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const initial = loadBankroll();
    setBankroll(initial);
    if (initial !== null) setDraft(String(initial));
    setMounted(true);
    const sync = () => setLedgerTick((t) => t + 1);
    const minuteId = setInterval(() => setNow(new Date()), 60_000);
    window.addEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, sync);
    window.addEventListener(WM_ODDS_COMPARE_CHANGED_EVENT, sync);
    return () => {
      clearInterval(minuteId);
      window.removeEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, sync);
      window.removeEventListener(WM_ODDS_COMPARE_CHANGED_EVENT, sync);
    };
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
  const totalStake = suggestions.reduce((sum, x, i) => {
    const p = picks[i];
    const pickId = `${p.fixture.id}-${p.winnerSide}`;
    const adj = adjustStake(x.stakePct, x.stakeEur, p.tier, stakeModes[pickId] ?? 'standard');
    return sum + (adj.stakeEur ?? 0);
  }, 0);

  const todayIsoBerlin = mounted
    ? new Date(now.getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
    : '';
  const stakesSnapshot = useMemo(() => {
    void ledgerTick;
    return mounted ? loadStakeRecords() : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, ledgerTick]);
  const dayCap = computeWmDayCapStatus(stakesSnapshot, todayIsoBerlin, bankroll);

  if (!mounted || picks.length === 0) return null;

  return (
    <section id="wm-bankroll" className="space-y-2 rounded-2xl border border-sky-400/30 bg-sky-950/15 p-3" aria-label="Bankroll-Empfehlung">
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

      {bankroll !== null && dayCap.capEur !== null && (
        <div className={`flex flex-wrap items-baseline gap-2 rounded border px-2 py-1 text-[10.5px] ${dayCap.usedTodayEur > dayCap.capEur ? 'border-rose-500/60 bg-rose-950/30 text-rose-100' : dayCap.usedTodayEur > dayCap.capEur * 0.75 ? 'border-amber-500/40 bg-amber-950/20 text-amber-100' : 'border-slate-800 bg-slate-950/40 text-slate-300'}`}>
          <span className="text-[9.5px] uppercase tracking-wider opacity-80">Tagesdeckel {dayCap.capPct} %</span>
          <span className="font-mono">{dayCap.usedTodayEur.toFixed(2)} / {dayCap.capEur.toFixed(2)} EUR</span>
          <span className="font-mono opacity-80">noch frei: {dayCap.remainingEur !== null ? `${dayCap.remainingEur.toFixed(2)} EUR` : '—'}</span>
          {dayCap.usedTodayEur > dayCap.capEur && (
            <span className="font-bold uppercase tracking-wider">Tagesdeckel ueberschritten</span>
          )}
        </div>
      )}

      <ul className="space-y-1">
        {suggestions.map((s, i) => {
          const p = picks[i];
          const pickId = `${p.fixture.id}-${p.winnerSide}`;
          const staked = mounted && isStaked(pickId);
          const oddsValue = oddsDrafts[pickId] ?? '2.00';
          const bestCompared = mounted ? bestOddsFromDrafts(loadAllQuotes()[pickId]?.drafts) : null;
          const stakeWindow = evaluateStakeWindow(p.fixture.date, p.fixture.time, now);
          const showBestButton = !staked && stakeWindow.open && bestCompared !== null && Math.abs(bestCompared - oddsFor(pickId)) > 0.001;
          const mode: WmStakeMode = stakeModes[pickId] ?? 'standard';
          const adjusted = adjustStake(s.stakePct, s.stakeEur, p.tier, mode);
          const capCheck = computeWmDayCapStatus(stakesSnapshot, todayIsoBerlin, bankroll, adjusted.stakeEur ?? 0);
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
                <span className="font-mono font-bold text-emerald-300">{adjusted.stakePct.toFixed(2)} %</span>
                {adjusted.stakeEur !== null && <span className="font-mono text-slate-200">≈ {adjusted.stakeEur.toFixed(2)} EUR</span>}
                {adjusted.cappedByTier && <span className="rounded border border-amber-500/40 bg-amber-950/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-200">tier-cap</span>}
                {mode !== 'standard' && (
                  <span className="rounded border border-sky-400/40 bg-sky-950/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-200">{labelForMode(mode)}</span>
                )}
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
                  {showBestButton && (
                    <button
                      type="button"
                      onClick={() => setOddsDrafts((d) => ({ ...d, [pickId]: bestCompared!.toFixed(2) }))}
                      className="rounded border border-emerald-500/40 bg-emerald-950/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-200 hover:border-emerald-400"
                      title={`Beste Quote aus dem Quoten-Vergleich uebernehmen (${bestCompared!.toFixed(2)})`}
                    >beste: {bestCompared!.toFixed(2)}</button>
                  )}
                </span>
                {staked ? (
                  <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">im Ledger ✓</span>
                ) : !stakeWindow.open ? (
                  <span
                    className="rounded border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400"
                    title={stakeWindow.reason ?? undefined}
                  >gesperrt — Anstoss vorbei</span>
                ) : capCheck.wouldExceedCap ? (
                  <span
                    className="rounded border border-rose-500/60 bg-rose-950/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-100"
                    title={`Tagesdeckel ${dayCap.capPct} % der Bankroll wuerde mit diesem Stake ueberschritten.`}
                  >gesperrt — Tagesdeckel</span>
                ) : (
                  <button
                    type="button"
                    className="rounded border border-sky-500/40 bg-sky-950/30 px-2 py-0.5 text-[9.5px] uppercase tracking-wider text-sky-200 hover:border-sky-400 disabled:opacity-40"
                    disabled={adjusted.stakeEur === null || adjusted.stakeEur <= 0}
                    onClick={() => {
                      if (adjusted.stakeEur === null || adjusted.stakeEur <= 0) return;
                      if (!evaluateStakeWindow(p.fixture.date, p.fixture.time, new Date()).open) return;
                      const liveCap = computeWmDayCapStatus(loadStakeRecords(), todayIsoBerlin, bankroll, adjusted.stakeEur);
                      if (liveCap.wouldExceedCap) return;
                      recordStake({
                        id: pickId,
                        fixtureId: p.fixture.id,
                        winnerSide: p.winnerSide,
                        winnerTeam: p.winnerTeam,
                        opponentTeam: p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam,
                        dateIso: p.fixture.date,
                        stakePct: adjusted.stakePct,
                        stakeEur: adjusted.stakeEur,
                        decimalOdds: oddsFor(pickId),
                        modelProbabilityPct: p.modelProbabilityPct,
                        tier: p.tier
                      });
                    }}
                  >Stake uebernehmen</button>
                )}
              </div>
              {!staked && stakeWindow.open && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Anpassung:</span>
                  {STAKE_MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setStakeModes((prev) => ({ ...prev, [pickId]: m }))}
                      className={`rounded border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider ${mode === m ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'}`}
                      title={`Stake-Empfehlung mal ${({ minus50: 0.5, minus25: 0.75, standard: 1.0, plus25: 1.25, plus50: 1.5 })[m]}`}
                    >{labelForMode(m)}</button>
                  ))}
                </div>
              )}
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
