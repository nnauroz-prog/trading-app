# Trading Decision Support App

Produktionsnahe Next.js-App für tägliche Krypto-/Aktienanalyse (transparente Entscheidungsunterstützung, **keine Finanzberatung**).

## Setup
1. `npm install`
2. `.env.local` aus `.env.local.example` erzeugen und Werte eintragen.
3. Migrationen in `db/migrations/*.sql` per Supabase/Postgres-Workflow einspielen.
4. `npm run dev`

## Environment

| Variable | Pflicht | Zweck |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Production | Persistenz von Reports, Recommendations, Snapshots, Reviews. Leer = Mock-Modus. |
| `CRON_SECRET` | Production | Schützt `GET /api/cron/daily-report`. Im Dev darf der Wert leer sein (dann ungeprüft). |
| `COINGECKO_API_KEY` | Optional | Pro-API für Krypto-Preise. Ohne Key wird die Free-API verwendet. |
| `FINNHUB_API_KEY` / `NEWS_API_KEY` | Optional | Reserviert für künftige Stock-/News-Provider. |

## Architektur
- `app/` Dashboard + Asset-Detail + Cron API Route
- `lib/analysis` transparentes Scoring-Modell (Krypto/Aktien); Signale werden aus Snapshots abgeleitet
- `lib/providers/coingecko.ts` Live-Preise für BTC/ETH/SOL (Free oder Pro)
- `lib/providers/index.ts` aggregiert Live + Mock und liefert kombinierte Snapshots
- `lib/server/report-store.ts` Persistenz + Daily-Review-Orchestrierung
- `lib/review/evaluator.ts` Regelwerk „Empfehlung war gut/schlecht/neutral"
- `lib/data/mock.ts` Mock-Daten und CoinGecko-ID-Mapping
- `db/migrations/*.sql` Datenbankstruktur

## Daily Automation
- Vercel-Cron triggert `GET /api/cron/daily-report` mit Header `Authorization: Bearer <CRON_SECRET>`.
- Route persistiert Tagesdaten und erzeugt Review für den Vortag, falls Supabase gesetzt ist.
- Ohne Supabase-Env läuft der Endpoint transparent im Mock-Modus.

## Datenquellen
- **Krypto (BTC/ETH/SOL):** CoinGecko `/coins/markets` mit `price_change_percentage=24h,7d,30d`. Fällt bei Fehler/Quota auf Mock zurück.
- **Aktien (NVDA/SAP/MSFT):** aktuell Mock. Finnhub-Anbindung folgt.

## Nächster Schritt
- Finnhub-Provider für Aktien ergänzen.
- Supabase Auth aktivieren (single-user access).
- Trefferquote 7/30 Tage als Supabase-RPC + Anzeige im Dashboard.
- News-Sentiment einbinden und in `signal.sentiment` einfließen lassen.
