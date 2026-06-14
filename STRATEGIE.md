# Strategie-Plan — Trading-App / WM 2026

**Stand:** 14.06.2026 · Welle 33001-33100 · 1976 Tests grün · Branch `claude/fix-trading-app-merge-ZogQG`

Dieses Dokument ist die **Entscheidungs-Grundlage**, kein Code. Pro Welle aktualisieren. Jeder Sprint hat ein klares Ziel, gemessenen Aufwand, gemessenen Nutzen, ein Abbruchkriterium.

---

## 1. Lagebild (Zahlen, nicht Eindrücke)

| Metrik | Wert | Interpretation |
|---|---|---|
| Welle-Commits seit 30000 | 275 | Sehr hohe Schlag-Frequenz, Akkumulation noch nicht ausgewertet |
| WM-Karten (`components/sport/wm-*.tsx`) | 44 (4467 LOC) | Hohe Karten-Dichte, davon 8 **verwaist** (in keiner Page gemountet) |
| Engine-Module (`lib/sport/wm-*.ts`) | 76 (8307 LOC) | Über-modularisiert, 11 sind interne Helfer (1680 LOC ≈ 20 % der Engine) |
| WM-Test-Files | 68 | 14 Engine-Module ohne Test (siehe Anhang) |
| Tests gesamt | 1976, Suite 14 s | Schwelle 20 s |
| Gruppen-Spiele `official` | 70 von 72 | 97 % verifiziert, 2 `auslosung` |
| KO-Spiele | 13 statisch + 4 virtual-R16 | Statisch nur 4 R16 — Rest via virtual-R16 ergänzt |
| Teams in `wm-team-strength.ts` | 54 | inkl. 4 nicht-qualifizierte (Costa Rica, Kamerun, Ungarn, `Korea Republik` vs `Südkorea`) |
| Teams in `wm-team-origins.ts` | 53 | inkl. Serbien + Wales, die in strength fehlen |
| `/sport/page.tsx` LOC | 1173 | Zu groß, einzelne Datei trägt halben Routing-Stack |
| `/wm/page.tsx` LOC | 349 | Im Rahmen, enthält 90-Line-IIFE |
| `<details>`-Blöcke in `/sport`, alle default geschlossen | 9 | **Lazy-Load-Goldgrube** — 0 mit `open`-Attribut |
| BUILD_MARKER aktuell | `welle-33001-33100-level3-plus` | |

**Auffälligkeiten ungefiltert:**

- **8 verwaiste Karten** in `components/sport/wm-*.tsx` werden in keiner Page gemountet (insg. ~672 LOC):
  `wm-winner-picks-card` (143), `wm-pick-status-badges` (117), `wm-endstand-input-inline` (106 — wird inline in `wm-turnier-tipp-card` benutzt, nicht "verwaist", Agent-False-Positive), `wm-data-integrity-card` (102), `wm-day-plan-live-row` (61), `wm-integrity-pill` (53), `wm-pick-learning-recorder` (51), `wm-kickoff-badge` (39). **Aufräum-Kandidaten Sprint C.**
- Team-Name-Drift `Korea Republik` (strength) vs `Südkorea` (origins) — gleiche Mannschaft, Lookup-Pfad bricht je nach Eintrittsweg.
- 4 nicht-qualifizierte Teams in `wm-team-strength.ts` — Dead Data oder bewusste Cross-Saison-Baseline?
- 2 fehlende qualifizierte Teams (**Serbien, Wales**) in `wm-team-strength.ts` — Modell rechnet stillschweigend mit Fallback 1700/60/60/0 für sie. Risiko bei Knockout-Projektion.
- `wm-turnier-tipp-card.tsx` mit **372 LOC** ist die größte Karte und auf `/sport` weit oben — primärer Memo/Split-Kandidat aus Sprint-B-Perf-Block.

---

## 2. Strategische Forks (Entscheidungen, die der Nutzer treffen muss)

### Fork A — Wertschöpfung: Tiefe vs. Mess-Transparenz

