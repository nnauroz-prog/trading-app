# Trading Decision Support App

Produktionsnahe Next.js-App für tägliche Krypto-/Aktienanalyse (transparente Entscheidungsunterstützung, **keine Finanzberatung**).

## Setup
1. `npm install`
2. `.env.local` aus `.env.local.example` erzeugen und Werte eintragen.
3. Migrationen in `db/migrations/*.sql` per Supabase/Postgres-Workflow einspielen.
4. `npm run dev`

## Deploy auf Vercel

Die App ist Zero-Config-deploy-fähig. Ohne Env-Variablen läuft sie im Mock-Modus (keine Persistenz, kein Auth-Gate, Crypto-Preise von CoinGecko-Free) — damit kannst du erst deployen, dann Schritt für Schritt mit echten Daten anreichern.

**Minimal-Deploy in 3 Schritten (kein Login, Mock-Daten):**

1. Auf [vercel.com/new](https://vercel.com/new) gehen → unter „Import Git Repository" das **bestehende** `nnauroz-prog/trading-app` auswählen (nicht „Clone Template" — das würde einen separaten Fork anlegen, der nicht mit unserem Repo verbunden ist).
2. Vercel erkennt Next.js automatisch. Build & Output-Settings unverändert lassen, Env-Vars erstmal leer lassen.
3. „Deploy" klicken. Nach ~60 Sek hast du eine Production-URL wie `https://<projektname>.vercel.app`.

Die Startseite zeigt dann Live-Preise von CoinGecko (BTC/ETH/SOL) und Mock-Werte für Aktien. Login ist aus, History-Seite zeigt „Persistenz nicht aktiv".

**Volle Konfiguration (Schritt für Schritt nachrüstbar):**

In Vercel → Project Settings → Environment Variables eintragen:

| Variable | Wofür | Quelle |
|---|---|---|
| `FINNHUB_API_KEY` | Aktien-Fundamentals + News-Sentiment | [finnhub.io](https://finnhub.io) (kostenloser Tier reicht) |
| `NEXT_PUBLIC_SUPABASE_URL` | Persistenz + Auth | Supabase Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Persistenz + Auth | Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Schreibzugriff | Supabase Project Settings → API |
| `ALLOWED_EMAIL` | Single-User-Login | Deine E-Mail |
| `CRON_SECRET` | Schutz der Cron-Route | `openssl rand -hex 32` |
| `COINGECKO_API_KEY` | optional, Pro-API für Krypto | [coingecko.com](https://www.coingecko.com/en/api/pricing) |

Nach jedem Env-Update Re-Deploy auslösen (Vercel-UI → Deployments → Redeploy).

**Supabase-Auth-Setup (einmalig):**

1. Supabase Project → Authentication → Providers → Email aktivieren.
2. Authentication → URL Configuration → Site-URL und Redirect-URL auf `https://<dein-projekt>.vercel.app/auth/callback` setzen.
3. Migrationen `db/migrations/*.sql` der Reihe nach im Supabase SQL-Editor ausführen.

**Cron-Job:** `vercel.json` registriert bereits einen täglichen Lauf um 06:00 UTC auf `/api/cron/daily-report`. Vercel injiziert `Authorization: Bearer ${CRON_SECRET}` automatisch, sobald `CRON_SECRET` als Env gesetzt ist. Auf dem Hobby-Plan ist ein Cron-Job pro Projekt inklusive.

**Bekannte Stolperfallen:**

- Yahoo Finance `/v8/finance/chart` ist offiziell undokumentiert. Manche Cloud-Regionen werden gelegentlich rate-limited. Wenn das passiert, fällt der Provider auf Finnhub-Snapshot zurück (MTD-Returns statt echter 30d) — die App bleibt funktionsfähig.
- Beim ersten Deploy ohne `SUPABASE_SERVICE_ROLE_KEY` ist die History-Seite leer. Das ist by design: erst nach 7 bzw. 30 Tagen mit aktiver Cron-Schreibung füllen sich die Buckets.

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
- **Volumen-Signal (Aktien):** Aus dem Yahoo-Chart wird `volumeRatio = today / 30d-avg` berechnet und in `lib/analysis/engine.ts:scoreVolumeRatio` auf eine 0-100-Skala gemappt (ratio < 0.5 → 30, 0.8-1.2 → 55, ratio > 3 → 85). Für Krypto bleibt der 60-Default, weil CoinGeckos `/coins/markets` keine Volumen-Historie liefert (separater `/coins/{id}/market_chart`-Call wäre nötig — bewusste Lücke).
- **Macro-Signal:** Yahoo `^VIX` (latest close) wird in `lib/providers/macro.ts:scoreVix` auf 0-100 abgebildet — niedriger VIX (< 15) → 70, normale Spanne 15-25 → 50-60, Panic > 40 → 20. Wird für alle Assets als `signal.macroContext` genutzt. Ohne Yahoo-Erreichbarkeit fällt der Wert auf 60.

## Datenquellen
- **Krypto (BTC/ETH/SOL):** CoinGecko `/coins/markets` mit `price_change_percentage=24h,7d,30d`. Fällt bei Fehler/Quota auf Mock zurück.
- **Aktien-Preise (NVDA/SAP/MSFT):** Yahoo Finance `/v8/finance/chart` (Range 3mo, Interval 1d). Daraus werden echte 24h/7d/30d-Returns über die letzten Tagescloses berechnet, plus `volumeRatio` = heutiges Volumen / Mittel der vorhergehenden ~21 Handelstage. Der Endpoint ist offiziell undokumentiert, aber seit Jahren stabil und ohne API-Key nutzbar.
  - Fallback-Kette: Yahoo → Finnhub `/quote + /stock/metric` (mit MTD-Approximation, wie zuvor) → Mock.
  - Wenn Yahoo kippt, ist die Logik weiter funktionsfähig, nur mit weicheren Returns.
- **News-Sentiment:** Finnhub `/company-news` pro Aktie + `/news?category=crypto` als Sammel-Score für alle Krypto-Assets. Lexikon-basiertes Scoring (DE/EN) liefert eine 0-100-Zahl, die in `signal.sentiment` einfließt. Die Asset-Detail-Seite rendert die letzten 6 Headlines pro Asset inkl. Klassifikation (+/-/·) als Transparenz-Layer. Ohne `FINNHUB_API_KEY` bleibt der Default (60) erhalten. Das Lexikon ist klein und absichtlich konservativ — eine LLM- oder VADER-basierte Auswertung ist als Folge-Iteration möglich.

## Reviews & Trefferquote
- Der tägliche Cron-Job (`runDailyReview`) prüft Empfehlungen, die exakt **7 bzw. 30 Tage alt** sind (`horizon_days` in `recommendation_reviews`). Frühere Versionen reviewten am Folgetag, was nur Tagesrauschen gemessen hat.
- Beide Horizonte landen in `recommendation_reviews` mit `review_date` = heute und `horizon_days` ∈ {7, 30}. Migration: `db/migrations/004_review_horizon.sql`.
- `getHitRates()` bucketiert nach Horizont (`{ horizon7, horizon30 }`) und liefert `rate` + `sampleSize`. `HitRateTile` rendert die beiden Buckets. Solange noch keine 7d/30d-Reviews vorliegen, zeigt jede Kachel einen klaren Hinweis.
- Alte Reviews aus dem alten 1-Tages-Pfad (Spalte `horizon_days = NULL`) bleiben in der Tabelle erhalten, werden aber für die Hit-Rate-Berechnung ignoriert.

## Nächster Schritt
- Supabase Auth aktivieren (single-user access).
- Sentiment-Modell auf VADER/LLM upgraden, sobald die naïve Lexikon-Heuristik zu rauschig wird.
