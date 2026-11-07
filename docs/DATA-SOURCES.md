# Datenquellen und externe Dienste

Stand: 2026-11-07. Dieses Dokument listet alle Daten, die VisualBases verwendet, und alle Dienste, die die Anwendung oder die Skripte aufrufen – jeweils mit Lizenz bzw. Nutzungsbedingungen.

## 1. Daten der Anwendung

| Daten | Herkunft | Lizenz | Dateien |
|---|---|---|---|
| Standorte (Name, Lage, Nation, Kategorien, Texte, Quellenlinks) | visualbases.org (Karl-Heinz Peil, Friedens- und Zukunftswerkstatt e. V.), Import `scripts/import-visualbases.mjs` | **CC BY 4.0** (`data/LICENSE.md`) | `data/bases.json` → `public/data/bases.{json,geojson,csv}` |
| Korrekturvorschläge, Bewegungsdaten, Recherche | eigene Erhebung des Projekts | CC BY 4.0 | `data/corrections.json`, `data/movement.json`, `data/research/*` |
| Presseschau (Titel, Datum, Link) | visualbases.org | CC BY 4.0 für die Metadaten; **Anrisstexte ungeklärt** (Roadmap, Entscheidung 3) | `data/news.json` |
| Länderformen | Natural Earth über das npm-Paket `world-atlas` | gemeinfrei (Natural Earth), Paket ISC | im Bundle |
| Schrift Inter | `@fontsource-variable/inter` | SIL Open Font License 1.1 | im Bundle |

### Bilder

| Herkunft | Lizenz | Hinweis |
|---|---|---|
| Fotos und Satellitenausschnitte von visualbases.org (Google Earth, Archiv) | Nutzung mit Karl-Heinz Peil abgestimmt; Google-Earth-Bilder © Google und Datenanbieter, Nennung im Bild | 164 Einträge in `data/media.json`, davon 19 mit Lizenzfeld |
| Wikimedia Commons | je Datei (CC BY, CC BY-SA, gemeinfrei …), Urheber und Lizenz werden angezeigt | 191 Einträge in `data/wikimedia.json`; nur ein Teil heruntergeladen (Drosselung) |
| Bilder Dritter mit ungeklärter Lizenz (Flickr Menwith Hill, „Marcha a Rota“, Camp Delta, Oakhanger, Aegis Ashore, Kampagnen-Logos, Porträts) | **ungeklärt** | Roadmap P1-3, Entscheidung 2 |

Bilder sind ausdrücklich **nicht** Teil der CC-BY-Datenlizenz.

## 2. Dienste, die die Anwendung im Browser aufruft

| Dienst | Wann | Übertragene Daten | Bedingungen |
|---|---|---|---|
| GitHub Pages (`acephali92.github.io`) | immer (Hosting) | übliche Server-Logs bei GitHub | GitHub Privacy Statement |
| EOX Sentinel-2 cloudless (`tiles.maps.eox.at`) | nur wenn die Satellitenansicht eingeschaltet wird | Kachelanfragen (IP, Kartenausschnitt) | **CC BY-NC-SA 4.0** („Sentinel-2 cloudless by EOX IT Services GmbH, contains modified Copernicus Sentinel data“) – keine kommerzielle Nutzung; Namensnennung in der Karte |
| Nominatim / OpenStreetMap (`nominatim.openstreetmap.org`) | nur bei der Ortssuche („Deine Basis“), nach Absenden | der eingegebene Suchbegriff, IP, Referer | ODbL; Nominatim Usage Policy (max. 1 Anfrage/s für die ganze App, Cache, Attribution – umgesetzt bzw. offen siehe [GEOCODING.md](GEOCODING.md)) |
| Google Earth (`earth.google.com`) | nur beim Klick auf den Link im Profil | Koordinaten im Link | Google-Nutzungsbedingungen (externer Link, kein Einbetten) |

Kein Tracking, keine Cookies, keine Analyse-Dienste. Die Standortdaten und Länderformen kommen aus dem eigenen Bundle; der Service Worker speichert sie für die Offline-Nutzung.

## 3. Dienste der Import- und Recherche-Skripte (nur Entwicklung und GitHub Actions)

| Dienst | Skript | Zweck | Bedingungen |
|---|---|---|---|
| visualbases.org | `import-visualbases.mjs`, `import-news.mjs`, `build-media.mjs` | Standorte, Presseschau, Bilder | CC BY 4.0 (Daten), Bilder s. o. |
| Wikimedia Commons / Wikipedia API | `import-wikimedia.mjs`, `research/wiki-refs.mjs` | Bilder, Einzelnachweise | CC BY-SA (Texte), Lizenz je Datei; API-Etikette (User-Agent, Drosselung) |
| Wikidata (SPARQL, API) | `research/wikidata.mjs` | Koordinate, Betreiber, Gründung/Auflösung | CC0 |
| OpenStreetMap Overpass (`overpass-api.de`) | `research/osm-check.mjs` | militärische Flächen im Umkreis | ODbL; Overpass-Nutzungsregeln (Pausen zwischen Anfragen) |
| DoD Base Structure Report FY2019/FY2023 (Kopie auf `basenation.us`) | `research/bsr.mjs` | US-Liegenschaften je Land | amtliches Werk der US-Regierung (gemeinfrei) |
| Einzelne Webseiten (Behörden, Medien, Forschung) | `research/inspect.mjs` | Prüfung von Quellen; es werden nur Metadaten und eigene Kurzfassungen gespeichert, keine Fremdtexte | Rechte der jeweiligen Anbieter; nur Verlinkung |

## 4. Quellen der Recherche

Die geprüften Quellen je Standort stehen in `data/research/sources.json` (mit Herausgeber, Datum, Abrufdatum, Urteil); Methode und Ergebnisse in `docs/research/SOURCE-RESEARCH.md`.
