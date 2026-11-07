# Bestandsaufnahme der Klassifikation (Phase 1)

Stand: 2026-11-07 · Grundlage: `data/bases.json` (365 Standorte, Stand `main` c89a84c), alle 388 Beiträge von visualbases.org (frisch geladen, identisch mit dem Datenstand), Code in `scripts/`, `src/`, `tests/` sowie die Quellenrecherche (`data/research/`, `docs/research/SOURCE-RESEARCH.md`).

## 1. Wie Standorte strukturiert waren (v1)

Ein flacher Datensatz je Standort, vollständig vom Importer erzeugt:

| Feld | Inhalt | Herkunft |
|---|---|---|
| `kind` | **ein** Wert aus 9 Arten | WordPress-Kategorie „Kind of Location“, bei mehreren per fester Priorität auf einen reduziert |
| `facilities` | 0–n aus 12 Werten | Kategorie „Kind of Special Facilities“ |
| `themes` | 0–n aus 8 Werten | Tags („Use: …“, „Active: …“, „Campaign info“) |
| `nations` | Stationierungsnationen | Tags „Base nation: …“, US zusätzlich abgeleitet aus BSR- und US-Kategorie-Tags |
| `sharedWith` | Staaten **und** Organisationen gemischt (`DE`, `GB`, `NATO`, `EU`) | Tags „Base shared: …“ |
| `country` | Gastland, aus dem Titelpräfix (`DE | …`) | teils Staat (Guam = `US`, Martinique = `FR`), teils Gebiet (`PR`, `GL`) |
| `group` | Sammeleintrag (Σ) | Titel |
| `continent`, `region`, `subregion` | Geografie | Kategorien, Tags |
| `usType`, `sourceType`, `review`, `updates` | Hilfsangaben | Tags |
| `related` | untypisierte Verweise | Links im Beitragstext |

Die **WordPress-Rohbegriffe wurden nicht gespeichert** – jede Ableitung war nicht mehr nachvollziehbar.

## 2. Tatsächlich verwendete Kategorien (v1)

| Dimension | Werte (Anzahl Standorte) |
|---|---|
| `kind` | foreign 153 · shared 102 · closed 27 · national 26 · hotspot 21 · unspecific 12 · facility 9 · civilian 8 · usglobal 7 |
| `facilities` | airfield 114 · telecom 49 · civilairport 42 · training 36 · naval 26 · helipad 23 · command 21 · missile 20 · depot 12 · civilport 9 · nuclear 7 · laboratory 2 |
| `themes` | defender 27 · resistance 27 · surveillance 19 · environment 18 · drones 12 · radar 12 · atlantic-resolve 10 · un 1 |
| `nations` | US 293 · FR 21 · GB 17 · CN 5 · JP 2 · DE 2 · RU 2 (37 ohne, 11 mit mehreren) |
| `sharedWith` | NATO 24 · DE 2 · GB 2 · IT 1 · EU 1 · NL 1 |

Vokabular auf visualbases.org (aus den Auswahllisten jeder Seite): „Kind of Location“ hat 9 Kategorien mit zusammen **371 Zuordnungen für 361 Beiträge** – 10 Beiträge tragen mehrere Arten.

## 3. Befunde

### 3.1 Vermischte Dimensionen

| Befund | Beispiel aus den Daten |
|---|---|
| **„Geschlossen“ war eine Standortart.** Ein geschlossener Standort verlor damit seine Art; ein Beitrag mit „Foreign“ und „Closed“ verlor den Status (Priorität `foreign` vor `closed`). | `al-asad-ab` (Kategorien `closed` + `foreign-bases`) erschien als aktive ausländische Basis. |
| **Sammeleinträge waren eine Standortart** („Militär-Community / Garnison“), obwohl sie Verwaltungseinheiten *oder* Regionen sind. | `usag-ansbach` (Garnison) und `okinawa`, `bahrain`, `singapore`, `armed-forces-djibouti` (Regionen) in einer Kategorie. |
| **Funktionen und Einrichtungen als Themen.** „Abhörstation“ (Tag „Use: Listening station“) und „Radar“ (Tag `fac_radar`, „Use: Radar station“) standen unter Themen. | 19 bzw. 12 Standorte. |
| **Übungen und Operationen als Themen.** „Manöver Defender“, „Atlantic Resolve“, „UN-Mission“ (Tags „Active: …“). | Polnische Übungsplätze mit `defender` + `atlantic-resolve`. |
| **Nukleare Teilhabe als Einrichtung.** Ein Arrangement, keine bauliche Anlage. | `buechel-nato-air-base`, `volkel-ab`. |
| **„Fernmelde-/Abhörstation“** setzte jede Fernmeldeanlage mit einer Abhörstation gleich. | 49 Standorte mit `telecom`, nur 19 mit „Listening station“. |
| **Organisationen und Staaten in einem Feld** (`sharedWith`). | `sibiu-nato`: `NATO`; `us-camp-castor`: `DE`. |
| **US-Inlandsstandorte als eigene Art ohne Nation.** 7 „USA Global Base“-Standorte hatten `nations: []`; die Kategorie selbst sagt „USA“. | `naval-radio-transmitter-lualualei`, `beale-air-force-base-california`. |
| **Gastland uneinheitlich:** Gebietscodes (`PR`, `GL`) neben Staatscodes für Gebiete (Guam = `US`, Aruba = `NL`, Martinique = `FR`, Gibraltar = `GB`). Französische Basen in Überseedepartements galten als „fremde“ Basen. | `naval-base-guam` (`US`), `naval-transmitter-site-aguada` (`PR`). |

