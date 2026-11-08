# Changelog

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## [Unreleased] – Launch-Vorbereitung

### Geändert
- **Bildrechte:** Jedes Bild hat einen Rechtestatus (`free-licence` · `google-earth` · `own-archive` · `unclear`). 30 Bilder Dritter mit ungeklärter Lizenz (Kampagnen-Logos, Redner-Porträts, Flickr- und Commons-Übernahmen ohne Lizenzangabe, Screenshots und Dokumente Dritter) werden **nicht mehr veröffentlicht** und auch nicht mit ausgeliefert, bis sie geklärt sind. Die OSM-Kartenausschnitte tragen jetzt ihre Lizenz. Liste und Freigabeweg: [DATA-SOURCES.md](DATA-SOURCES.md).
- **Barrierefreiheit:** axe-core (WCAG 2.1 A/AA) prüft im Smoke-Test 13 Seiten auf Desktop und Mobil; behoben: Sprachumschalter und Kennzahlen-Link (Label in Name).

## [Unreleased] – Audit des Datenqualitätsmanagements, Paket 4 (Quellen und Bericht)

### Hinzugefügt
- **Urteil je Aussagegruppe** in `data/research/sources.json` (`verdicts`): Eine Quelle kann die Präsenz belegen und der Nation widersprechen. Umgestellt: BA 188 Dschibuti (Präsenz belegt, Nation widersprochen), Shamsi (Präsenz und Nation belegt, Status widersprochen). `precision` für Lagebelege.
- **Bericht:** Abschnitt „Geografie“ (unabhängige Lagebelege, Genauigkeit, Abweichungen), Abschnitt „Entwicklung“ gegenüber dem letzten Lauf mit `docs/data-quality-history.json` (Ausgangsstand 2026-11-07 nachgerechnet), Standorte mit widersprochener Aussage, Markierung der Warnungen, die später blockieren sollen.

### Geändert
- Eine geprüfte, stützende Recherchequelle zählt als Quelle: `sources-none`/`sources-wikipedia-only` entfallen für 200 Standorte (Warnungen 420 → 220).

## [Unreleased] – Importer: genauere Koordinate aus dem Beitrag

### Geändert
- Bei groben Kartenlinks (Zoomstufe ≤ 11) übernimmt der Importer eine nahe, genaue und eindeutige Koordinate aus dem Text oder einem Google-Earth-Link des Beitrags (`refineCoordinates`, Feld `positionFrom`, CSV-Spalte `position_from`). Wirkt beim nächsten Import: laut Probelauf 20 Positionen, darunter 13 Übungsplätze und Großanlagen; `data/bases.json` ist in diesem Schritt unverändert.

## [Unreleased] – Recherche der Geo-Warnungen

Alle 25 geografischen Warnungen aus Paket 3 recherchiert (OSM/Nominatim, Wikidata, Base Structure Report, Originalbeiträge). Ergebnisse: [DATA-QUALITY.md](DATA-QUALITY.md), Abschnitt „Recherche der Geo-Warnungen“.

### Geändert
- **Positionen korrigiert** (angenommene Claims mit OSM-Beleg): Robertson Barracks, Bezmer, Money Island, Second Thomas Shoal, Aruba (Flughafen Reina Beatrix), Camp Shaheen, Ouagadougou, Pemba.
- **Libreville:** Region Zentralafrika statt Westafrika (`libreville-region`).
- **Ouagadougou** auf den Flughafen gesetzt (Vorschlag angenommen am 2026-11-08), **Pemba** auf die Marinebasis (10 km); Gracias a Dios und Vieques als regional ungefähr gekennzeichnet.
- 17 Positionen redaktionell bestätigt (`corrections.json`, `confirmed`): falsches Wikidata-Objekt oder -Koordinate, in OSM nicht als militärisch erfasst, Insel fehlt in den Grenzdaten; fünf Einträge, zu denen nur Ort oder Region bekannt ist, sind jetzt als ungefähr gekennzeichnet.
- Wikidata-Objekte vom Typ „urban area“ zählen als Ort; Objekte, die zugleich Anlage sind, bleiben Anlage. Sammeleinträge werden nicht als „auf See“ gemeldet.

### Hinzugefügt
- `corrections.json`: Grund `reference-mismatch` und `precision` für bestätigte Positionen (Genauigkeit festhalten, ohne den Punkt zu verschieben).
- Abgleich aller 365 Originalbeiträge mit den darin genannten Koordinaten (Ergebnis in DATA-QUALITY.md); daraus die Importer-Regel oben.

### Offen
- Darmstadt Training Center: Lage nicht belegt.

