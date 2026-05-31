export type CoinActionKind =
  | 'kaufen'
  | 'kleine_position'
  | 'watchlist'
  | 'warten_pullback'
  | 'meiden'
  | 'unklare_datenlage';

export interface CoinAction {
  kind: CoinActionKind;
  headline: string;
  body: string;
  toneClass: string;
  labelClass: string;
}

interface Input {
  hasCandidate: boolean;
  opportunityScore: number;
  structure: 'uptrend' | 'downtrend' | 'range' | null;
  priceChange24h: number;
  nearSupport: boolean;
  marketMoodRiskOff: boolean;
}

// Boil all the per-coin signals into one direct action recommendation,
// shown as the first card on the asset page.
export function deriveCoinAction(input: Input): CoinAction {
  if (!input.hasCandidate) {
    return {
      kind: 'unklare_datenlage',
      headline: 'Steht aktuell auf keiner Liste',
      body: 'Dieser Coin erfüllt aktuell keines der harten Setup-Kriterien. Keine Empfehlung — beobachten, aber nicht erzwingen.',
      toneClass: 'border-slate-700 bg-slate-900/60',
      labelClass: 'border-slate-700 bg-slate-900 text-slate-300'
    };
  }
  if (input.marketMoodRiskOff) {
    return {
      kind: 'meiden',
      headline: 'Markt ist im Abverkauf — heute nicht',
      body: 'Auch wenn das Setup für sich genommen passabel aussieht: bei breitem Markt-Druck verlieren historisch auch gute Coins. Cash schützen.',
      toneClass: 'border-rose-400/50 bg-rose-950/20',
      labelClass: 'border-rose-400/50 bg-rose-500/15 text-rose-200'
    };
  }
  if (input.priceChange24h > 12) {
    return {
      kind: 'warten_pullback',
      headline: 'Schon zu weit gelaufen — auf Pullback warten',
      body: `Coin ist heute +${input.priceChange24h.toFixed(1)}%. Wer jetzt einsteigt, kauft im oberen Drittel der Impulswelle. Lieber auf eine Korrektur in Richtung Unterstützung warten.`,
      toneClass: 'border-amber-400/50 bg-amber-950/20',
      labelClass: 'border-amber-400/50 bg-amber-500/15 text-amber-200'
    };
  }
  if (input.opportunityScore >= 80 && input.nearSupport && input.structure === 'uptrend') {
    return {
      kind: 'kaufen',
      headline: 'Klares Setup — solide Position möglich',
      body: 'Uptrend, nahe Unterstützung, hoher Konfluenz-Score. Mit klarem Stop und dem in den Tools berechneten Sizing rein. Stop respektieren — kein Setup ist garantiert.',
      toneClass: 'border-emerald-400/60 bg-emerald-950/30',
      labelClass: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
    };
  }
  if (input.opportunityScore >= 70 && input.structure !== 'downtrend') {
    return {
      kind: 'kleine_position',
      headline: 'Setup interessant — nur kleine Position',
      body: 'Score über 70 aber nicht alle Sterne aligned. Kleinere Position-Größe als gewohnt, klar definierter Stop, kein Nachkaufen wenn es gegen dich läuft.',
      toneClass: 'border-emerald-400/40 bg-emerald-950/15',
      labelClass: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
    };
  }
  if (input.opportunityScore >= 55) {
    return {
      kind: 'watchlist',
      headline: 'Auf Watchlist — auf Bestätigung warten',
      body: 'Setup hat Substanz, aber noch nicht genug Konfluenz für einen Trade. Auf Watchlist nehmen und warten, bis sich das Bild verdichtet (z.B. Häkchen ≥ 9 oder Bruch eines Widerstands).',
      toneClass: 'border-sky-400/40 bg-sky-950/20',
      labelClass: 'border-sky-400/40 bg-sky-500/10 text-sky-200'
    };
  }
  if (input.structure === 'downtrend' || input.opportunityScore < 35) {
    return {
      kind: 'meiden',
      headline: 'Aktuell meiden',
      body: 'Schwaches Setup, niedriger Score oder fallende Struktur. Kein Trade-Tag für diesen Coin — anderswo nach Chancen suchen.',
      toneClass: 'border-rose-400/40 bg-rose-950/15',
      labelClass: 'border-rose-400/40 bg-rose-500/15 text-rose-200'
    };
  }
  return {
    kind: 'watchlist',
    headline: 'Beobachten, nicht handeln',
    body: 'Gemischtes Bild — kein Auftrag zum Kauf, aber auch kein klares Meiden. Auf Watchlist setzen und nächstes Mal vorbeischauen.',
    toneClass: 'border-slate-700 bg-slate-900/60',
    labelClass: 'border-slate-700 bg-slate-900 text-slate-300'
  };
}
