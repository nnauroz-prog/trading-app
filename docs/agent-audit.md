# Agentenprüfung — 30. Oktober 2026

Geprüft wurde der lokale Repository-Stand. Die Figuren sind regelbasierte Modellrollen mit fiktiven Persönlichkeiten; 100 Profile bedeuten nicht 100 unabhängige KI-Analysten oder unabhängige Datenquellen.

## Ergebnisse

- Alle 100 Sport-Profile sowie acht zusätzliche Firmen-/Übersichtsseiten lieferten HTTP 200 und einen passenden Seitentitel. Die vollständige Liste steht unten.
- Jeder der 100 Sport-Agenten wurde einzeln mit fehlender Datenbasis und einem gültigen Modellkontext getestet: erklärtes Ergebnis, endliche Konfidenz im Bereich 0–1, keine Richtungsstimme ohne Daten.
- Liga-gebundene Agenten wurden zusätzlich gegen fremde Ligen geprüft. Behoben: Liga-Scouts und Chefs beteiligten sich zuvor trotz ihrer Liga-Bindung an fremden Spielen.
- Alle zwölf Recherche-Spezialisten melden bei fehlenden Eingaben jetzt ausdrücklich fehlende Daten. Behoben: Strategie-Auswerter verwechselte fehlende Historie mit null Trades; Makro-Beobachter leitete aus einem leeren Kalender eine zu sichere Marktaussage ab.
- Behoben: Derivate-Analyst ersetzte eine fehlende Funding-Rate rechnerisch durch null und gab teilweise „undefined“ aus. Eine einzelne negative Rate wird jetzt korrekt ausgewertet und die fehlende Rate benannt.
- Alle drei Krypto-CEOs und ihre jeweils sieben Spezialisten haben vollständige Profile. Ihre Bewertungsfunktionen werden durch die vorhandenen Sub-Agenten-/Persona-Tests geprüft.
- Aktien-, Rohstoff-, Fußball- und WM-Personas wurden jeweils für alle drei Risikoprofile ohne verfügbares Ziel geprüft. Aktien/Rohstoffe benennen fehlende Daten jetzt ausdrücklich statt einen schwachen Markt zu unterstellen.
- Die vier Prüfrollen in den Krypto- und Instrument-Desks melden ohne Eingaben keine positiven Prüfergebnisse mehr.

## Verifikation

Die Agentenprüfung bestand mit 2.405 Tests in 232 Testdateien; der erweiterte Gesamtstand mit Provider- und Live-Regressionstests bestand anschließend mit 2.415 Tests. Dazu gehören die Einzelprüfungen in `tests/agent-audit.test.ts`, die bestehenden Agenten-Tests sowie Regressionstests für Backup, Performance-Vergleich und Datenstatus. Die HTTP-Prüfung der Profile lief gegen den Produktionsserver; die nachträglichen Logikkorrekturen werden zusätzlich durch den abschließenden Build geprüft.

Der Browser-Test bestätigte Backup-Export mit WM-Notizen, Krypto-Abwarten ohne Daten, verständliche Live-Verbindungsfehler sowie Sportartwechsel und Spielstandanzeige mit ausdrücklich simulierten Live-Daten. Simulierte Antworten sind kein Beleg für die Erreichbarkeit des echten Anbieters.

## Grenzen und offene Voraussetzungen

- Zehn Transfer- und fünf Politik-Agenten haben keine angebundenen Feeds. Sie enthalten sich mit entsprechendem Hinweis; sie wurden nicht als funktionierende Nachrichtenrecherche gewertet.
- Die vorhandenen Sport-Prognosen verwenden weiterhin TheSportsDB. Der neue ESPN-Livebereich liefert Ergebnisse separat; er macht alte Prognosen nicht automatisch aktuell.
- Nach Aktivierung der Cloud-Netzwerkfreigabe antwortete ESPN erfolgreich. Fußball, NBA und NHL lieferten auch durch den lokalen App-Endpunkt echte Daten. Die Prüfung des Tennis-Originalformats führte zu zusätzlichen Tests für Turniergruppen und Satzstände. Ein lokaler Erfolg ersetzt nicht die abschließende Prüfung der Vercel-Website.
- ESPN-Abdeckung: Fußball Top-5-Ligen/Champions League/WM, NBA, NHL und ATP/WTA. Handball und weitere Ligen sind in diesem Live-Feed nicht enthalten.
- Die Prüfung belegt Funktion und Fehlerbehandlung, keine Profitabilität oder Prognosegenauigkeit. Wiederverwendete Rollenalgorithmen sind keine unabhängigen Stimmen.

