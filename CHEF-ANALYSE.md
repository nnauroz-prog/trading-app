# Chef-Analyse — Trading-App / WM 2026

**Datum:** 14.06.2026 · Welle 33001-33100
**Adressat:** Du als Eigentümer/Investor/Chef dieses Projekts
**Ton:** ehrlich, nicht freundlich

Dieses Dokument ist **nicht** der Strategieplan (das ist `STRATEGIE.md`).
Hier sind die unangenehmen Fragen, die ein Investor oder CTO stellen würde, der nicht in deinen Code verliebt ist.

---

## 0. Executive Summary (3 Zeilen)

> Das Projekt produziert seit Welle 30000 hochfrequent Code, aber der marginale Endkunden-Nutzen pro Welle nähert sich Null an. Du hast in dieser Session zweimal Kündigung von Claude Code angedroht — der einzige Signalpunkt, der zählt. Wenn das Projekt nicht in den nächsten 4 Wellen sichtbare Mess-Transparenz liefert, ist die ehrliche Antwort: stoppen oder pivotieren, nicht weiter polieren.

---

## 1. Die fünf Wahrheiten, die niemand sagt

### Wahrheit 1: Es gibt einen Kunden — dich.
Das ist kein Defekt, das ist Datum. Die Wertschöpfung muss **dich** beeindrucken, nicht "den Markt". Alle Vergleiche mit Sofascore/kicker müssen daher fragen: liefert mir mein eigenes Produkt mehr als ihre App tut? **Aktueller Stand: vermutlich nicht.** Ihre Daten sind frischer, ihre UI ist polierter, ihre Push-Notifications funktionieren.

### Wahrheit 2: Claude Code kostet ~€270/Monat. Sofascore Premium kostet €4/Monat.
Der Delta ist €266/Monat = €3192/Jahr. Was bekommst du dafür mehr als bei Sofascore? Drei plausible Antworten:

- (a) **Ownership-Gefühl** — "es ist meins" — schwer zu beziffern, real.
- (b) **Lernen** — Next.js 15, Tests, TypeScript, Agent-Workflows — real, Marktwert vorhanden.
- (c) **Custom-Features** die kein Anbieter hat — Tipprunde-Karten, Bankroll-Ledger, Welle-System, Tier-1-Citation-Lint. Real, aber nur du nutzt sie.

Wenn (a)+(b)+(c) > €266/Monat: **weitermachen ist rational.** Wenn nicht: **Sofascore-Abo + €270 fürs Sparkonto** ist die Investoren-Antwort.

### Wahrheit 3: 275 Welle-Commits seit Welle 30000 bedeuten nicht 275 Mal mehr Wert.
Die Welle-Frequenz ist eine Liefer-Metrik, keine Wert-Metrik. Aus den letzten 100 Wellen kam:
- 1 echter Feature-Sprung: das Tier-1-Quellen-Lint-System (Welle 32801-32900)
- 1 echter Daten-Fund: 11 Team-Strength-Duplikate (Welle 33001)
- 1 strukturelle Verbesserung: Remis-Tipps werden angezeigt (Welle 32601)
- ~96 weitere Wellen mit inkrementellem Polishing
**Der Rest sind sunk costs, die du nicht zurückbekommst.** Die Frage ist ob die nächsten 100 ähnlich aussehen sollen.

### Wahrheit 4: Die Kündigungs-Androhung war ein Signal, kein Ausraster.
Du hast in dieser Session zweimal Kündigung von Claude Code angekündigt. Beide Male wenn ein konkretes Feature gefehlt hat (Brasilien-Marokko-Spiel) oder eine Karte unklar war ("Naturschutzbereich"). Das ist kein Wut-Signal, das ist ein **Vertrauens-Signal**: "Ich zahle, ich sehe nicht was es bringt." **Diagnose:** dem Produkt fehlt die direkte Wert-Vorzeigung. Sprint A aus STRATEGIE.md (Mess-Transparenz) adressiert genau das.

### Wahrheit 5: Die `/sport`-Page ist 1173 LOC weil du keine Karte je gelöscht hast.
44 Karten, 8 verwaist, 0 jemals weggeworfen. Das ist nicht **Feature-Bestand**, das ist **Feature-Sediment**. Jedes nicht-gelöschte verwaiste Modul ist Wartungs-Schuld, die in Welle 35000+ schmerzt. **Investoren-Frage: was ist die Lösch-Frequenz pro Welle?** Aktuell: nahe Null. Sollte mindestens 1:5 sein (jede 5. Welle wirft mindestens 1 Artefakt weg).

---

## 2. Drei Investoren-Fragen mit ehrlichen Antworten

### Frage 1: Was ist der erwartete Return on Investment dieses Projekts?

