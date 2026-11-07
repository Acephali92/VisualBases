# Changelog

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## [Unreleased] – „Deine Basis“: Ortssuche und Rangliste korrigiert

### Behoben
- **Falsche PLZ-Zuordnung:** Die Ortssuche übernahm ungeprüft den ersten Nominatim-Treffer (`limit=1`, ohne Länderkontext). `56068` landete so in Minnesota Lake (USA) statt in Koblenz, angezeigt wurde nur „56068“. Jetzt: strukturierte PLZ-Suche, Länderhinweise und Länderauswahl, Auswahlliste bei mehrdeutigen Treffern, „zu ungenau“ bei ganzen Ländern, und Entfernungen erst nach eindeutiger Position.
- **Nationale Standorte in der Rangliste:** `nearest()` filterte nur Sammeleinträge. US-Inlandsstandorte (Lualualei, Cape Cod, Beale …), chinesische Standorte auf chinesischem Gebiet (Pratas …), Überseegebiete und geschlossene Standorte belegten Plätze vor den tatsächlichen ausländischen Standorten. Neue Regel in `src/lib/proximity.ts` (TAXONOMY, Abschnitt 10).
- Fehler der Ortssuche (Netzwerk, Ratenbegrenzung, Zeitüberschreitung, unbrauchbare Antwort) werden einzeln erklärt statt pauschal „nicht gefunden“. Nach einem Fehler bleibt kein altes Ergebnis stehen.

### Hinzugefügt
- Anzeige der verwendeten Position (Ort, Region, Land, PLZ, Genauigkeit, Koordinaten, OSM-Objekt) und „Nicht der richtige Ort?“ mit Alternativen.
- Rangliste mit Platz, Gastland, Stationierungsnation, Typ, Luftlinie; Kennzeichen für unsichere Einträge, zivile Standorte, ungefähre und ungeprüfte Positionen; Schalter „Ehemalige Standorte einbeziehen“; Karte mit Ausgangspunkt (nur Anzeige); Erklärung von Rechen- und Positionsgenauigkeit; Anzahl der berücksichtigten Einträge.
- `public/config/geocoder.json` (Abschalter und Endpoint der Ortssuche), Cache, Drosselung und Abbruch für Nominatim. Dazu `docs/GEOCODING.md` mit Nutzungsbedingungen, Grenzen und Alternativen.
- Tests: `geo.test.ts`, `geocode.test.ts` (aufgezeichnete Nominatim-Antworten), `proximity.test.ts` (inkl. Brute-Force-Abgleich auf dem echten Datensatz), Browser-Flow für `#/near` in `tests/smoke.cjs` (Desktop und Mobil).

### Geändert
- `distanceKm`: numerisch stabile atan2-Form, mittlerer Erdradius 6371,0088 km, `NaN` statt Scheinwert bei ungültigen Koordinaten.

## [Unreleased] – Workflow „Recherche“

### Geändert
- Läuft nur noch monatlich (2. des Monats) und auf Knopfdruck, immer vom Stand `main` – nicht mehr bei jedem Push auf `claude/**`. Er ist Datensammlung, kein Codetest, und blockierte Pull Requests bis zu 90 Minuten; jeder Push brach den laufenden Lauf samt OSM-Zeitbudget ab.
- Sammler als parallele Jobs (BSR, Wikidata, Wikipedia, OSM); `scripts/research/merge.mjs` übernimmt aus jedem Job nur dessen eigene Einträge. Ein fehlgeschlagener Sammler lässt seine bisherigen Ergebnisse stehen.
- `research-data` wird immer auf `main` aufgesetzt (vorher auf den jeweils gepushten Feature-Branch) und erst nach `npm run validate` gepusht; der Bericht wird mit aktualisiert.
- `wiki-refs.mjs` speichert die Links je Artikel 25 Tage zwischen; Wiederholungsläufe fragen nur Neues ab.

## [Unreleased] – Quellenrecherche