## Alle Sport-Agentenprofile

Jede Zeile: HTTP-Erreichbarkeit sowie Einzeltests mit fehlenden und vorhandenen Modelldaten bestanden.

| Agent | Profil | HTTP |
|---|---|---|
| Alistair Wren | `/sport/firma/chef-en` | 200 |
| Hannes Kruger | `/sport/firma/chef-de` | 200 |
| Pilar Saavedra | `/sport/firma/chef-es` | 200 |
| Matteo Ricci | `/sport/firma/chef-it` | 200 |
| Sven-Olof Berg | `/sport/firma/chef-eu` | 200 |
| Linnea Steinmetz | `/sport/firma/gate-1` | 200 |
| Roland Vogt | `/sport/firma/pick-1` | 200 |
| Margit Wiesinger | `/sport/firma/pick-day-1` | 200 |
| Sigrid Achterberg | `/sport/firma/h2h-1` | 200 |
| Theo Lindner | `/sport/firma/ls-bl-1` | 200 |
| Robin Markwart | `/sport/firma/ls-bl-3` | 200 |
| Jana Wessels | `/sport/firma/ls-bl-2` | 200 |
| Dominic Quigley | `/sport/firma/ls-pl-2` | 200 |
| Mira Hofmann | `/sport/firma/ls-bl-4` | 200 |
| Onur Yıldırım | `/sport/firma/ls-bl-5` | 200 |
| Eleanor Whitcombe | `/sport/firma/ls-pl-1` | 200 |
| Khalid Mensah | `/sport/firma/ls-pl-3` | 200 |
| Cillian Doherty | `/sport/firma/ls-pl-5` | 200 |
| Bryony Aldridge | `/sport/firma/ls-pl-4` | 200 |
| Ramón Esquivel | `/sport/firma/ls-ll-1` | 200 |
| Iker Mendiola | `/sport/firma/ls-ll-3` | 200 |
| Carmen Pellicer | `/sport/firma/ls-ll-4` | 200 |
| Lucía Vidal | `/sport/firma/ls-ll-2` | 200 |
| Andrés Fontana | `/sport/firma/ls-ll-5` | 200 |
| Beatrice Conti | `/sport/firma/ls-sa-3` | 200 |
| Luca Bertolini | `/sport/firma/ls-sa-4` | 200 |
| Pietro Calabrese | `/sport/firma/ls-sa-2` | 200 |
| Giulia Romano | `/sport/firma/ls-sa-1` | 200 |
| Sofia Marchetti | `/sport/firma/ls-sa-5` | 200 |
| Marko Đurić | `/sport/firma/ls-cl-3` | 200 |
| Henrik Bergstrøm | `/sport/firma/ls-cl-1` | 200 |
| Alessandra Vinci | `/sport/firma/ls-cl-2` | 200 |
| Sarah Bauer | `/sport/firma/ta-1` | 200 |
| Tobias Schroeder | `/sport/firma/ta-2` | 200 |
| Christos Vlachos | `/sport/firma/ls-cl-5` | 200 |
| Adèle Chevalier | `/sport/firma/ls-cl-4` | 200 |
| Florian Vogel | `/sport/firma/ta-3` | 200 |
| Ben Lemke | `/sport/firma/ta-5` | 200 |
| Inga Eckert | `/sport/firma/ta-4` | 200 |
| Lara Naumann | `/sport/firma/ta-6` | 200 |
| Hendrik Brandt | `/sport/firma/ta-7` | 200 |
| Niko Renner | `/sport/firma/ta-9` | 200 |
| Vanessa Falk | `/sport/firma/ta-10` | 200 |
| Greta Sommer | `/sport/firma/ta-8` | 200 |
| Anika Tietz | `/sport/firma/ta-12` | 200 |
| Jonas Werner | `/sport/firma/ta-13` | 200 |
| Marcus Reimer | `/sport/firma/ta-11` | 200 |
| Lina Holzer | `/sport/firma/ta-14` | 200 |
| Mila Maas | `/sport/firma/ta-16` | 200 |
| Maja Frey | `/sport/firma/ta-18` | 200 |
| Felix Roth | `/sport/firma/ta-17` | 200 |
| Adrian Brügger | `/sport/firma/ta-15` | 200 |
| Levi Kunz | `/sport/firma/ta-19` | 200 |
| Nora Schenk | `/sport/firma/ta-20` | 200 |
| Erik Voss | `/sport/firma/ta-21` | 200 |
| Yara Kessel | `/sport/firma/ta-22` | 200 |
| Linnea Heinze | `/sport/firma/ta-24` | 200 |
| Mats Pfaff | `/sport/firma/ta-23` | 200 |
| Konrad Kröger | `/sport/firma/ta-25` | 200 |
| Saskia Stein | `/sport/firma/ta-26` | 200 |
| Olivia Krieger | `/sport/firma/ta-30` | 200 |
| Helena Decker | `/sport/firma/ta-28` | 200 |
| Jaromir Lutz | `/sport/firma/ta-27` | 200 |
| Ezra Auer | `/sport/firma/ta-29` | 200 |
| Yvonne Marquardt | `/sport/firma/fa-3` | 200 |
| Sebastián Ortega | `/sport/firma/fa-4` | 200 |
| Diego Salazar | `/sport/firma/fa-2` | 200 |
| Wibke Allendorf | `/sport/firma/fa-1` | 200 |
| Heike Tollner | `/sport/firma/fa-5` | 200 |
| Isabel Ronnefeldt | `/sport/firma/tac-2` | 200 |
| Phil Karras | `/sport/firma/fa-6` | 200 |
| Prof. Dr. Heiner Soltau | `/sport/firma/tac-1` | 200 |
| Tariq Boudjellal | `/sport/firma/tac-6` | 200 |
| Friedrich Engelhart | `/sport/firma/tac-3` | 200 |
| Casper van Velden | `/sport/firma/tac-5` | 200 |
| Rosalia Bonetti | `/sport/firma/tac-4` | 200 |
| Helga Knappek | `/sport/firma/tac-7` | 200 |
| Stojan Petrović | `/sport/firma/tac-8` | 200 |
| Ines Carvalho | `/sport/firma/tac-9` | 200 |
| Bartosz Lewandowski | `/sport/firma/tac-10` | 200 |
| Aaron Goldfeder | `/sport/firma/iw-3` | 200 |
| Rajiv Mehta | `/sport/firma/iw-2` | 200 |
| Inka Sjöberg | `/sport/firma/iw-4` | 200 |
| Aysel Tunca | `/sport/firma/iw-1` | 200 |
| Doreen Habicht | `/sport/firma/tw-2` | 200 |
| Ola Eriksson | `/sport/firma/iw-5` | 200 |
| Carlo Renz | `/sport/firma/tw-1` | 200 |
| Niccolò Damiani | `/sport/firma/tw-3` | 200 |
| Eduardo Pinheiro | `/sport/firma/tw-5` | 200 |
| Mohamed Tannoury | `/sport/firma/tw-7` | 200 |
| Aoife Brennan | `/sport/firma/tw-4` | 200 |
| Hilde Stenersen | `/sport/firma/tw-6` | 200 |
| Lena Pärtel | `/sport/firma/tw-8` | 200 |
| Vasili Komninos | `/sport/firma/tw-9` | 200 |
| Dr. Reinhard Krempel | `/sport/firma/pol-1` | 200 |
| Maxime Lacroix | `/sport/firma/tw-10` | 200 |
| Petra Sienkiewicz | `/sport/firma/pol-2` | 200 |
| Thea Munk | `/sport/firma/pol-4` | 200 |
| Achim Schwarzer | `/sport/firma/pol-5` | 200 |
| Kwame Asare | `/sport/firma/pol-3` | 200 |

## Weitere geprüfte Seiten

- `/agent/conservative` — HTTP 200
- `/agent/aggressive` — HTTP 200
- `/agent/balanced` — HTTP 200
- `/agenten` — HTTP 200
- `/akademie` — HTTP 200
- `/intel` — HTTP 200
- `/firmen` — HTTP 200
- `/agent` — HTTP 200
