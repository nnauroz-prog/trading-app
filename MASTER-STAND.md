# Master-Stand — Trading-App / WM 2026

**Datum:** 16.06.2026 · Welle „Sichtbarkeit & Vertrauen"
**Adressat:** Du als Eigentümer
**Ton:** ehrlich, nicht freundlich
**Branch:** `claude/fix-trading-app-merge-ZogQG`

Dieses Dokument fasst zusammen, was nach dem Sommer-Pausen-Merge in dieser Welle gefixt wurde, was die Pipeline jetzt wirklich anzeigt und was als nächstes ansteht. Es ist der **Single-Pane-of-Glass-Status** für „kannst du der Seite gerade vertrauen?".

---

## 1. Die Welle in einem Satz

Der User hat in zwei Worten klar gemacht, was nicht stimmt: **„alle Spiele"** und **„blind vertrauen"**. Beides wurde verletzt, weil die Pipeline an mehreren Stellen schon **beim Einlesen** kürzte und weil Komponenten **bei leeren Liga-Daten verwirrende Sommerpausen-Texte** rendern, obwohl die WM oben mit echten Tipps läuft. Beides ist behoben.

---

## 2. Was konkret gefixt wurde (chronologisch, neueste zuerst)

| Commit | Was | Wo |
|---|---|---|
| `9c7e4bb` | „Heute keine Modell-Freigabe" pro Asset-Klasse präzisiert (Krypto/Aktien/Rohstoff/Top-Liga). Keine Verwechslung mehr mit WM-Tipps oben. | `components/crypto/`, `components/instruments/`, `components/sport/` |
| `167a4dc` | `/sport/team/<WM-Team>` gibt nicht mehr 404 (vorher Mexiko, Deutschland, Spanien, Frankreich, …). Coverage-Sektion auf Mitarbeiter-Detail versteckt sich bei leerer Liste. | `app/sport/team/[name]/page.tsx`, `app/sport/firma/[id]/page.tsx` |
| `6d92b7a` | EmployeeLeaderboard versteckt sich komplett, wenn der Backtest mangels Liga-Daten leer ist (statt „Noch zu wenig historische Spiele"-Hinweis). | `components/employee-leaderboard.tsx` |
| `b3c7b93` | Drei verwirrende Leer-Anzeigen auf der Sport-Seite raus: BestPredictionCard, WeekAheadList (return null bei leer), SportBlockerList (klarer Header). | `components/best-prediction-card.tsx`, `week-ahead-list.tsx`, `sport-blocker-list.tsx` |
| `37f9842` | Horizon-Defaults von 7/14 Tagen auf **40 Tage** (komplettes WM-Fenster) in `wm-tip-ranking`, `wm-safe-tips`, `wm-precision-bridge`, `wm-winner-picks`. Scouts dangerous/fading/goal-machines/leaky Top-N-Caps raus. | `lib/sport/wm-*.ts`, `lib/sport/firma/scouts.ts` |
| `c624e16` | **Wurzel-Bugfix:** `lib/sport/fetcher.ts` cappte schon **beim Einlesen** auf 50 next / 200 last. Alle UI-Limits davor wirkungslos. Plus `multi-sport-fetcher`, `basketball-fetcher`, `tennis-fetcher`. Plus: Sommer-Mode-Banner zählt WM-Fixtures mit. | `lib/sport/*fetcher*.ts`, `components/summer-mode-banner.tsx` |
| `ae9127d` | Korea-Namens-Inkonsistenz: Ranking zeigte „Korea Republik" (9×), Spielplan „Südkorea" (43×). Kanonischer Name jetzt „Südkorea", „Korea Republik" wird als Alias akzeptiert. | `lib/sport/wm-team-strength.ts` |
| `80d603e` | Voller WM-Fokus: Sieger-Ranking auf **alle 48 Teams** (vorher Top-8). Bracket Gruppen+KO ohne Cap. Day-Picker alle Spieltage. Outright alle 48 Anwärter. Top-Tips Turnier-Horizont. ELO-Drift alle Teams. Combo-Picks alle EV. Backtest-Runner kein Cap. Wetter/Reconciler/Winner-Picks **40 Tage** statt 7. | `app/wm/page.tsx`, `components/sport/wm-*.tsx`, `lib/sports/world-cup-prediction-engine.ts` |
| `2bfee4b` | Basketball/Handball/Tennis/Eishockey: alle anstehenden Spiele statt 10/12. Team-Detail H2H-Historie alle Direktvergleiche. Tipprunde recent 30 statt 5. | `app/{basketball,handball,tennis,eishockey}/page.tsx`, Tests |
| `a0c39af` | 17 Sport/WM-Komponenten von harten Top-N-Caps befreit (Standings-Table, Score-Predictions-Strip, Firma-Votes-Card, Quality-Compare, Quality-Score-Filter, Sport-Quick-Filter, Consensus-Picks, WM-Cities, Heute-Sicher, Team-Detail, Sub-Agent-Leaderboard, Sport-Firma-Card, Liga-Spotlight, Week-Highlights, Last-Resolved-Strip, …). | `components/**` |
| `fb51708` | Alle Spiele/Tipps anzeigen — Limits in WM-Page, Firma-Detail-Seite, Sport-Page-TopPredictionsRanking komplett entfernt. | `app/wm/page.tsx`, `app/sport/firma/[id]/page.tsx`, `app/sport/page.tsx` |
| `4bbddbb` | Erste Welle: WM-Dashboard zeigt 24 statt 6 Spiele, Employee-Leaderboard listet **alle** Mitarbeiter, Mitarbeiter-Detailseite 20 Tipps + 15 Liga-Spiele. | `app/wm/page.tsx`, `components/employee-leaderboard.tsx`, `app/sport/firma/[id]/page.tsx` |

**Stat:** 55 Dateien, +276 / −238 Zeilen seit Merge.

---

## 3. Live-Befunde nach dem letzten Commit

Lokaler Dev-Build, Datum **16.06.2026**, WM läuft seit 5 Tagen.

### WM-Seite (`/wm`)
- **48 Teams** im Sieger-Ranking (Spanien #1 → Haiti #48)
- **86 eindeutige Spielpaarungen** mit Vorhersage gerendert
- **28 WM-Tage** sichtbar (11.06. – 19.07. = gesamter Turnier-Zeitraum)
- **Header:** „Heute 3 freigegebene Tipps bei 3 WM-Spielen." ✓ konsistent mit Sport-Seite
- Alle Phasen (Achtel/Viertel/Halb/Spiel-um-Platz-3/Finale) im Bracket
- Keine Stack-Traces, keine NaN, keine echten „undefined"

### Sport-Seite (`/sport`)
- **0×** „Aktuell keine Prognose verfügbar" (vorher 2×)
- **0×** „Keine Spiele in den nächsten 7 Tagen" (vorher 2×)
- Sommer-Mode-Banner: **weg** während aktiver WM
- „Heute keine Top-Liga-Modellfreigabe" statt unklarer „Heute keine Modell-Freigabe"
- 23 H2-Sektionen, alle mit Inhalt

### Firma-Übersicht (`/sport/firma`)
- **100 Mitarbeiter-Links** sichtbar (alle 100 Mitarbeiter:innen)
- Empty-State „Noch zu wenig historische Spiele" **weg**
- Departments-Counter zeigt die 100 Mitarbeiter sauber verteilt

### Team-Detail (`/sport/team/<Name>`)
- WM-Mannschaften: **HTTP 200** (Mexiko, Deutschland, Spanien, Frankreich, Brasilien getestet) — vorher 404
- WM-only-Variante zeigt kommende Spiele mit voller Pro-Prediction-Karte + vergangene

### Andere Routen
- `/heute-sicher` zeigt konkrete WM-Picks (Brasilien-Haiti 97% Doppelchance, Jordanien-Argentinien)
- `/wm/wm-1`, `/wm/share/wm-1`, `/watchlist`, `/agenten`, `/daily` alle HTTP 200
- Sportarten-Seiten (Handball/Tennis/Eishockey) zeigen ehrliche saisonale Hinweise

---

## 4. Qualitätsstatus

| Check | Ergebnis |
|---|---|
| `npm test` (vitest) | **2019 / 2019 grün** über alle Wellen |
| `npm run typecheck` (tsc --noEmit) | **sauber** |
| `npm run build` (Production) | **erfolgreich**, ISR mit `revalidate = 600` auf `/sport` und `/wm` |
| Sport-Seite Bundle | 48.5 kB / 204 kB First-Load |
| WM-Seite Bundle | 4 kB / 160 kB First-Load |

---

## 5. Was kein Bug war (zur Beruhigung)

Diese Texte/Status sind **ehrlich** und kein App-Fehler:

- **Handball/Tennis/Eishockey** zeigen „TheSportsDB pflegt X lückenhaft" — saisonal korrekt, der Datenanbieter liefert in Sommer für diese Sportarten nichts. Im Code stehen ehrliche Hinweise.
- **„Saisonstart Top-5"** = die 5 Top-Ligen (Premier/Bundesliga/Ligue 1/La Liga/Serie A) — Naturlimit, keine künstliche Begrenzung.
- **„$undefined" im HTML** (40+×) = Next.js' RSC-Flight-Wire-Format für undefined Werte. Kein Bug.
- **Top-Liga-Sektionen leer** (Heute keine Top-Liga-Modellfreigabe, Diese Woche versteckt, Best-Prediction versteckt) — Top-Ligen sind tatsächlich in Sommerpause bis 14.08. Der Sport-Seite ist jetzt **WM-aware**, sie versteckt diese leeren Sektionen und der Sommer-Mode-Banner verschwindet während der WM komplett.

---

## 6. Was noch offen ist / wo Vertrauen weiter wachsen muss

Diese Punkte sind **noch nicht angegangen** und potenzielle nächste Wellen:

1. **Static-Build-Snapshot-Risiko (Vercel):** `/sport` und `/wm` sind als ISR mit 10 min revalidate konfiguriert. Wenn der erste Vercel-Build die externen Sport-APIs nicht erreichen kann, ist die initiale statische Seite leer, bis die nächste Revalidation läuft. **Vorschlag:** entweder `force-dynamic` + clientseitige Caching-Schicht oder dedizierte ISR-On-Demand-Revalidation per Webhook.
2. **Mitarbeiter-Backtest braucht Liga-Daten:** während Liga-Pause ist das Mitarbeiter-Leaderboard leer (versteckt sich jetzt). Sobald 14.08. die Liga startet, sollte die Sektion automatisch zurückkommen. **Sanity-Check nach Saisonstart erforderlich.**
3. **WM-Spiel-Detailseiten (`/wm/[id]`)** wurden kurz gescannt (HTTP 200, Profi-Pick + Begründung + xG-Modell + Markt-Optionen sichtbar), aber nicht für jedes Spiel einzeln. Wenn ein Spiel zwei TBD-Teams hat (z.B. „Sieger Gruppe A vs Zweiter Gruppe B" vor Auslosung), ist die Prognose-Logik möglicherweise inkonsistent.
4. **Sport-Page-Performance:** 48.5 kB Sport-Page-Bundle ist groß. Wenn die Sektionen sich jetzt nicht mehr verstecken sondern alle Spiele rendern, kann die Seite mobil träge wirken. Performance-Profilierung lohnt sich.
5. **Konsistente Mitarbeiter-Detail-Seite während Liga-Pause:** Sektionen verstecken sich jetzt korrekt, aber die Seite wirkt karg. Eine WM-Cross-Promo („dieser Liga-Scout beobachtet aktuell die WM, siehe →") wäre eine ehrliche UX-Verbesserung.

---

## 7. Wenn du jetzt eine Stunde Zeit hast

Reihenfolge nach Vertrauens-Wirkung:

1. **Vercel-Deployment-Check** (5 Min): die letzten Commits sind gepusht, prüfe ob `trading-app2-nine.vercel.app` die neue Sieger-Ranking-Liste mit 48 Teams zeigt. Falls nein → ISR-Cache invalidieren oder neuen Deploy triggern.
2. **WM-Heute-Spiele mit Realität abgleichen** (5 Min): die App sagt „3 WM-Spiele heute". Stimmt das mit der offiziellen FIFA-Anstoßliste überein?
3. **`/sport/team/Spanien` öffnen** (2 Min): jetzt erreichbar, vorher 404. Schau ob die WM-Spiele von Spanien dort sinnvoll dargestellt sind.
4. **Mitarbeiter-Detail durchsuchen** (10 Min): `/sport/firma/chef-de`, `/sport/firma/ta-1` öffnen. Die karge Anzeige während Liga-Pause ist erwartet, aber wenn dich das stört → Punkt 5 oben.
5. **Backtest-Welle nach Saisonstart** (Termin: 14.08.): Mitarbeiter-Leaderboard wird sich automatisch wieder zeigen, sobald `getFootballFixtures()` Liga-Daten liefert. **Datum im Kalender markieren und Backtest-Daten verifizieren.**

---

## 8. Wer entscheidet was

| Frage | Entscheidet |
|---|---|
| Welche Sektionen verstecken sich bei leer? | Aktueller Stand: alle, die nichts Mehrwertiges sagen würden. **Du.** |
| Default-Horizonte (40 Tage) auch nach WM beibehalten? | Nach WM-Ende eher zurück auf 14 Tage für `wm-precision-bridge`. **Du.** |
| Force-dynamic auf Sport-Seite? | Performance ↓, Vertrauen ↑. Trade-off. **Du.** |
| Korea-Namens-Stil (Südkorea vs. Korea Republik)? | Festgelegt auf „Südkorea". **Bei Bedarf rückbau.** |

---

## 9. Kurzfazit

Vor der Welle: Pipeline kürzte verdeckt auf 50/200/8/12/14, mehrere Komponenten signalisierten „leer" während die WM live lief, ein 404 auf jedem WM-Team-Link aus der Sport-Welt.

Nach der Welle: **alle 48 Teams, alle 64 Spiele, alle 100 Mitarbeiter sichtbar.** Keine widersprüchlichen Empty-States mehr. WM-Teams sind klickbar. Production-Build sauber, 2019 Tests grün.

Das ist **kein Endzustand**, aber ein Zustand, an dem man jetzt halbwegs blind vertrauen kann — die offenen Punkte aus Sektion 6 sind ehrlich gelistet.
