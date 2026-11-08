# Audit des Datenqualitätsmanagements (2026-11-08)

Geprüft wurde der Stand `main` @ `09a6f0b`: Code, Workflows und alle 365 Datensätze, nicht nur die Dokumentation. Leitlinie: **keine parallelen Systeme.** Erweitert werden `validate-data.mjs`, `resolve.mjs`, `corrections.json`, `claims.json`, `sources.json`, die Tests, [DATA-QUALITY.md](DATA-QUALITY.md) und der [Bericht](data-quality-report.md). Automatische Prüfungen melden und schlagen vor; sie übernehmen nichts in den Datenbestand.

Status: ✅ umgesetzt (Paket 1) · ⏳ vorgeschlagen, wartet auf Freigabe

## 1. Tatsächliche Abdeckung

| Bereich | Regeln | Doku | Code | CI | Test |
|---|---|---|---|---|---|
| Koordinaten Grundprüfung | `coords-missing`, `-range`, `-null-island` | ✔ | ✔ | ✔ | ✔ |
| Genauigkeit | `coords-precision`, `coords-approx` | ✔ | ✔ (bis Paket 1 nur Rohdaten) | ✔ | ✅ |
| Dubletten | `duplicate-position`, `-linked`, `-reviewed`, ✅ `-facility` | ✔ | ✔ | ✔ | ✅ |
| Land/Gebiet | `country-*`, `territory-invalid`, `nation-invalid` | ✔ | nur Code-Gültigkeit | ✔ | ✔ |
| Koordinate ↔ Gastland/Region | – | – | **fehlt** | – | – |
| Taxonomie | `rule-overseas`, `rule-domestic`, `rule-civilian` | ✅ (`rule-civilian` fehlte) | ✔ | ✔ | teils |
| Claims | `claim-*`, `claim-apply` | ✔ | ✔ | ✔ | ✔ |
| Corrections | `corrections` | ✔ | ✅ Schema (Status, `issue`, `precision`) | ✔ | ✅ |
| Recherche-Dateien | `research-*` | ✅ (fehlte) | ✔ | ✔ | Bestandstest ✅ |
| Recherche-Prüfungen (Wikidata, OSM, BSR) | – | nur SOURCE-RESEARCH | werden nicht ausgewertet | – | – |
| Quellen | `sources-none`, `-wikipedia-only` | ✔ | ✔, ohne `sources.json` | ✔ | ✔ |
| Dateien | ✅ `file-invalid`, `bases-empty` | ✅ | ✅ | ✔ | ✅ |

`npm run validate` läuft in `deploy.yml` (Push auf `main` und Pull Requests), vor jedem Build, in `update-data.yml` (bei Fehlern kein PR) und in `research.yml`.

## 2. Befunde

### Inkonsistenzen
1. ✅ `DATA-QUALITY.md` führte Puerto Castilla und Karlovac als `positionCheck: proposed`; beide sind aber über angenommene `position`-Claims korrigiert, und `corrections.json` ist leer.
2. ✅ „Position ungefähr“ zeigte 5 statt 8: `approx`-Claims wurden nicht mitgezählt, `coords-precision`/`coords-approx` prüften die Rohposition.
3. ✅ „Position ungeprüft“ zählte auch `applied`.
4. ⏳ Die Quellenkennzahlen ignorieren `sources.json`: Von 291 Standorten „ohne eigene Quelle“ haben 199 eine manuell geprüfte, stützende Quelle.
5. ✅ Die Dublettenprüfung nahm `special-facility` pauschal aus. Das WPC-Paar (194 m) war deshalb für die Validierung unsichtbar. Es war redaktionell zwar schon als `duplicate-entry` erfasst (Claim `wpc-duplicate`), aber ohne Verbindung zur Prüfung.
6. ⏳ Genauigkeit: `corrections.proposal.precision` ✅ hat jetzt ein Vokabular, `claims.position` kennt aber weiterhin nur `approx: true/false`.