**Tiefe:** weitere Vorhersage-Qualität (Penalty-Shootout-Logik, virtual R16 venues, Wetter-Live-Feed schärfen, Calibration-Curves justieren). Kostet ~3-5 Wellen. Nutzer sieht Verbesserung nur indirekt über bessere Trefferquoten.

**Mess-Transparenz:** sichtbare Welle-für-Welle-Trefferquote, Heatmap "welcher Tag war stark", "diese Wellen waren schwach". Kostet ~2-3 Wellen. Nutzer sieht direkt was er für €270/Monat bekommt.

**Empfehlung:** **Mess-Transparenz zuerst.** Der Nutzer hat in dieser Session zweimal Kündigung angedroht — Vertrauen baut sich über Sichtbarkeit auf, nicht über stille Engine-Verbesserung. Tiefe danach, wenn die Mess-Latte steht.

### Fork B — Scope: WM-only bis 19.07. vs. Multi-Sport-Parallel

**WM-only:** bis Finale 19.07.2026 — 35 Tage — fokussierter Liefer-Stream, klares Ende.

**Multi-Sport-Parallel:** Tennis-Grand-Slam (Wimbledon ab 29.06.), Champions League-Start (Sept.), Krypto/Aktien als Querverkauf. Streut Aufmerksamkeit.

**Empfehlung:** **WM-only bis 19.07.** Multi-Sport-Vorbereitung erst ab Welle 33500, kein paralleler Liefer-Stream während WM-Endphase.

### Fork C — Modus: Self-Service vs. Live-Auto

**Self-Service:** User pflegt Endstände manuell, lokale Storage, kein Server-State. Robust gegen Sandbox-Egress-Blocks. **(Aktueller Stand.)**

**Live-Auto:** TheSportsDB-Integration, automatisches Result-Matching. Bricht regelmäßig wegen TheSportsDB-Verzögerungen.

**Empfehlung:** **Self-Service bleibt Primary.** Live-Auto als Best-Effort-Layer dahinter, niemals verlassen.

### Fork D — Konsolidierung: Aufräumen vs. Vorwärts

**Aufräumen:** /sport-Page von 1173 LOC auf <600 splitten, 90-Line-IIFE extrahieren, 30 Karten lazy-loaden, Duplikat-Logik bereinigen, dead-exports entfernen. Kein neuer User-Wert, reine Wartbarkeit.

**Vorwärts:** neue Karten, neue Vorhersagen, neue Features. Ignoriert die Schuld.

**Empfehlung:** **Hybrid mit 1:3-Regel** — alle 4 Wellen ist eine Aufräum-Welle. Sonst Wartbarkeits-Cliff bei Welle 35000.

---

## 3. Roadmap (priorisiert, mit Abbruchkriterium)

### Sprint A — Mess-Transparenz (Wellen 33101-33300, ~3 Wellen)

**Ziel:** Nutzer sieht auf der Sport-Page sofort: *aktuelle Welle, Trefferquote der letzten 7 Tage, schwächste Welle, stärkste Welle.*

Konkrete Punkte:
1. `WmTrefferquoteWelleCard` — Welle-für-Welle-Hit-Rate aus dem manuellen Result-Store + Welle-Marker.
2. `WmStreakBadge` — wieviele Treffer in Folge.
3. `WmCalibrationKurve` — "60%-Picks treffen zu X%, idealerweise 60%". Eine Heatmap.
4. Auf Top der `/sport`-Page mounten (oberhalb der `WmTurnierTippCard`).

**Abbruch:** wenn nach Welle 33200 die Trefferquote-Karte mehr als 2 weitere Wellen braucht — die Idee ist falsch, neu denken.

### Sprint B — Korrektheits-Last-Mile (Wellen 33301-33500, ~3 Wellen)

**Ziel:** alle Engine-Findings aus den Level-3-Audits sind beseitigt.