### Hinzugefügt
- **Recherche-Ebene `data/research/`** (noch nicht in der App): `sources.json` (Quellen je Standort mit Herausgeber, Datum, Abrufdatum, Urteil), `candidates.json`, `checks.json`, handgepflegt `manual.json` und `bsr-review.json`. Die Validierung prüft das Schema; `supports`/`contradicts` nur nach Handprüfung.
- Sammler unter `scripts/research/`: Base Structure Report FY2019/FY2023 (`bsr.mjs`), Wikidata, Wikipedia-Einzelnachweise, OpenStreetMap (inkrementell mit Zeitbudget), Quellenprüfung `inspect.mjs`, Zusammenführung `manual.mjs`, Kennzahlen `summarize.mjs`. Workflow „Recherche“ (GitHub Actions) mit Ergebnissen auf dem Branch `research-data`.
- **Bericht `docs/research/SOURCE-RESEARCH.md`** und Tabelle `docs/research/coverage.csv`: 199 der 291 Standorte ohne eigene Quelle sind jetzt handgeprüft belegt, 29 nur mit Kontext oder Widerspruch, 63 weiterhin ohne Beleg. Befunde: falsche Nation/Land bei mindestens 8 Standorten, veralteter Status bei mindestens 16.
- `docs/DATA-SOURCES.md`: alle Daten, Bilder und externen Dienste mit Lizenz.

### Geändert
- Roadmap nach der Recherche neu priorisiert: Korrekturvorschläge (P1-0) und Status-/Präsenzfilter (P1-10) vorgezogen, Aussagen-Modell mit Präsenzart und Startbestand aus der Recherche (P1-1), Recherche-Workflow regelmäßig (P1-11); neue Befunde F20–F24 und Entscheidungen 6–8.

## Durchgang 1: Audit und P0

### Hinzugefügt
- **Datenlizenz CC BY 4.0** (`data/LICENSE.md`): gilt für Standorte, Prüfhinweise, Initiativen, Metadaten der Presseschau, Recherche und Exporte; Bilder, Anrisstexte und Code sind ausgenommen. Downloads enthalten `LICENSE.txt`, das GeoJSON nennt Lizenz und Namensnennung, „Über & Daten“ zeigt beides.
- `docs/IMPROVEMENT-ROADMAP.md`: Audit-Befunde und priorisierte Maßnahmen (P0–P3).
- `scripts/validate-data.mjs` und `npm run validate` / `npm run data:report`: automatische Datenprüfung als Sperre vor Deployment und Daten-Update; Bericht `docs/data-quality-report.md`.
- `data/corrections.json`: Prüf-Schicht für zweifelhafte Positionen; Profile zeigen „Position ungeprüft“ mit Korrekturvorschlag. CSV-Spalte `position_check`, Feld `positionCheck` in JSON und GeoJSON.
- Hinweis „Karte nicht verfügbar“ ohne WebGL in Atlas, Startseite und Einbettung (`MapNotice.svelte`, `MapUnavailableError`).
- `docs/DATA-QUALITY.md`; Tests für Validierung, Koordinatenwahl und Ländercodes; Smoke-Test ohne WebGL.

### Behoben
- **Ghedi Air Base** lag an der Position von Aviano, **Taara** an der von Tapa: Der Importer nimmt jetzt den eigenen Kartenlink eines Beitrags.
- Ungültiger Ländercode `RP` → `PH` (Mount Santa Rita); dadurch 82 statt 83 Länderseiten (RP war ein Duplikat der Philippinen).
- Presseschau-Link mit führendem `%20`.
- Shannonwatch-Logo wurde nicht verarbeitet (Mindestbreite für Logos jetzt 80 px).

### Geändert
- PWA-Precache von 3,7 MB auf 721 KB: Kartenbibliothek, Länderformen, Vorschaubild und nicht-lateinische Schriften werden erst bei Bedarf geladen und dann zwischengespeichert.
- `npm run build` validiert die Daten vor dem Build.

## 2026-11-07 – Erste Version (PR #1)
Neuentwicklung als Svelte-5-Web-App: Globus-Story, Atlas, Standort-Profile, Bilder aus dem Archiv und von Wikimedia, Deine Basis, Aktuelles, Mitmachen, Quiz, Zeitreisen, Für Schulen, Einbettung, statische Seiten pro Basis und Land, PWA, DE/EN, wöchentliche Daten-Aktualisierung.