### Fehlende Prüfungen
- ⏳ **Koordinate ↔ Gastland:** `librevillegabon` hat `host.country = GH` (Ghana), die Koordinate liegt aber in Libreville, Gabon.
- ⏳ **Recherche-Signale nicht ausgewertet:** 15 Wikidata-Abweichungen über 25 km (z. B. `niamey-air-base` 925 km, `us-camp-castor` 433 km; teils falsch zugeordnete Items), 14 OSM-Urteile „none“.
- ⏳ **Veraltete Prüfungen:** Die Collectors prüfen die Rohkoordinate. Bei den 7 korrigierten Positionen beziehen sich Wikidata- und OSM-Ergebnisse auf die alte Position (Creech, Exmouth …).
- ⏳ **Kaum Positionsbelege:** Nur 10 Quellen nennen `position`; nur 1 Standort hat eine geprüfte, stützende Positionsquelle.
- ⏳ Nahe Dubletten nach Name; Abgrenzung legitimer Cluster (Kaiserslautern, Djibouti).

### Nachvollziehbarkeit
1. ✅ **Kritisch:** Unlesbare oder fehlerhafte JSON-Dateien wurden zu leeren Daten, sodass die Validierung trotz Fehler grün war und Korrekturen verloren gingen. Behoben in Validator, `build-data.mjs` und `scripts/research/lib.mjs`.
2. ⏳ Angenommene `set`-Claims halten den Ausgangswert nicht fest. Ändert visualbases.org den Wert, gewinnt der Claim, ohne dass es auffällt.
3. ⏳ Der Bericht wird nur vom Import-Workflow erneuert und hat keine Historie.

### Quellenstruktur
⏳ `sources.json` kennt Aussagegruppen (`supports`), aber nur **ein** `verdict` je Quelle. „Belegt die Existenz, für die Lage nur Kontext“ lässt sich nicht ausdrücken, und es fehlt die Genauigkeit eines Positionsbelegs.

## 3. Verbesserungsvorschlag

### Notwendig
| # | Maßnahme | Status |
|---|---|---|
| N1 | Robustes Laden (`file-invalid`, `bases-empty`) | ✅ |
| N2 | Genauigkeitsprüfungen und Kennzahlen auf den aufgelösten Datensätzen | ✅ |
| N3 | Doku angleichen | ✅ |
| N4 | Schema von `corrections.json` prüfen (Status inkl. `confirmed`, `issue`, `precision`) | ✅ |
| N5 | Dubletten-Ausnahme eingrenzen (`duplicate-position-facility`, `duplicate-entry` gilt als geklärt) | ✅ |
| N6 | `expect` in Claims (Ausgangswert) + Warnung `claim-upstream-changed`; Nachtrag für 49 Claims (redaktionelle Schicht, braucht Freigabe) | ⏳ |

### Empfohlen
| # | Maßnahme | Aufwand | Status |
|---|---|---|---|
| P1 | Koordinate ↔ Gastland/Gebiet offline (`world-atlas` 50m, Küstenpuffer); Warnung `coords-country`, umstrittene Gebiete getrennt | M | ⏳ |
| P2 | Genauigkeitsstufen `site / reference / town / region` statt `approx` (Claims, Export, App) | M | ⏳ |
| P3 | Wikidata-, OSM- und veraltete Prüfungen als Warnungen; Collectors prüfen die korrigierte Position | M | ⏳ |
| P4 | `corrections.json` `confirmed` in Auflösung und App nutzen (das Schema ist schon da) | S | ⏳ |
| P5 | Urteile je Aussagegruppe in `sources.json` (`verdicts`, Positionsgenauigkeit) | M | ⏳ |
| P6 | Bericht: Abschnitt Geografie, Quellen inkl. Recherche, Widersprüche, Trend (`data-quality-history.json`) | M | ⏳ |
| P7 | Dubletten nach Name und Nähe (`duplicate-name-near`) | S | ⏳ |

### Optional
O1 Kontinent/Region ↔ Koordinate · O2 Cluster-Übersicht im Bericht · O3 Ortsnamen-Abgleich per Nominatim im Recherche-Workflow · O4 Bericht als CI-Artefakt/auf Pages · O5 bewährte Warnungen später zu Fehlern hochstufen.

Alle neuen Regeln sind zunächst **Warnungen**. Kein Skript schreibt in `bases.json`, `claims.json`, `corrections.json` oder `sources.json`.
