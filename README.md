# Trading Decision Support App

Produktionsnahe Next.js-App für tägliche Krypto-/Aktienanalyse (transparente Entscheidungsunterstützung, **keine Finanzberatung**).

## Setup
1. `npm install`
2. `.env.local` anlegen:
   - `NEXT_PUBLIC_SUPABASE_URL=`
   - `SUPABASE_SERVICE_ROLE_KEY=`
   - `COINGECKO_API_KEY=` (optional)
   - `FINNHUB_API_KEY=` (optional)
   - `NEWS_API_KEY=` (optional)
3. Migration laufen lassen mit deinem Postgres/Supabase-Workflow.
4. `npm run dev`

## Architektur
- `app/` Dashboard + Asset-Detail + Cron API Route
- `lib/analysis` transparentes Scoring-Modell (Krypto/Aktien)
- `lib/data/mock.ts` Mock-Daten solange keine API-Keys vorhanden sind
- `db/migrations/001_init.sql` Datenbankstruktur

## Daily Automation
- Scheduled job ruft `GET /api/cron/daily-report` täglich auf.
- Route erzeugt aktuell Mock-Report und markiert klar `source: mock`.

## Nächster Schritt
- Supabase Auth aktivieren (single-user access)
- Real-Data Provider in `lib/providers/*` ergänzen
- Recommendation-Review Persistenz und Trefferquoteberechnung verbinden
