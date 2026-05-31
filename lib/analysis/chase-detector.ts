import { CoinSentiment } from '@/lib/akademie/spaeher';

export interface ChaseSignal {
  coin: string;
  priceChangePct24h: number;
  newsTilt: 'bullisch' | 'bärisch';
  topHeadline: string | null;
  reason: string;
  // 'hot_news_already_run' = bullish news + price already up >5% in 24h
  // 'cold_news_already_down' = bearish news + price already down >5% in 24h
  kind: 'hot_news_already_run' | 'cold_news_already_down';
}

export interface OpportunitySignal {
  coin: string;
  priceChangePct24h: number;
  newsBullish: number;
  newsBearish: number;
  topHeadline: string | null;
  reason: string;
  // 'fear_overdone' = price already down >5% but news mix is starting to turn
  // bullish — classic "buy the dip in panic" setup. The opposite of chasing.
  kind: 'fear_overdone';
}

// Threshold above which "the news is already priced in". Tuned conservatively:
// 5% on a major crypto in 24h is a strong move; chasing after that historically
// loses money because the impulse phase is usually over.
const ALREADY_PRICED_IN_PCT = 5;

export interface PriceContext {
  symbol: string; // 'BTC', 'ETH', ...
  priceChangePct24h: number;
}

// Returns warnings for coins where the news is bullish but the move has already
// happened (or bearish but the drop has already happened). This is the
// "schon gelaufen, nicht hinterherjagen" signal — exactly the BNB/VanEck-ETF
// pattern where the headline justifies the spike but does not justify entering
// at the top of the impulse.
export function detectChaseSignals(perCoin: CoinSentiment[], prices: PriceContext[]): ChaseSignal[] {
  const out: ChaseSignal[] = [];
  for (const sentiment of perCoin) {
    const price = prices.find((p) => p.symbol.toUpperCase() === sentiment.coin.toUpperCase());
    if (!price) continue;
    const change = price.priceChangePct24h;
    const topTitle = sentiment.topItem?.title ?? null;
    if (sentiment.tilt === 'bullisch' && change >= ALREADY_PRICED_IN_PCT) {
      out.push({
        coin: sentiment.coin,
        priceChangePct24h: change,
        newsTilt: 'bullisch',
        topHeadline: topTitle,
        kind: 'hot_news_already_run',
        reason: `${sentiment.coin} ist heute +${change.toFixed(1)}% — die News (${sentiment.bullishCount} bullische Headlines) ist eingepreist. Wer jetzt einsteigt, kauft am oberen Ende der Impulswelle.`
      });
    } else if (sentiment.tilt === 'bärisch' && change <= -ALREADY_PRICED_IN_PCT) {
      out.push({
        coin: sentiment.coin,
        priceChangePct24h: change,
        newsTilt: 'bärisch',
        topHeadline: topTitle,
        kind: 'cold_news_already_down',
        reason: `${sentiment.coin} ist heute ${change.toFixed(1)}% — die bärische News ist schon im Kurs. Auf weiteren Verfall zu wetten ist riskant, der Markt hat reagiert.`
      });
    }
  }
  // Strongest moves first.
  out.sort((a, b) => Math.abs(b.priceChangePct24h) - Math.abs(a.priceChangePct24h));
  return out;
}

// "Angst-war-übertrieben" — opposite of chase: a coin is down ≥5% in 24h
// (pessimism priced in) BUT the news mix is not purely bearish (≥1 bullish
// headline OR no bearish-dominant tilt). This is the contrarian "step in when
// blood is on the streets" setup the screenshots showed — buying AAL during
// the Iran scare on the bet that the fear was overdone.
export function detectOpportunitySignals(perCoin: CoinSentiment[], prices: PriceContext[]): OpportunitySignal[] {
  const out: OpportunitySignal[] = [];
  for (const sentiment of perCoin) {
    const price = prices.find((p) => p.symbol.toUpperCase() === sentiment.coin.toUpperCase());
    if (!price) continue;
    const change = price.priceChangePct24h;
    if (change > -ALREADY_PRICED_IN_PCT) continue; // not dropped enough
    // Need at least one bullish headline OR a non-bearish tilt — otherwise
    // it might still be a falling knife.
    const tiltOk = sentiment.tilt !== 'bärisch' || sentiment.bullishCount >= 1;
    if (!tiltOk) continue;
    out.push({
      coin: sentiment.coin,
      priceChangePct24h: change,
      newsBullish: sentiment.bullishCount,
      newsBearish: sentiment.bearishCount,
      topHeadline: sentiment.topItem?.title ?? null,
      kind: 'fear_overdone',
      reason: `${sentiment.coin} ist heute ${change.toFixed(1)}% — Pessimismus ist im Kurs, aber die News-Lage ist nicht eindeutig bärisch (${sentiment.bullishCount}↑ / ${sentiment.bearishCount}↓). Klassisches „Angst-war-übertrieben"-Setup — kann ein guter Wiedereinstieg sein, wenn das Setup-Scout zustimmt.`
    });
  }
  out.sort((a, b) => a.priceChangePct24h - b.priceChangePct24h); // biggest drop first
  return out;
}