## [Unreleased] – Audit des Datenqualitätsmanagements, Paket 3 (Geo-Prüfungen)

### Geändert
- **Libreville:** Vorschlag `libreville-host` angenommen (Entscheidung 2026-11-08): Gastland Gabun statt Ghana.
- Die Recherche-Skripte prüfen die **korrigierte** Position, Namen und Gastland (angenommene Claims angewandt); vorher galten die Prüfungen bei korrigierten Positionen der alten Stelle. `docs/research/coverage.csv` zeigt entsprechend die korrigierten Werte.

### Hinzugefügt
- **Koordinate ↔ Gastland** (`scripts/lib/geo-check.mjs`): Ländergrenzen Natural Earth 1:10m (`world-atlas`), Küsten- und Grenztoleranz, umstrittene Gebiete getrennt, Datumsgrenze berücksichtigt. Neue Warnungen `coords-country`, `coords-country-disputed`, `coords-offshore`. Auf den aufgelösten Daten: kein Länderwiderspruch, 3 Positionen auf See (Bahrain-Sammeleintrag, Pratas-Inseln, Second Thomas Shoal).
- **Recherche-Signale in der Validierung:** `position-wikidata-far` (11), `position-osm-none` (9), `position-check-stale` (1: Exmouth, OSM-Prüfung galt der alten Position).
- **`duplicate-name-near`:** gleicher kennzeichnender Name, 200 m–3 km. Treffer: Bann Communications Station / Station 2 (2,6 km).
- **Redaktionell bestätigte Positionen:** `corrections.json` mit `status: "confirmed"` quittiert Geo-Warnungen (alle oder die in `rules` genannten) und erscheint im Profil als „✓ Position redaktionell geprüft“ mit Link zum Beleg.
- Alle neuen Regeln sind Warnungen: 0 Fehler, 431 Warnungen (vorher 406).

## [Unreleased] – Audit des Datenqualitätsmanagements, Paket 2 (redaktionelle Schicht)

Freigegeben von den Projektverantwortlichen am 2026-11-08. `data/bases.json` ist unverändert; kein angewandter Wert ändert sich.

### Hinzugefügt
- **Ausgangswert je Korrektur (`expect`):** Alle 39 `set`-Claims in `data/claims.json` halten jetzt den Wert fest, den `bases.json` bei der Entscheidung hatte (mechanisch nachgetragen). Ändert visualbases.org das Feld später, meldet die Validierung `claim-upstream-changed`, statt die neue Angabe stillschweigend zu überdecken. Neue `set`-Claims ohne `expect` erzeugen die Warnung `claim-expect-missing`.
- **Genauigkeitsstufen (`precision`)** `site | reference | town | region` für Positionen statt nur `approx`. Die 7 Positions-Claims sind eingestuft (4× `site` nach OSM-Objekt der Anlage, Puerto Castilla und Karlovac `town`, Jungle Warfare Training Center `region`). Veröffentlicht als `positionPrecision` und CSV-Spalte `position_precision`; „Position ungefähr“ ergibt sich aus `town`/`region` und bleibt in der App unverändert (8 Standorte).
- Bericht: Verteilung der Positionsgenauigkeit und Zahl der Korrekturen mit geändertem Quellwert.

### Vorgeschlagen (nicht angewandt)
- **Libreville (`librevillegabon`):** Der Beitrag trägt „GH | Libreville“ (Ghana), die Koordinaten liegen aber in Libreville, Gabun, und die Adresse lautet `librevillegabon`. Vorschlag `libreville-host` (Gastland GA) mit Beleg (OSM/Nominatim-Rückwärtssuche in `data/research/manual.json`). Die App zeigt das als offenen Prüfhinweis.

## [Unreleased] – Audit des Datenqualitätsmanagements, Paket 1

Audit und priorisierter Verbesserungsvorschlag: [docs/data-quality-audit.md](data-quality-audit.md). Umgesetzt sind die notwendigen Punkte ohne Datenänderung; `data/*.json` ist unverändert.

### Behoben
- **Kaputte Datendateien gehen nicht mehr unbemerkt durch:** Bisher machten Validierung, `data:build` und die Recherche-Skripte aus einer unlesbaren oder fehlerhaften JSON-Datei stillschweigend eine leere. Ein Syntaxfehler in `claims.json` hätte so alle Korrekturen verworfen, ohne dass ein Fehler gemeldet wurde. Jetzt gilt nur eine *fehlende* optionale Datei als leer; alles andere ist ein Fehler (`file-invalid`, `bases-empty`). Die Recherche-Zusammenführung behält bei unlesbaren Ergebnissen eines Collectors die bisherigen Daten.
- `coords-precision` und `coords-approx` prüfen die veröffentlichte Position, also nach Anwendung der Claims. Die Kennzahl „Position ungefähr“ steigt dadurch von 5 auf 8 (Puerto Castilla, Karlovac und JWTC sind per Claim als ungefähr gesetzt). „Position ungeprüft“ zählt nur noch `proposed`.
- CSV-Spalte `position_check`: `unverified:…` nur noch bei `status: "proposed"`.

