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
