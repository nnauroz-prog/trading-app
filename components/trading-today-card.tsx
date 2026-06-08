import type { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import type { TradeTier90Result } from '@/lib/agents/trade-tier-90';
import { PositionSizeHelper } from '@/components/position-size-helper';
import { TradingTodayLearningNote, type TradingTodayKind } from '@/components/trading-today-learning-note';

interface Props {
  tier90: TradeTier90Result;
  consensusPersona: AgentVerdict | null;
  conservative: AgentVerdict | null;
  balanced: AgentVerdict | null;
  aggressive: AgentVerdict | null;
}

type Verdict = 'kaufen-tier-90' | 'kaufen-konservativ' | 'kaufen-mit-vorsicht' | 'warten-uneinig' | 'warten-keine-setups';

function decideVerdict(props: Props): { verdict: Verdict; symbol: string | null; entry: number | null; stop: number | null; tp: number | null } {
  if (props.tier90.qualified && props.consensusPersona?.target) {
    return {
      verdict: 'kaufen-tier-90',
      symbol: props.consensusPersona.target.symbol,
      entry: props.consensusPersona.target.entry,
      stop: props.consensusPersona.target.stopLoss,
      tp: props.consensusPersona.target.takeProfit1
    };
  }
  if (props.conservative?.verdict === 'BUY' && props.conservative.target && props.conservative.safety?.grade === 'A') {
    return {
      verdict: 'kaufen-konservativ',
      symbol: props.conservative.target.symbol,
      entry: props.conservative.target.entry,
      stop: props.conservative.target.stopLoss,
      tp: props.conservative.target.takeProfit1
    };
  }
  const buyCount = [props.conservative, props.balanced, props.aggressive].filter((p) => p?.verdict === 'BUY').length;
  if (buyCount >= 2 && props.balanced?.target) {
    return {
      verdict: 'kaufen-mit-vorsicht',
      symbol: props.balanced.target.symbol,
      entry: props.balanced.target.entry,
      stop: props.balanced.target.stopLoss,
      tp: props.balanced.target.takeProfit1
    };
  }
  if (buyCount === 0) {
    return { verdict: 'warten-keine-setups', symbol: null, entry: null, stop: null, tp: null };
  }
  return { verdict: 'warten-uneinig', symbol: null, entry: null, stop: null, tp: null };
}

function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `$${Math.round(n).toLocaleString('de-DE')}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(3)}`;
}

function verdictToLearningKind(v: Verdict): TradingTodayKind {
  if (v === 'kaufen-tier-90') return 'tier-90';
  if (v === 'kaufen-konservativ') return 'konservativ';
  if (v === 'kaufen-mit-vorsicht') return 'mit-vorsicht';
  if (v === 'warten-uneinig') return 'uneinig';
  return 'cash';
}

function buyingFirmasOf(props: Props): PersonaId[] {
  const out: PersonaId[] = [];
  if (props.conservative?.verdict === 'BUY') out.push('conservative');
  if (props.balanced?.verdict === 'BUY') out.push('balanced');
  if (props.aggressive?.verdict === 'BUY') out.push('aggressive');
  return out;
}

// EINE Frage: kaufe ich heute, was, und wie? Klartext in einem Satz.
// Sitzt ganz oben auf der Startseite und ersetzt Cockpit-Wand-Mentalität.
export function TradingTodayCard(props: Props) {
  const { verdict, symbol, entry, stop, tp } = decideVerdict(props);
  const learningKind = verdictToLearningKind(verdict);
  const buyingFirmas = buyingFirmasOf(props);
  const accent = verdict === 'kaufen-tier-90'
    ? 'border-yellow-300/70 bg-gradient-to-br from-yellow-950/30 via-slate-900/70 to-slate-900/70'
    : verdict === 'kaufen-konservativ'
    ? 'border-emerald-400/60 bg-emerald-950/30'
    : verdict === 'kaufen-mit-vorsicht'
    ? 'border-amber-400/60 bg-amber-950/25'
    : 'border-slate-700 bg-slate-900/50';
  const headline = verdict === 'kaufen-tier-90'
    ? `⚜ JA — ${symbol} kaufen (Tier 90)`
    : verdict === 'kaufen-konservativ'
    ? `✓ JA — ${symbol} kaufen (Grade A)`
    : verdict === 'kaufen-mit-vorsicht'
    ? `↗ Vielleicht — ${symbol} mit Vorsicht`
    : verdict === 'warten-uneinig'
    ? 'Heute besser warten — Firmen uneinig'
    : 'Heute kein Setup — Cash halten';
  const explainer = verdict === 'kaufen-tier-90'
    ? 'Alle drei Firmen kaufen, Grade A, jede intern > 65 %. Höchstes Vertrauen.'
    : verdict === 'kaufen-konservativ'
    ? 'Konservative Firma hat Grade A und kauft. Strenger Filter durch.'
    : verdict === 'kaufen-mit-vorsicht'
    ? 'Zwei der drei Firmen sehen ein Setup. Position kleiner halten.'
    : verdict === 'warten-uneinig'
    ? 'Mindestens eine Firma kauft, mindestens eine wartet — keine klare Linie. Heute aussetzen.'
    : 'Keine Firma sieht heute ein Setup. Das ist eine valide Position. Lieber Cash als Bauch-Kauf.';

  return (
    <section className={`space-y-3 rounded-2xl border-2 p-4 ${accent}`}>
      <header>
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Heute kaufen?</div>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-white">{headline}</h2>
        <p className="mt-1 text-[12px] leading-snug text-slate-300">{explainer}</p>
      </header>

      {symbol && entry !== null && stop !== null && tp !== null && (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800/60 bg-slate-950/50 p-3">
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Einstieg</div>
              <div className="mt-0.5 font-mono text-base font-bold text-slate-100">{fmtPrice(entry)}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider text-rose-400">Stop</div>
              <div className="mt-0.5 font-mono text-base font-bold text-rose-200">{fmtPrice(stop)}</div>
              <div className="text-[9px] text-rose-400/70">−{(Math.abs((entry - stop) / entry) * 100).toFixed(1)} %</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider text-emerald-400">Ziel</div>
              <div className="mt-0.5 font-mono text-base font-bold text-emerald-200">{fmtPrice(tp)}</div>
              <div className="text-[9px] text-emerald-400/70">+{(Math.abs((tp - entry) / entry) * 100).toFixed(1)} %</div>
            </div>
          </div>
          <PositionSizeHelper entry={entry} stop={stop} symbol={symbol} />
        </>
      )}

      <TradingTodayLearningNote kind={learningKind} buyingFirmas={buyingFirmas} />

      <p className="text-[10px] leading-snug text-slate-500">
        Position so groß, dass der Stop höchstens 1 % deines Gesamtdepots kostet. Stop religiös einhalten — kein Trade ist garantiert.
      </p>
    </section>
  );
}