### Geändert
- Die Dublettenprüfung nimmt `special-facility` nicht mehr pauschal aus. Ohne Relation gibt es jetzt die Warnung `duplicate-position-facility`; ein angenommener Prüfhinweis `duplicate-entry` gilt als geklärt (`duplicate-position-reviewed`).
- Das Schema von `data/corrections.json` wird geprüft: Status `proposed | applied | confirmed`, Vokabular für `issue` und `proposal.precision`, Belege für `confirmed` (Vokabulare in `src/lib/taxonomy.ts`).
- `docs/DATA-QUALITY.md` an den tatsächlichen Stand angeglichen: veraltete Positionstabelle, bisher undokumentierte Regeln (`research-*`, `schema`, `relation-type`, `rule-civilian`, `resolve`), vollständiges Schema von `corrections.json`.

## [Unreleased] – Korrekturen aus der Quellenrecherche angewandt

### Geändert
- **Entscheidung der Projektverantwortlichen (2026-11-07): alle belegten Befunde direkt korrigieren.** Die bisher offenen Vorschläge sind angewandt: Khmeimim, Tartus, Tapa, Rzeszów und Thumrait mit Status „unklar“, JASDF Naha ohne US-Präsenz, Fort-Lamy/Kossei bis 2025-06. Geschlossene Standorte bleiben grau sichtbar.
- **Neue Korrekturarten `position` und `name`** in `data/claims.json` (`scripts/lib/resolve.mjs`, Validierung, Profil). Positionen nach OpenStreetMap korrigiert: Creech AFB (27 km), Muwaffaq Salti (17 km), Camp Humphreys (16 km), Jungle Warfare Training Center (15 km), Harold E. Holt/Exmouth (14 km), Puerto Castilla und Karlovac (vorher Koordinaten von Soto Cano bzw. Zadar; jetzt Ortsmitte, „ungefähr“). Namen: Storck Barracks, USAFE-AFAFRICA Warfare Center (ehem. Warrior Preparation Center), Puerto Castilla.
- Neuer Prüfhinweis `duplicate-entry` (doppelter Warrior-Preparation-Center-Eintrag).
- Die Dublettenprüfung der Validierung prüft die korrigierten Positionen.

### Offen
- PAE du Lamentin bleibt Vorschlag: Das PAE liegt laut Ministerium auf Martinique, die Koordinaten des Eintrags aber in Guadeloupe.

## [Unreleased] – Ergebnisse der automatischen Recherche übernommen

### Hinzugefügt
- `data/research/checks.json` und `candidates.json` vom Daten-Branch `research-data`: 265 Wikidata-Objekte, 141 OSM-Lageprüfungen, 4416 ungeprüfte Hinweise zu 279 Standorten. Damit stehen bei 56 der 63 noch offenen Standorte jetzt zumindest Hinweise zur Prüfung bereit.
- Bericht, Abschnitt 3.5: Statusfragen aus Wikidata (Argentia, Inezgane, Nurmsi, Bizerte, Bicester) und fünf vermutlich falsche Positionen (Creech, Muwaffaq Salti, Humphreys, Jungle Warfare Training Center, Exmouth) als Prüfaufträge; `coverage.csv` neu erzeugt.

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

## [Unreleased] – Karte nach Updates

### Behoben
- **Karte fehlte nach einem Update** („Die interaktive Karte kann in diesem Browser nicht angezeigt werden … WebGL“): Browser mit der vorigen Version im Service-Worker-Cache führten nach dem Deployment noch die alte App aus. Deren nachgeladenes Kartenmodul gab es auf dem Server nicht mehr (404), und jeder Ladefehler wurde als fehlendes WebGL gemeldet.
  - Der Service Worker wird jetzt per `virtual:pwa-register` registriert; mit `autoUpdate` lädt die Seite neu, sobald die neue Version übernimmt.
  - Schlägt das Nachladen eines Moduls fehl, lädt die Seite einmal neu (`src/lib/update.ts`, Sperre gegen Endlosschleifen: höchstens einmal pro Minute).
  - Der WebGL-Hinweis erscheint nur noch bei fehlendem WebGL; ein Ladefehler zeigt „Die Karte konnte nicht geladen werden“ mit Knopf „Neu laden“.


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
