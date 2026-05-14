# Trading Decision Support App

Produktionsnahe Next.js-App für tägliche Krypto-/Aktienanalyse (transparente Entscheidungsunterstützung, **keine Finanzberatung**).

## Setup
1. `npm install`
2. `.env.local` aus `.env.local.example` erzeugen und Werte eintragen.
3. Migrationen in `db/migrations/*.sql` per Supabase/Postgres-Workflow einspielen.
4. `npm run dev`

## Skripte
- `npm run dev` – Entwicklungsserver
- `npm run build` – Production-Build
- `npm run start` – Production-Server
- `npm run lint` – ESLint
- `npm run typecheck` – `tsc --noEmit`
- `npm test` – Vitest-Suite (scoring, evaluator, sentiment classifier)

## Environment

| Variable | Pflicht | Zweck |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Production | Persistenz von Reports, Recommendations, Snapshots, Reviews. Leer = Mock-Modus. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Aktiviert Supabase Auth (Magic Link). Leer → Middleware lässt durch. |
| `ALLOWED_EMAIL` | Empfohlen | Nur diese E-Mail darf einloggen. Andere werden direkt abgemeldet. Leer = jeder mit Magic Link. |
| `CRON_SECRET` | Production | Schützt `GET /api/cron/daily-report`. Im Dev darf der Wert leer sein (dann ungeprüft). |
| `COINGECKO_API_KEY` | Optional | Pro-API für Krypto-Preise. Ohne Key wird die Free-API verwendet. |
| `FINNHUB_API_KEY` | Optional | Aktien-Preise + Metriken + News-Sentiment via Finnhub. Ohne Key bleiben Aktien auf Mock und Sentiment auf Default. |
| `NEWS_API_KEY` | Optional | Reserviert für zusätzliche News-Provider. |

## History
- `/history` listet vergangene Recommendations + zugehörige Review-Verdicts aus Supabase.
- Filter: Asset (Dropdown), Aktion (BUY/WATCH/HOLD/AVOID/SELL). Filterzustand lebt in der URL.
- Bei mehreren Reviews pro Empfehlung wird der jüngste angezeigt.
- Ohne Supabase-Env zeigt die Seite einen Hinweis statt einer leeren Tabelle.

## Auth
- Magic-Link-Login via Supabase Auth (`@supabase/ssr`).
- `middleware.ts` schützt alle Routen außer `/login`, `/auth/callback` und `/api/cron/*`. Ohne `NEXT_PUBLIC_SUPABASE_*`-Vars deaktiviert sich das Gate (Mock-Modus).
- `ALLOWED_EMAIL` macht aus dem System einen Single-User-Login: alle anderen Adressen werden direkt wieder ausgeloggt.
- Supabase-Projekt-Setup: Email-Provider aktivieren, Redirect-URL `<APP_URL>/auth/callback` in den Auth-Settings hinterlegen.

## Architektur
- `app/` Dashboard + Login/Logout + Asset-Detail + Cron API Route
- `lib/analysis` transparentes Scoring-Modell (Krypto/Aktien); Signale werden aus Snapshots abgeleitet
- `lib/providers/coingecko.ts` Live-Preise für BTC/ETH/SOL (Free oder Pro)
- `lib/providers/index.ts` aggregiert Live + Mock und liefert kombinierte Snapshots
- `lib/server/report-store.ts` Persistenz + Daily-Review-Orchestrierung
- `lib/review/evaluator.ts` Regelwerk „Empfehlung war gut/schlecht/neutral"
- `lib/data/mock.ts` Mock-Daten und CoinGecko-ID-Mapping
- `db/migrations/*.sql` Datenbankstruktur

## Daily Automation
- `vercel.json` plant einen täglichen Cron um 06:00 UTC auf `/api/cron/daily-report`. Vercel injiziert dabei automatisch `Authorization: Bearer <CRON_SECRET>`, sobald die Env-Variable im Projekt gesetzt ist.
- Route persistiert Tagesdaten und erzeugt Review für den Vortag, falls Supabase gesetzt ist.
- Ohne Supabase-Env läuft der Endpoint transparent im Mock-Modus.
- Schedule kann in `vercel.json` angepasst werden; Format ist Standard-Cron.

- **Aktien-Fundamentals + Earnings:** Aus dem gleichen Finnhub `/stock/metric?metric=all`-Call werden `pe`, `peg`, `roe`, `debtToEquity` (Fundamentals-Score) und `epsGrowthQuarterlyYoy`, `revenueGrowthQuarterlyYoy` (Earnings-Score) abgeleitet (Logik in `lib/analysis/fundamentals.ts`). Jeder Metrik-Wert wird auf eine 0-100-Skala gemappt, fehlende Werte werden übersprungen. Liegt keine einzige Metrik vor, fällt der Score auf 50 (neutral). Damit sind `signal.fundamentals` und `signal.earningsGrowth` für Aktien echt; Krypto-Assets behalten den 50-Default, weil „Fundamentals" für Token konzeptionell nicht trägt.
- **Volumen-Signal bleibt Default 60:** Das echte Tagesvolumen liegt nur in `/stock/candle` (Premium) bzw. bräuchte für Krypto eine zusätzliche `/coins/{id}/market_chart`-Anfrage je Asset. Daher offen als bewusste Lücke dokumentiert.

## Datenquellen
- **Krypto (BTC/ETH/SOL):** CoinGecko `/coins/markets` mit `price_change_percentage=24h,7d,30d`. Fällt bei Fehler/Quota auf Mock zurück.
- **Aktien (NVDA/SAP/MSFT):** Finnhub `/quote` für Preis + 24h-Change, `/stock/metric?metric=all` für Renditen.
  - `change7d` ist `5DayPriceReturnDaily` (≈ 5 Handelstage)
  - `change30d` ist `monthToDatePriceReturnDaily` (Tage seit Monatsanfang — Wert variiert je nach Wochentag)
  - Reale 7/30-Tage-Returns liegen im Premium-Plan (`/stock/candle`). Falls aufgerüstet, kann der Provider direkt umgestellt werden.
  - Ohne `FINNHUB_API_KEY` oder bei Fehler → Mock-Fallback pro Asset.
- **News-Sentiment:** Finnhub `/company-news` pro Aktie + `/news?category=crypto` als Sammel-Score für alle Krypto-Assets. Lexikon-basiertes Scoring (DE/EN) liefert eine 0-100-Zahl, die in `signal.sentiment` einfließt. Die Asset-Detail-Seite rendert die letzten 6 Headlines pro Asset inkl. Klassifikation (+/-/·) als Transparenz-Layer. Ohne `FINNHUB_API_KEY` bleibt der Default (60) erhalten. Das Lexikon ist klein und absichtlich konservativ — eine LLM- oder VADER-basierte Auswertung ist als Folge-Iteration möglich.

## Trefferquote
- `getHitRates()` liest `recommendation_reviews` über die letzten 7/30 Tage und liefert das Verhältnis `direction_correct = true` zu allen ausgewerteten Reviews.
- Im Dashboard rendert das `HitRateTile` die beiden Werte plus Sample-Size. Ohne Supabase-Env-Variablen zeigt es den Hinweis "Persistenz nicht aktiv".

## Nächster Schritt
- Supabase Auth aktivieren (single-user access).
- Sentiment-Modell auf VADER/LLM upgraden, sobald die naïve Lexikon-Heuristik zu rauschig wird.
