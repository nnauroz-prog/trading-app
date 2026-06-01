import Link from 'next/link';

export type Verdict = 'kaufen' | 'tippen' | 'halten' | 'warten' | 'keine_daten';

export interface AssetCardData {
  klass: 'krypto' | 'aktien' | 'gold' | 'sport';
  emoji: string;
  label: string;
  verdict: Verdict;
  headline: string; // Was konkret tun
  detail: string;   // Eine Zeile Begründung
  target?: string;  // Coin/Team/Wert
  href?: string;
  confidence?: number; // 0-100
  // Optionale Trade-Levels für KAUFEN-Verdikt — Entry/Stop/Take-Profit.
  levels?: {
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2?: number;
    stopDistancePct?: number;
  };
  // Optionale Liste mit weiteren Ergebnis-Tipps für heute (Sport).
  extraTips?: { home: string; away: string; score: string; confidence: number }[];
}

interface Props {
  cards: AssetCardData[];
}

const VERDICT_STYLE: Record<Verdict, { border: string; bg: string; text: string; pillText: string; label: string }> = {
  kaufen: {
    border: 'border-emerald-400/60',
    bg: 'bg-emerald-950/30',
    text: 'text-emerald-100',
    pillText: 'text-emerald-200',
    label: 'KAUFEN'
  },
  tippen: {
    border: 'border-sky-400/60',
    bg: 'bg-sky-950/30',
    text: 'text-sky-100',
    pillText: 'text-sky-200',
    label: 'TIPP'
  },
  halten: {
    border: 'border-amber-400/60',
    bg: 'bg-amber-950/25',
    text: 'text-amber-100',
    pillText: 'text-amber-200',
    label: 'HALTEN'
  },
  warten: {
    border: 'border-slate-700',
    bg: 'bg-slate-950/40',
    text: 'text-slate-100',
    pillText: 'text-slate-300',
    label: 'WARTEN'
  },
  keine_daten: {
    border: 'border-slate-800',
    bg: 'bg-slate-950/40',
    text: 'text-slate-300',
    pillText: 'text-slate-500',
    label: 'NOCH KEINE DATEN'
  }
};

// Der EINE Bildschirm: heute machen. Ganz oben auf der Startseite.
// Pro Asset-Klasse eine prominente Karte mit klarer Empfehlung.
function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `$${Math.round(n).toLocaleString('de-DE')}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(3)}`;
}

function LevelTile({ label, value, tone, sub }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral'; sub?: string }) {
  const cls = tone === 'good' ? 'text-emerald-200' : tone === 'bad' ? 'text-rose-200' : 'text-slate-100';
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 p-1 text-center">
      <div className="text-[8px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-[10.5px] font-bold ${cls}`}>{value}</div>
      {sub && <div className="font-mono text-[9px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function HeuteMachen({ cards }: Props) {
  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">Heute machen</div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Dein Tagesplan, ohne Schnickschnack</h2>
        <p className="text-[11.5px] leading-snug text-slate-400">
          Pro Bereich genau eine Empfehlung. Wenn etwas „warten“ sagt, lass die Finger davon — das ist die wertvollste Entscheidung im Markt.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const style = VERDICT_STYLE[card.verdict];
          const inner = (
            <div className={`flex h-full flex-col justify-between gap-2 rounded-xl border-2 ${style.border} ${style.bg} p-3`}>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg leading-none">{card.emoji}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">{card.label}</span>
                  </div>
                  <span className={`rounded-md border border-current/40 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${style.pillText}`}>
                    {style.label}
                  </span>
                </div>
                <div className={`text-[16px] font-bold leading-tight ${style.text}`}>
                  {card.headline}
                </div>
                {card.target && (
                  <div className="font-mono text-[11px] text-white">{card.target}{card.confidence !== undefined ? ` · ${card.confidence}%` : ''}</div>
                )}
              </div>
              {card.levels && card.verdict === 'kaufen' && (
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-1.5">
                  <LevelTile label="Einstieg" value={fmtPrice(card.levels.entry)} tone="neutral" />
                  <LevelTile label="Stop" value={fmtPrice(card.levels.stopLoss)} tone="bad" sub={card.levels.stopDistancePct !== undefined ? `−${card.levels.stopDistancePct.toFixed(1)}%` : undefined} />
                  <LevelTile label="Ziel" value={fmtPrice(card.levels.takeProfit1)} tone="good" />
                </div>
              )}
              {card.extraTips && card.extraTips.length > 0 && (
                <ul className="space-y-0.5 rounded-lg border border-sky-400/30 bg-sky-950/15 p-1.5">
                  <li className="text-[8.5px] uppercase tracking-wider text-sky-300">Heute spielen außerdem</li>
                  {card.extraTips.map((t, i) => (
                    <li key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 text-[10.5px] text-slate-200">
                      <span className="truncate text-right">{t.home}</span>
                      <span className="font-mono text-emerald-300">{t.score}</span>
                      <span className="truncate">{t.away}</span>
                      <span className="font-mono text-slate-400">{t.confidence}%</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10.5px] leading-snug text-slate-400">{card.detail}</p>
            </div>
          );
          return card.href ? (
            <Link key={card.klass} href={card.href} className="block transition hover:scale-[1.01]">{inner}</Link>
          ) : (
            <div key={card.klass}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