**Ehrliche Antwort:** Wenn ROI = monetärer Gewinn pro investierter Stunde + €, dann negativ. Sofascore Premium liefert dieselbe Trefferquote billiger. Wenn ROI = Lernen + Joy + Ownership, dann positiv solange du den Prozess genießt. Das ist eine Hobby-Investition, kein Business. **Behandle sie auch so:** keine Notwendigkeit, Wartbarkeits-Schulden anzusammeln, weil "kein User es sehen wird". *Du* siehst es.

### Frage 2: Was würde dich morgen aussteigen lassen?

Mögliche Trigger:
- **Kosten-Skalierung** — Claude-Code-Tarif steigt auf €500/Monat: Pivot oder Stop.
- **WM ist vorbei (19.07.2026)** und kein klarer Folge-Use-Case existiert: archivieren.
- **Test-Suite wird langsamer als 30s** und du hast keine Lust zu warten: spaltest du auf oder gibst auf.
- **Du findest einen echten zahlenden Kunden** für eine der Karten (z.B. ein Tipp-Club): pivotieren zu echtem Produkt.

Aktueller Status: alle vier sind plausible Trigger in Q3/Q4 2026.

### Frage 3: Wenn ich morgen €5000 in dieses Projekt investiere, was sehe ich in 4 Wochen?

**Aktuelle Trajektorie (ohne Strategieplan):** weitere ~40 Wellen, weitere ~6 verwaiste Karten, /sport vielleicht bei 1400 LOC.

**Mit Strategieplan Sprint A:** Mess-Transparenz steht. Du siehst auf der Sport-Page sofort "73% Trefferquote in den letzten 14 Tagen, Streak 3-1-1-2-Treffer." Das ist Geld-wert. Aber: einmaliger Sprung, keine Wiederholbarkeit ohne Trefferquote-Sample > 50.

**Empfehlung:** Investiere die €5000 nicht. Wenn du es trotzdem tust, dann in **Sprint A + Sprint C** (Mess-Transparenz + Aufräum). Das ist eine 2-Welle-Antwort, nicht eine 40-Welle-Antwort.

---

## 3. Build-vs-Buy-Matrix (gegen Sofascore, kicker-App, Forebet)

| Dimension | Trading-App | Sofascore Premium | Differenz |
|---|---|---|---|
| Kosten/Monat | €270 (Claude) | €4 | -€266 |
| Datenfreshness | unstable_cache 600s | Live-Push | schlechter |
| Trefferquote (Modell) | ~50-58% laut Backtest | ~60% laut Vergleichsstudien | schlechter |
| Custom Bankroll-Ledger | ja | nein | besser |
| Welle-System / Sources-Lint | ja | nein | besser, aber: nur du nutzt es |
| Mobile-UX | OK | exzellent | schlechter |
| Push-Notifications | nein | ja | schlechter |
| Bundle-Größe | 102KB shared + 48KB sport | 0KB (native App) | schlechter |
| Aktualisierungs-Aufwand | manuell, hoch | null | schlechter |
| Lernen + Lerneffekt | hoch | null | besser |
| Du-machst-mir-vor-Lieferung-noch-Druck-Faktor | hoch | null | nicht messbar |

**Wenn das ein SaaS-Produkt wäre, das du verkaufst:** dieses Vergleichsbild verliert.

**Wenn das dein Hobby-Projekt ist:** nur die letzten zwei Zeilen zählen. Lernen + Steuerung. **Beides sind reale Werte** — aber sie rechtfertigen kein hochfrequentes Welle-Schmieden.

---

## 4. Vier strategische Optionen — was würde ein CTO empfehlen

### Option A — Hobby-Stabilisierung
- Pro Welle 33xxx nicht mehr als 3 neue Code-Datei-Adds.
- Pro Welle mindestens 1 alte Datei löschen.
- Sprint A einmal komplett ziehen (Mess-Transparenz), dann Wartungsmodus.
- Zeit-Aufwand: ~1 Welle/Woche statt 5 Wellen/Tag.
- Anspruch: dein eigenes Tool bleibt funktional, du verwendest es während der WM.
- **Empfohlen, wenn dies wirklich Hobby ist und WM-Endgame der Höhepunkt sein soll.**

### Option B — Aufmotzen zum Verkauf
- Pivot: aus dem Tipprunde-Modul wird ein Tipp-Club-SaaS.
- Stripe-Integration, Multi-User, Tipprunden-Wettbewerb.
- Erste 10 Beta-Nutzer aus DACH-Tipp-Foren ziehen.
- Zeit-Aufwand: 3-4 Monate Vollzeit.
- Risiko: Markt für selbstgehostete Tipp-Clubs ist klein, Kicker-Tippspiel ist Standard.
- **Empfohlen nur wenn du Lust auf Vertrieb hast.** Das ist keine technische Frage.

