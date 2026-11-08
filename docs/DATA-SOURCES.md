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

Jedes Bild in `data/media.json` hat einen **Rechtestatus** (`rights`, Vokabular `MEDIA_RIGHTS` in `src/lib/taxonomy.ts`). Bilder mit dem Status `unclear` werden **nicht veröffentlicht**: Sie fehlen in Profilen, Galerien, „Mitmachen“ und auf den statischen Seiten, bis der Status geklärt ist. Die Validierung verlangt einen Status (`media-rights`) und listet ungeklärte Bilder im Bericht (`media-rights-unclear`). Neue Bilder ordnet `build-media.mjs` nur dort selbst ein, wo es sicher ist (Lizenzfeld, OpenStreetMap, Google Earth); alles andere beginnt als `unclear`.

| Status | Herkunft | Lizenz / Grundlage | Anzahl (2026-11-08) |
|---|---|---|---|
| `free-licence` | Wikimedia Commons (gemeinfrei, CC BY, CC BY-SA), Kartenausschnitte von OpenStreetMap/OpenStreetBrowser | Lizenz je Datei, Urheber und Lizenz werden angezeigt; OSM: „© OpenStreetMap contributors“, ODbL / CC BY-SA 2.0 | 61 (19 Commons, 42 OSM) |
| `google-earth` | Satellitenausschnitte aus Google Earth (Archiv visualbases.org) | © Google und Datenanbieter, nicht-kommerzielle Nutzung mit der eingebetteten Nennung | 65 |
| `own-archive` | eigenes Material von visualbases.org (Kongressfolien, Fotos der Kampagne Stopp Ramstein u. a.) | Nutzung mit Karl-Heinz Peil abgestimmt | 8 |
| `unclear` | Material Dritter mit ungeklärter Lizenz, siehe unten | **nicht veröffentlicht** | 30 |

**Ungeklärt und deshalb ausgeblendet** (Freigabe oder Urheber- und Lizenzangabe nötig):

- Fotos: Flickr „Menwith Hill Day of Action 2011“; „Marcha contra la base de Rota“, Camp Delta (Guantánamo), Satellitenschüssel RAF Oakhanger, Aegis Ashore Rumänien (alle von Commons übernommen, aber ohne Datei- und Lizenzangabe); US-Army-Foto Bremerhaven
- Kampagnen-Logos (10): Ansbach, Büchel, Kalkar, Erbenheim, Yorkshire CND, No MUOS, Okinawa, No Helipads Okinawa, Jeju Island, Shannonwatch
- Porträts der Redner des Kongresses 2021 (10)
- Dokumente und Screenshots Dritter: Wikipedia-Karte „Military facilities of the United States in Japan 2016“ (Urheber und Lizenz fehlen), Dokument des LBB Rheinland-Pfalz (NATO-Pipeline), Screenshots der Webseiten Germersheim und Flughafen Hahn

Zum Freigeben den Status in `data/media.json` setzen (`own-archive` mit Zustimmung, `free-licence` mit `license`, `licenseUrl` und Urheber in `credit`) und `npm run data:build` ausführen.

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
