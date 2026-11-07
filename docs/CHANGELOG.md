# Changelog

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

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