### 3.2 Fest codierte Filterwerte

- `NATIONS = ['US','FR','GB','CN','RU','JP','DE']` in `taxonomy.ts` – Mitnutzer wie Italien oder die Niederlande waren nicht filterbar.
- Labels der Arten und Einrichtungen doppelt: in `i18n.svelte.ts` (DE/EN) und in `scripts/prerender.mjs` (nur DE).
- Filterzahlen zählten immer den Gesamtbestand, unabhängig von anderen aktiven Filtern.

### 3.3 Externe Importe und manuelle Ergänzungen

| Herkunft | Datei | Art |
|---|---|---|
| visualbases.org (WordPress) | `data/bases.json`, `data/stories.json` | automatisch, wöchentlich |
| Korrekturen im Importer | `FIXES` (4 Regionen/Länder), `MANUAL_COORDS` (5 Koordinaten), `COUNTRY_ALIASES`, `resolveCopiedCoordinates` | Code |
| Prüfschicht Positionen | `data/corrections.json` (2 Einträge) | von Hand |
| Quellenrecherche | `data/research/*.json` (271 Quelleneinträge, 202 „stützt“, 14 „widerspricht“) | von Hand / Skripte, bisher **nicht** in der App |
| Bilder, Presseschau, Bewegung | `data/media.json`, `wikimedia.json`, `news.json`, `movement.json` | automatisch / von Hand |

### 3.4 Wo die Klassifikation verwendet wurde

Karte (`map.ts`: Farbgruppe aus `kind`), Legende, Atlas-Filter und Länderübersicht, Profil, Teilen-Bild (`shareImage.ts`), Statistik, Startseite (Themen-Kacheln, Story-Zahlen), Quiz (Zahl der Atomwaffenstandorte), „Über & Daten“, Mitmachen (Thema Widerstand), Einbettung, Nächste Basis, Zeitreisen, statische Seiten (`prerender.mjs`), Exporte (`build-data.mjs`), Validierung, Recherche-Skripte (`country`, `nations`).

### 3.5 Erkennbare Inkonsistenzen und Klassifikationsfehler

| Fall | Befund |
|---|---|
| 10 Beiträge mit mehreren Arten | z. B. `rzeszow`, `deu-bellheim`, `i-solbiate-olona` (foreign + shared), `sennelager` (foreign + national), `satcom-landstuhl` (foreign + us-global), `sinjajevina-montenegro` (civilian + shared) |
| 4 Beiträge ohne Art | `white-beach-okinawa`, `jpn-yonaguni`, `marshall-islands`, `gitmo-guantanamo-bay` (Artikel-Kategorie) |
| Übersicht als Standort | `overview-new-us-access-in-sweden` (Art „shared“) |
| Kontinent | Hawaii und Johnston-Atoll unter „Asien“ (Kategorie der Quelle) |
| Ausländisch ohne ausländische Präsenz | `pratas-islands-south-china-sea`, `money-island-south-chinese-sea`, `pattle-island` (Gastland CN, Nation CN) |
| Lualualei | VLF-Sender, auf visualbases.org mit „Radar station“ getaggt |
| Recherche (Abschnitt 3 des Rechercheberichts) | falsche Nation (BA 188 Dschibuti, Camp Castor), falsches Land (Camp Ayanganna, Sarajevo), fehlende Nationen (Al Udeid, Akrotiri, Guantánamo, Muwaffaq Salti, Pápa, Kleine Brogel), veralteter Status (Kabul, Pirmasens, Shamsi, Dakar) |
| Hinweis zur Recherche | Die Notizen zu al-Tanf, Rmeilan, Niger und Camp Castor sagen „dataset still shows it as active“ – im Datensatz stehen sie aber schon als geschlossen. Die Quellen belegen also den vorhandenen Status. |

### 3.6 IDs und Referenzen

Standort-IDs = WordPress-Slugs. Sie stecken in Hash-Links (`#/base/<id>`), statischen Seiten (`b/<id>.html`), `related`, `data/corrections.json`, `data/news.json` (`bases`), `data/movement.json` (`base`), `data/wikimedia.json`, `data/research/*`, Quiz und Startseite. Länderseiten `c/<code>.html` nutzen den Titelcode (auch `GL`, `PR`). Atlas-Links tragen Filterwerte in der URL (`?kinds=closed&themes=drones`). **Alle IDs bleiben unverändert**; alte Filterwerte werden beim Öffnen übersetzt (`LEGACY_FILTERS`).
