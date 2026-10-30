# Crypto data sources

Spot tickers and OHLC prefer Binance, then Bybit, then the independent public Kraken REST API. No Binance/Bybit mirror, geographic proxy workaround or fake quotes are used. Regional denial at one provider is not treated as evidence that the next provider works; each response must succeed.

Kraken fallback uses only online USDT pairs that match the configured coin universe. BTC maps to XBT and DOGE to XDG. It never relabels USD quotes as USDT. The real AssetPairs probe on 30 October 2026 covered 16 of the configured 51 symbols; omitted coins are unavailable, not simulated.

Kraken supplies native 1m/5m/15m/30m/1h/4h/1d/1w OHLC intervals. Unsupported intervals return unavailable. The public API retains approximately 720 candles per interval; requesting 1,000 candles returns only the available history. Candle timestamps convert seconds to milliseconds and carry source provenance.

Kraken ticker `o` is today's open, not the rolling 24-hour reference price. The adapter instead requests the first public trade at/after a timestamp 24 hours earlier. A pair without a reference trade within five minutes of that timestamp is omitted. Reported 24h volume is converted to USDT turnover using Kraken's 24h VWAP; no turnover from a different quote market is substituted.

Requests are serialized and shared across repeated page components. Pair discovery is cached for six hours, aggregate tickers for 15 seconds, and reference trades and candles for 60 seconds. The native fetch cache retains a 60-second response cache. Each request has an eight-second timeout and keeps the environment's proxy and TLS verification.

Kraken's USDT markets may have less liquidity than Binance/Bybit. The application's risk and liquidity thresholds remain unchanged. Real data can legitimately yield zero approved buy signals.

Required network destination for this fallback: `api.kraken.com`. The current environment has user-enabled unrestricted access; a later restricted environment must explicitly allow that hostname.