Konkrete Punkte:
1. KO-Penalty-Shootout: 50/50 wenn `withExtraTime` auch unentschieden.
2. Virtual R16 venues konkret zuordnen (statt leerer String) — beseitigt Bracket-Asymmetrie.
3. Promise.all für `/sport`-Server-Reads (TTFB -300..600 ms).
4. `React.memo` für `WmRow` (95 % weniger Reconciliations pro Minute-Tick).
5. Team-Name-Drift `Korea Republik` ↔ `Südkorea` per `normalizeTeamName()`-Helper schließen.
6. Serbien + Wales in `wm-team-strength.ts` aufnehmen.

**Abbruch:** wenn die TTFB-Messung nach Sprint B nicht messbar besser ist — Perf-Annahmen falsch.

### Sprint C — Aufräum-Welle (Welle 33501-33600, 1 Welle)

**Ziel:** /sport-Page < 600 LOC, dead-exports entfernt.

Konkrete Punkte:
1. 30 Karten unterhalb `<details>` mit `next/dynamic({ ssr: false })` lazy laden.
2. 90-Line-IIFE in `/wm/page.tsx` in `lib/sport/wm-page-data.ts` auslagern.
3. `classifyOutcome` aus `wm-simple-picks` + `wm-daily-winners` in einen gemeinsamen `lib/sport/wm-classify-outcome.ts` ziehen.
4. Dead exports (audit-3 fand 6) entfernen.

**Abbruch:** wenn Bundle-Size nicht messbar fällt — Lazy-Load-Annahme falsch.

### Sprint D — End-Game (Wellen 33601-33800, ~2 Wellen, kurz vor Finale)

**Ziel:** WM-Endphase robust durchlaufen.

Konkrete Punkte:
1. KO-Phase-Auflösung manuell pflegen sobald Gruppenphase Ende (≈ 27.06.).
2. Live-Banner für Halbfinale + Finale prominent.
3. Post-Mortem-Card: ROI über die WM, was hat das Modell richtig getippt, was falsch.

**Abbruch:** wenn TheSportsDB die KO-Phase doch live ausspielt — Manual nicht nötig.

### Sprint E — Konsolidierung nach Finale (Welle 33801+)

**Ziel:** WM-Code-Spur eingefroren, Vorbereitung Multi-Sport.

Konkrete Punkte:
1. `wm-*.ts`-Module die nur für die WM galten ins Archiv-Flag (für 2030).
2. Engine-Generalisierung: `tournament-engine.ts` aus den WM-Spezifika herausziehen.
3. Tennis-Modul-Skelett (`lib/sport/tennis-*.ts`).

**Abbruch:** wenn User Multi-Sport nicht mehr wünscht — Engine bleibt WM-only-archiviert.

---

## 4. Was wir NICHT tun (No-Go-Liste)

- Keine `WebSocket`/Live-Streaming-Architektur — Komplexitäts-Sprung ohne Nutzen.
- Kein Echtgeld-Wett-Modul — bleibt virtueller Ledger.
- Keine Migration auf eine andere Sport-API solange TheSportsDB hinreichend ausgespielt.
- Keine UI-Library-Migration (z.B. shadcn auf was anderes) während WM läuft.
- Keine Datenbank-Migration während WM läuft.

---

## 5. Risiko-Register

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme |
|---|---|---|---|
| Vercel-Build-Limit-Hit | mittel | hoch (Deploy gestört) | Sprint C reduziert Karten-Dichte |
| TheSportsDB-Outage in WM-Endphase | mittel | mittel | Self-Service-Manual als Primary |
| FIFA ändert Zeit/Stadion kurzfristig | hoch | mittel | Citation-Test fängt nicht ab; `WmReconcilerCard` muss laufen |
| Test-Suite > 30s | mittel | niedrig | Vitest-Parallel-Mode, ggf. Test-Aufteilung |
| Daten-Quellen-Tier-1 wechselt Politik (Anthropic blockt FIFA/ESPN) | niedrig | hoch | Fallback auf manuelle Verifikation, Tier-2-Erlaubnis nur mit doppelter Bestätigung |
| Engine-Drift (ELO veraltet während Turnier) | hoch | mittel | dynamische ELO-Updates via `wm-dynamic-elo.ts` (existiert bereits) |