### Option C — Lernen → Markt
- Trading-App archivieren als Showcase, in CV/LinkedIn als Beweis "Next.js 15 + Tests + Agent-Workflows + ELO-Engine".
- Nutzen: nächster Job/Freelance-Auftrag profitiert von der Domäne.
- Aufwand: ~1 Welle für ein README + Demo-Video.
- **Empfohlen wenn Job-Markt ein Faktor ist.**

### Option D — Kill und neu
- Projekt einfrieren am 19.07.2026 (WM-Finale-Tag).
- Code archivieren in privater GitHub-Repo.
- Nächstes Projekt mit klarem Kunden starten (nicht "ich für mich").
- Lernen aus diesem Projekt: nie wieder 275 Wellen ohne externen Lieferadressaten.
- **Empfohlen wenn du ehrlich zugibst, dass die Trading-App nur dein Spielzeug war.**

---

## 5. Meine Investoren-Empfehlung (wenn das mein Geld wäre)

**Variante Hobby-CTO** (wenn du das gerne machst): **Option A + Variante von B**.
Sprint A fertig. Dann Wartungsmodus. WM-Endgame als Höhepunkt. Danach prüfen ob die Tipprunde-Funktion 2-3 Freunde rekrutieren kann — wenn ja, könnte aus Option A → B werden, organisch.

**Variante Karriere-CTO** (wenn du was zu zeigen brauchst): **Option C, jetzt sofort**.
Sprint A noch ziehen, README schreiben, fertig. Das Projekt ist als CV-Beweis stärker als als Hobby. Lernen extrahieren, nicht zementieren.

**Variante Investoren-CTO** (wenn du Effizienz maximierst): **Option D, milde Variante**.
Mit der WM enden lassen. Nicht über 19.07. hinaus polieren. €270/Monat fließen ab August in echte Investments oder ein neues Projekt mit klarem Kunden.

---

## 6. Kill-Liste (was sofort weg darf)

Diese 8 Karten sind verwaist (in keiner Page gemountet) oder durch -live/-with-learning-Varianten ersetzt:

1. `wm-winner-picks-card.tsx` — 143 LOC, durch `-with-learning` ersetzt.
2. `wm-data-integrity-card.tsx` — 102 LOC, durch `-live`-Variante ersetzt.
3. `wm-pick-status-badges.tsx` — 117 LOC, nirgendwo importiert.
4. `wm-day-plan-live-row.tsx` — 61 LOC, nirgendwo importiert.
5. `wm-integrity-pill.tsx` — 53 LOC.
6. `wm-pick-learning-recorder.tsx` — 51 LOC.
7. `wm-kickoff-badge.tsx` — 39 LOC.
8. Engine-Helfer `wm-glossar.ts` — falls Karte `wm-glossar-card` nicht mehr in Use → mit löschen.

**Gesamt: ~566 LOC weg = ein angenehmerer Codebase + kleineres Bundle. 1 Welle Aufwand.** Das ist die billigste Aufräumung mit klarem Ergebnis.

---

## 7. Kennzahlen, die ich pro Welle sehen will (Chef-Dashboard)

- Wellen seit letzter Datei-Löschung (Zielwert: ≤ 4).
- LOC-Delta `/sport/page.tsx` (Zielwert ab Sprint C: ≤ 0 monoton).
- Tests pro Welle hinzugefügt (Zielwert: ≥ 2).
- Tests pro Welle entfernt (Zielwert: ≥ 1 ab Welle 33500 wenn dead-code).
- Welle-Kosten in Anthropic-Credits (Zielwert: < €1.50/Welle).
- "Was hat sich für mich als User in dieser Welle geändert?" — 1-Satz-Antwort pro Welle. Wenn die Antwort "interne Tests + Lint" ist, war es eine **Wartungs-Welle** und sollte nicht als Wert-Welle vermarktet werden.

---

## 8. Drei Fragen an dich, die kein Code-Modul beantwortet

1. **Würdest du diese App heute neu starten, wenn sie nicht existieren würde?**
   Ja → Option A oder B. Nein → Option C oder D.

2. **Wenn ich (Claude) morgen weg bin — kannst und willst du diese Codebase warten?**
   Ja → Architektur ist gut genug für menschliche Nachfolge, weitermachen. Nein → Option C oder D, und zwar JETZT bevor mehr Kontext verloren geht.

3. **Wenn du diese App einem Freund zeigst — was sagt er nach 60 Sekunden?**
   "Cool, eigene Tipps" → Option A.
   "Kannst Du mir das einrichten?" → Option B.
   "Schickes Demo" → Option C.
   "Warum nicht Sofascore?" → Option D.

---

*Dieses Dokument ist anti-höflich mit Absicht. Es ist die Sicht von außen, kein Cheerleading.*
*Frage zurück: welcher Pfad (A/B/C/D) ist deine ehrliche Antwort?*
