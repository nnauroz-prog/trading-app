import { deriveModifierTrust, type ModifierBacktestResult } from '@/lib/sport/modifier-backtest';

interface Props {
  result: ModifierBacktestResult;
  leagueName: string;
}

function liftTone(pct: number): string {
  if (pct >= 1) return 'text-emerald-300';
  if (pct >= 0) return 'text-slate-200';
  if (pct >= -1) return 'text-amber-300';
  return 'text-rose-300';
}

function liftLabel(pct: number): string {
  if (pct >= 2) return 'klar besser';
  if (pct >= 0.5) return 'leicht besser';
  if (pct >= -0.5) return 'neutral';
  if (pct >= -2) return 'leicht schlechter';
  return 'deutlich schlechter';
}

// Zeigt das Backtest-Ergebnis pro Liga: Lift der Modifier (H2H + Schiri)
// gegenueber dem Roh-Modell. Ehrlicher Self-Check — wenn negativ, sollte
// der entsprechende Modifier ueberdacht werden.
export function ModifierBacktestCard({ result, leagueName }: Props) {
  if (result.matchesEvaluated === 0) {
    return (
      <details className="rounded-md border border-slate-800 bg-slate-950/40 text-[11px]">
        <summary className="cursor-pointer p-2 font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
          🔬 {leagueName} · Modifier-Backtest (zu wenig Daten)
        </summary>
        <p className="p-2 pt-0 text-[10.5px] leading-snug text-slate-400">
          Pool zu klein, mindestens 30 Pre-Match-Spiele plus 20 zum Auswerten noetig.
        </p>
      </details>
    );
  }
  return (
    <details className="rounded-md border border-slate-800 bg-slate-950/40 text-[11px]">
      <summary className="cursor-pointer p-2 font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100">
        🔬 {leagueName} · Modifier-Backtest auf {result.matchesEvaluated} Spielen
      </summary>
      <div className="space-y-2 p-2 pt-0">
        <p className="text-[10.5px] leading-snug text-slate-400">
          Walk-Forward: jeder Match wird mit dem Modell vorhergesagt, das NUR die VORHER liegenden Pool-Spiele kennt — einmal roh, einmal mit Modifier. Brier-Score: niedriger = besser.
        </p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <Stat label="Roh" value={result.brierRaw.toFixed(3)} tone="text-slate-200" />
          <Stat
            label="+H2H"
            value={result.brierWithH2h.toFixed(3)}
            tone={liftTone(result.liftH2hPct)}
            sub={`${result.liftH2hPct >= 0 ? '+' : ''}${result.liftH2hPct} %`}
          />
          <Stat
            label="+Schiri"
            value={result.brierWithReferee.toFixed(3)}
            tone={liftTone(result.liftRefereePct)}
            sub={`${result.liftRefereePct >= 0 ? '+' : ''}${result.liftRefereePct} %`}
          />
          <Stat
            label="+beides"
            value={result.brierWithBoth.toFixed(3)}
            tone={liftTone(result.liftCombinedPct)}
            sub={`${result.liftCombinedPct >= 0 ? '+' : ''}${result.liftCombinedPct} %`}
          />
        </div>
        <ul className="space-y-0.5 text-[10px] text-slate-400">
          <li>
            <span className="text-slate-300">H2H aktiv:</span>{' '}
            {result.matchesWithH2hSignal} von {result.matchesEvaluated} Spielen — Effekt insgesamt {liftLabel(result.liftH2hPct)}.
          </li>
          <li>
            <span className="text-slate-300">Schiri aktiv:</span>{' '}
            {result.matchesWithRefereeSignal} von {result.matchesEvaluated} Spielen — Effekt insgesamt {liftLabel(result.liftRefereePct)}.
          </li>
        </ul>
        {(() => {
          const trust = deriveModifierTrust(result);
          if (!trust.basedOnBacktest) return null;
          const disabled: string[] = [];
          if (!trust.h2hTrusted) disabled.push('H2H');
          if (!trust.refereeTrusted) disabled.push('Schiri');
          if (disabled.length === 0) {
            return (
              <p className="rounded border border-emerald-400/30 bg-emerald-500/10 p-1.5 text-[10px] leading-snug text-emerald-200">
                ✓ Beide Modifier zeigen im Backtest belastbaren Lift — werden fuer diese Liga aktiv eingerechnet.
              </p>
            );
          }
          return (
            <p className="rounded border border-amber-400/40 bg-amber-500/10 p-1.5 text-[10px] leading-snug text-amber-200">
              ⚠ Auto-disabled fuer diese Liga: {disabled.join(', ')} — Backtest-Lift zu schwach. Engine ignoriert das Signal hier, bis die Datenlage sich aendert.
            </p>
          );
        })()}
        <p className="text-[10px] leading-snug text-slate-500">
          Negativer Lift heisst: der Modifier macht die Prognose im Backtest schlechter — das ist ehrlich gezeigt und nicht versteckt.
        </p>
      </div>
    </details>
  );
}

function Stat({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 p-1">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-bold ${tone}`}>{value}</div>
      {sub && <div className={`font-mono text-[8.5px] ${tone}`}>{sub}</div>}
    </div>
  );
}