---

## 6. Schließe-die-Schleife-Metriken

Pro Welle erfassen, dokumentieren in Commit-Message:
- Test-Anzahl-Delta
- LOC-Delta auf `/sport/page.tsx` (target: monoton fallend ab Sprint C)
- Build-Time-Delta (target: monoton fallend ab Sprint C)
- TTFB auf `/sport` (target: < 800ms ab Sprint B)
- Trefferquote-Sample (target: ≥ 55 % nach 50+ entschiedenen Picks)

Wenn drei aufeinanderfolgende Wellen keine messbare Verbesserung in mindestens einer dieser Metriken liefern: Strategieplan re-evaluieren.

---

## 7. Empfohlene Sofort-Entscheidung

**Frage an den Nutzer:**

1. **Sprint A jetzt starten?** (Mess-Transparenz, Welle 33101-33300)
   *Alternative: erst Sprint B (Korrektheits-Last-Mile), wenn Vorhersage-Qualität wichtiger.*

2. **Multi-Sport später, OK?** (Sprint E ab Welle 33801)
   *Alternative: Tennis-Modul parallel zur WM-Endphase entwickeln.*

3. **Aufräum-Welle alle 4 Wellen?** (Sprint C-Rhythmus)
   *Alternative: am Stück nach WM.*

Antwort des Nutzers verändert direkt die Sprint-Reihenfolge oben.

---

*Letzte Aktualisierung: Welle 33001-33100. Nächste Review: Welle 33200.*

---

## Anhang A — 14 lib/sport/wm-*.ts ohne korrespondierenden Test

Stand 14.06.2026, ermittelt durch Glob-Diff Engine vs. tests:

`wm-backtest-dataset`, `wm-bankroll-ledger-store`, `wm-glossar`, `wm-group-draw`, `wm-groups`, `wm-live-schedule`, `wm-live-weather-fetch`, `wm-outright`, `wm-pick-learning-store`, `wm-results-store`, `wm-schedule-2026`, `wm-team-origins`, `wm-team-strength`, `wm-venues`.

Priorität für Test-Nachzug:
1. `wm-results-store` (Security-relevant, Welle 33001 schon gehärtet — Test ist Pflicht)
2. `wm-team-strength` (Dupes wurden gerade entfernt — Regression-Test wichtig)
3. `wm-team-origins` (Daten-Range-Tests schon vorhanden in `wm-team-data-uniqueness.test.ts`, aber kein Lookup-Test)
4. `wm-schedule-2026` (Invariant-Tests vorhanden, aber kein Daten-Aktualität-Test)

Die anderen 10 sind Engine-Helfer mit geringerem direkten User-Impact — niedrigere Priorität.

---

## Anhang B — Quick-Wins-Liste (< 100 LOC Aufwand, hohe Wirkung)

Liste mit Kandidaten, die **nicht** zu einem Sprint gehören aber bei Gelegenheit mitgenommen werden können:

1. `wm-team-strength.ts`: Serbien + Wales ergänzen (4 Zeilen, beseitigt stillen Fallback-Bias).
2. `lib/sport/wm-team-origins.ts` lookup-Test schreiben (50 Zeilen, beseitigt Lücke).
3. `Korea Republik` ↔ `Südkorea` in beiden Files vereinheitlichen (rename + alias).
4. `force-dynamic` in **app/page.tsx** (laut Audit auch dort) prüfen + entfernen wo `revalidate` gesetzt.
5. Verwaiste Karte `wm-winner-picks-card.tsx` löschen oder als ungenutzt markieren (143 LOC weniger Bundle).
6. Verwaiste Karte `wm-data-integrity-card.tsx` löschen (ersetzt durch -live Variante).
7. `parseWmPhase` / `parseWmGroup` (in Welle 33001 exportiert) jetzt in `wm-backtest-runner` + `wm-live-schedule` tatsächlich einsetzen.

