# Quellenrecherche zu den Standorten ohne eigene Quelle

Stand: 2026-11-07 · Auftrag: ausführliche Recherche zur Datenlage der Standorte, die auf visualbases.org keine eigene Quelle haben (291 von 365: 218 nur mit Wikipedia, 73 ganz ohne Quelle).

> **Status: Recherche-Datensatz, noch nicht in der Anwendung.** Die Ergebnisse liegen in `data/research/` und werden erst nach Durchsicht durch die Projektverantwortlichen in die App übernommen (Entscheidung vom 2026-11-07). An `data/bases.json` wurde nichts geändert.

## 1. Methode

### 1.1 Quellenarten und Gewichtung

| Rang | Art (`type`) | Wofür sie zählt | Beispiele |
|---|---|---|---|
| 1 | `official` – Regierungen, Streitkräfte, Parlamente, Abkommen | Präsenz, Nation, Status, Einrichtungen | DoD Base Structure Report, Anhang A des US-Schweden-Abkommens, bundeswehr.de, defense.gouv.fr, gov.uk, army.mil/DVIDS |
| 2 | `academic` – Forschung, Nachschlagewerke | Präsenz, Hintergrund | Nautilus Institute, Store norske leksikon |
| 2 | `media` – Nachrichtenagenturen, Zeitungen, Fachpresse | Präsenz, Status, Aktivität | Al Jazeera, Anadolu, Stars and Stripes, LRT, ERR, Sveriges Radio |
| 3 | `movement` / `dataset` – Friedensbewegung, Datensätze | Hinweise, Sekundärbeleg | World BEYOND War, Base Nation, frieden-und-zukunft.de, AK gegen bewaffnete Drohnen |
| – | `geodata` – OpenStreetMap, Wikidata | **nur** Lage und Status, nie die Stationierungsnation | `checks.json` |

Wikipedia dient nur als Einstieg: Die Einzelnachweise der Artikel werden als Kandidaten gesammelt, gezählt wird nur die Quelle selbst.

### 1.2 Werkzeuge

| Schritt | Werkzeug | Ergebnis |
|---|---|---|
| Base Structure Report FY2023 und FY2019 (DoD, Kopie auf basenation.us) | `scripts/research/bsr.mjs` – Namensabgleich je Gastland, Ortspräfix, Abkürzungen, US-Bundesstaaten | `checks.json` → `bsr`; Quelle je Treffer |
| Manuelle Prüfung der BSR-Treffer | `data/research/bsr-review.json` (Urteil, Zuordnung von Hand, Ablehnung) | 122 geprüfte Treffer, 2 bewusst nur als Kontext |
| Wikidata (Koordinate, Betreiber, Gründung/Auflösung, Website) | `scripts/research/wikidata.mjs` (GitHub Actions) | `checks.json` → `wikidata`; Kandidaten |
| Einzelnachweise der Wikipedia-Artikel | `scripts/research/wiki-refs.mjs` (GitHub Actions) | `candidates.json` (unbewertet) |
| OpenStreetMap: militärische Flächen und Flugplätze im Umkreis von 3 km | `scripts/research/osm-check.mjs` (GitHub Actions, inkrementell) | `checks.json` → `osm` |
| Websuche und Abruf jeder Quelle | `scripts/research/inspect.mjs` (Status, Titel, Datum, Textstellen) | `data/research/manual.json` → `manual.mjs` |
| Kennzahlen und Tabelle | `scripts/research/summarize.mjs` | dieser Bericht (Abschnitt 2), `coverage.csv` |

### 1.3 Regeln

- Jede eingetragene Quelle wurde **tatsächlich abgerufen und gelesen** (`httpStatus`, `accessed`). Seiten, die den Abruf verweigern (u. a. usafe.af.mil, mod.go.jp, nato.int-Unterseiten), wurden durch andere ersetzt oder weggelassen.
- `summary` ist eine eigene Kurzfassung, kein Zitat. Unsicherheiten stehen in `note`.
- Urteile: `supports` (belegt die Aussage), `contradicts` (widerspricht dem Datensatz), `context` (relevant, belegt die Aussage aber nicht). `supports` und `contradicts` gibt es nur nach Handprüfung (`method: manual`); die Validierung erzwingt das.
- **Belegt wird, was die Quelle sagt.** Zugangsrechte aus einem Abkommen sind keine dauerhafte Stationierung, eine Übung ist keine Basis, eine Rotation kein fester Standort. Das steht jeweils in `note`.
- Eigene Schlussfolgerungen sind als solche markiert (z. B. „Kossei = früheres Fort-Lamy“).

## 2. Ergebnisse in Zahlen

<!-- summary:start -->
_Erzeugt mit `node scripts/research/summarize.mjs` – 2026-11-07._

### Abdeckung der Standorte ohne eigene Quelle

| Belegstand nach der Recherche | ohne eigene Quelle (291) | davon ganz ohne Quelle (73) |
| --- | ---: | ---: |
| Präsenz von Hand belegt | 199 (68 %) | 55 (75 %) |
| nur Kontext oder Widerspruch | 29 (10 %) | 11 (15 %) |
| nur ungeprüfte Hinweise | 0 (0 %) | 0 (0 %) |
| nichts gefunden | 63 (22 %) | 7 (10 %) |

### Belegte Aussagen (Standorte ohne eigene Quelle)

| Aussage | Standorte mit handgeprüfter stützender Quelle |
| --- | ---: |
| presence | 199 (68 %) |
| nation | 190 (65 %) |
| position | 1 (0 %) |
| status | 9 (3 %) |
| facility | 24 (8 %) |
| activity | 10 (3 %) |

### Handgeprüfte Quellen nach Art

| Art | Einträge | Standorte | supports | contradicts | context |
| --- | ---: | ---: | ---: | ---: | ---: |
| official | 175 | 175 | 154 | 6 | 15 |
| academic | 2 | 2 | 2 | 0 | 0 |
| media | 62 | 60 | 46 | 8 | 8 |

Sammler: manual 117, bsr 154 Quelleneinträge; davon 32 noch ungeprüft.

### Nach Gastland (Standorte ohne eigene Quelle)

| Land | Standorte | belegt | nur Kontext | nur Hinweise | nichts |
| --- | ---: | ---: | ---: | ---: | ---: |
| DE | 50 | 41 | 3 | 0 | 6 |
| JP | 16 | 12 | 1 | 0 | 3 |
| GB | 13 | 13 | 0 | 0 | 0 |
| IT | 13 | 7 | 3 | 0 | 3 |
| FR | 12 | 10 | 2 | 0 | 0 |
| KR | 11 | 9 | 1 | 0 | 1 |
| SE | 11 | 9 | 0 | 0 | 2 |
| PL | 10 | 6 | 1 | 0 | 3 |
| US | 10 | 7 | 2 | 0 | 1 |
| CO | 8 | 7 | 0 | 0 | 1 |
| AF | 7 | 0 | 3 | 0 | 4 |
| AU | 7 | 7 | 0 | 0 | 0 |
| NL | 6 | 3 | 0 | 0 | 3 |
| BE | 5 | 5 | 0 | 0 | 0 |
| DJ | 5 | 3 | 1 | 0 | 1 |
| PK | 5 | 4 | 0 | 0 | 1 |
| SY | 5 | 3 | 1 | 0 | 1 |
| BG | 4 | 4 | 0 | 0 | 0 |
| EE | 4 | 3 | 0 | 0 | 1 |
| RO | 4 | 3 | 0 | 0 | 1 |

Weitere 54 Länder mit weniger als 4 solchen Standorten: 85 Standorte, davon 43 belegt.

### Automatische Prüfungen (alle Standorte)

| Prüfung | Ergebnis |
| --- | ---: |
| BSR-FY2023-Treffer | 153 |
| BSR nur FY2019 (Statusfrage) | 2 |
| Wikidata-Objekt gefunden | 0 |
| Wikidata-Position > 2 km entfernt | 0 |
| Wikidata: Schließungs-/Auflösungsdatum | 0 |
| OSM: militärisches Objekt ≤ 1 km | 0 |
| OSM: militärisches Objekt 1–3 km | 0 |
| OSM: nichts im Umkreis von 3 km | 0 |

### Gefundene Widersprüche (14 Standorte)

- **Bagram Air Base** (`bagram-air-base`, AF): Status: Bagram has not been a US base since July 2021 (historical).
- **Camp Marmal / John Pratt, Masar-i Sharif** (`camp-marmal-john-pratt`, AF): Status: Camp Marmal is a former base (since June 2021). It was mainly a German camp – the dataset lists only the US as stationing nation.
- **Kabul ISAF** (`kabul-isaf-headquarters`, AF): Status: the dataset still shows the Kabul ISAF/RS headquarters as an active site – it has been closed since 2021 (historical).
- **Pirmasens: US Army Medical Material Center Europe** (`medical-material-center-europe`, DE): Status/position: USAMMCE is no longer in Pirmasens – the entry should move to Kaiserslautern Army Depot or be marked historical.
- **Base aérienne 188 Colonel Émile Massart** (`base-aerienne-188-djibouti`, DJ): Contradicts the stationing nation: the dataset lists the US, but BA 188 is a French air base. The US presence is the neighbouring Camp Lemonnier.
- **Guayana: Camp Ayanganna** (`camp-ayanganna`, FR): Contradicts the record: the dataset lists Camp Ayanganna under French Guiana with France as stationing nation. It is the headquarters of Guyana's own armed forces, not a foreign base.
- **US Camp Castor** (`us-camp-castor`, ML): Contradicts nation and status: Camp Castor was a German (UN) camp, not a US camp (the dataset calls it "US Camp Castor"), and it has been closed since December 2023.
- **Air Base 201, Agadez** (`us-air-base-201`, NE): Status: both US bases in Niger are closed since summer 2024; the dataset still shows them as active. (French forces had already left Niamey at the end of 2023 – not covered by this source.)
- **Niamey Air Base** (`niamey-air-base`, NE): Status: both US bases in Niger are closed since summer 2024; the dataset still shows them as active. (French forces had already left Niamey at the end of 2023 – not covered by this source.)
- **Shamsi Airfield, Washuk / Balochistan** (`shamsi-airfield-pakistan`, PK): Status: US use of Shamsi ended in December 2011 – historical. Confirms the former US use (drone servicing).
- **Dakar-Quakam: Base aérienne 160** (`base-aerienne-dakar`, SN): Status: the French air base at Dakar-Ouakam and the French base at N'Djamena (Kossei, the former Fort-Lamy air base) are no longer French bases. Identifying Kossei with the dataset entry 'Fort-Lamy' is our own assumption and needs checking.
- **Al-Tanf** (`al-tanf-syria`, SY): Status: al-Tanf is a former US base since February 2026; the dataset still shows it as active.
- **Rumeilan Air Base** (`rumeilan-air-base`, SY): Status: the dataset still shows the base as active. Single source relaying the Syrian Observatory for Human Rights; Kharab al-Jir and Rmeilan/Abu Hajar airfield are named inconsistently in reports – check the position.
- **Fort-Lamy Air Base, N’Djamena (Chad)** (`fort-lamy-ab-djamena`, TD): Status: the French air base at Dakar-Ouakam and the French base at N'Djamena (Kossei, the former Fort-Lamy air base) are no longer French bases. Identifying Kossei with the dataset entry 'Fort-Lamy' is our own assumption and needs checking.

### Weiterhin ohne geprüften Beleg (63 Standorte)

`al-minhad-ab`, `camp-shaheen-camp-mike-spann`, `herat-unnamed`, `kandahar-airfield`, `masar-i-sharif-communnity`, `ushuaia`, `ouagadougou`, `bujumbura-burundi`, `bdf-glen-valley-botswana`, `air-force-301-cameroon`, `pratas-islands-south-china-sea`, `arauca`, `telecom-cape-verde`, `conversion-area-bitburg`, `eichbuck-illesheim`, `tirpitzhafen-kiel`, `oberauerbach-polygone`, `satellite-ground-system-ramstein`, `radio-relay-site-rummelsberg`, `jsdf-base-djibouti`, `boufarik-base`, `nurmsi-airfield-estonia`, `lugar-research-center-georgia`, `librevillegabon`, `camp-century-greenland`, `gracias-a-dios-honduras`, `training-area-eugen-kvaternik`, `dimona-radar-facility`, `camp-speicher`, `salto-di-quirra-sardinia`, `decimomannu-ab-sardinia`, `vicenza-padova`, `okinawa`, `tachikawa-air-base-tokyo`, `jpn-yonaguni`, `camp-kim-yongsan`, `siauliai-lithuania`, `inezgane-airport`, `krivolak-training-area`, `bamako-mali`, `pemba-naval-base`, `windhoek-namibia`, `dirkou-ab-niger`, `savaneta-kamp`, `aruba`, `ajf-brunssum`, `masirah-ab`, `iquitos-airport`, `mount-st-rita-naval-link-station`, `secon-thomas-shoal`, `makran-pakistan`, `deblin-irena-air-base`, `21-centralny-poligon-lotniczy`, `nadarzyce-air-base`, `maria-argana-paraguay`, `training-centre-general-popescu`, `five-eyes-station-lerkil`, `forsvarets-radioanstalt-lovon`, `dakar-senegal`, `principe-island-sao-tome`, `unnamed-syria-airfield`, `bizerte-sidi-ahmed-air-base`, `guam-naval-base`

<!-- summary:end -->

## 3. Wichtigste Befunde

### 3.1 Fehler im Datensatz (Nation, Land, Zuordnung)

| Standort | Befund | Beleg |
|---|---|---|
| Base aérienne 188, Dschibuti | Nation **US** eingetragen, ist aber eine **französische** Basis (FFDj). Die US-Präsenz ist das benachbarte Camp Lemonnier. | defense.gouv.fr 2024 |
| Camp Ayanganna | Unter Französisch-Guayana/Frankreich geführt, ist aber das **Hauptquartier der Streitkräfte Guyanas** in Georgetown. | National Trust of Guyana |
| Sarajevo Military Airport | Land **HR** eingetragen, liegt in **Bosnien und Herzegowina** (Camp Butmir). | CRS 2006, FENA 2024 |
| „US Camp Castor“, Mali | War ein **deutsches** UN-Feldlager (MINUSMA), seit 12.12.2023 übergeben. | bundeswehr.de |
| Camp Marmal, Masar-i Scharif | Nur **US** eingetragen, war das größte **Bundeswehr**-Feldlager, seit Juni 2021 geräumt. | bundeswehr.de |
| Al Udeid, RAF Akrotiri | Nur **GB** eingetragen; der BSR führt beide auch als **US**-Standorte. | BSR FY2023 |
| Guantánamo, Muwaffaq Salti, Kleine Brogel (Atomwaffenlager), Pápa | **Keine Stationierungsnation** eingetragen; Quellen nennen US-Einheiten bzw. die multinationale Heavy Airlift Wing (mit US-Beteiligung). | BSR, RTBF, honvedelem.hu |
| JASDF Naha Air Base | Nation **US**; im BSR steht nur der US-Hafen Naha Port, die Luftwaffenbasis selbst ist japanisch. | BSR FY2023 |
| Maritime Component Command, Neapel | Das NATO-Marinekommando (MARCOM) sitzt in Northwood (GB); in Neapel/Lago Patria liegt JFC Naples. | BSR (Kontext) |
| Davis-Monthan AFB, Curaçao | Der BSR führt den Forward Operating Location Curaçao unter der Stamminstallation Davis-Monthan (Arizona); der Name im Datensatz ist irreführend. | BSR FY2023 |
| „Stock Barracks“, Illesheim | Richtig: **Storck** Barracks. | BSR FY2023 |
| Warrior Preparation Center | **Zwei Einträge** (`de-kl-…`, `…-einsiedlerhof`) für dieselbe Einrichtung; heißt seit 2022 USAFE-AFAFRICA Warfare Center. | Kaiserslautern American 2025 |
| PAE du Lamentin, Guadeloupe | Das Pôle aéronautique étatique liegt in Le Lamentin auf **Martinique**; wahrscheinlich Verwechslung der beiden Lamentin-Gemeinden. | defense.gouv.fr |
| Halmstad (Schweden) | Im Abkommen „Regimental Area and Air Base“, im Datensatz „flotilla area“. | Anhang A DCA |

### 3.2 Veralteter Status (Standort geschlossen oder stark verändert)

| Standort | Seit | Beleg |
|---|---|---|
| Kabul (ISAF/Resolute Support), Bagram, Camp Marmal | 2021 | NATO, Anadolu, Bundeswehr |
| Shamsi (Pakistan) | Dez. 2011 | Al Jazeera |
| Air Base 101 Niamey, Air Base 201 Agadez | Juli/Aug. 2024 | Kaiserslautern American |
| Base aérienne 160 Dakar, Kossei/N'Djamena (Frankreich) | 2025 | Al Jazeera |
| Camp Castor, Gao | Dez. 2023 | Bundeswehr |
| al-Tanf (Syrien) | Feb. 2026 | Anadolu/CENTCOM |
| Rmeilan/Kharab al-Jir (Syrien) | März 2026 (eine Quelle) | Kurd Online |
| USAMMCE Pirmasens → Kaiserslautern | Okt. 2021 | army.mil |
| BA 190 Tahiti → GAM Faa'a | 2012 | defense.gouv.fr |
| Thumrait (Oman) | nur noch im BSR FY2019 | BSR |
| Johnston Atoll, Vieques | nur noch als Liegenschaft im BSR, keine Nutzung | BSR |
| Tapa (Estland) | US-Kontingent 2026 auf unter 100 reduziert | Militarnyi |
| Rzeszów-Jasionka | US-Präsenz 2025 verlagert, Drehkreuz bleibt unter polnischer/NATO-Führung | Notes From Poland |
| Khmeimim, Tartus (Russland) | Vereinbarung Aug. 2026: gemeinsame Ausbildungszentren | Al Jazeera |

### 3.3 Art der Präsenz

Viele Standorte sind **keine Basen im engeren Sinn**: Zugangsrechte aus Abkommen (Schweden 2023, Norwegen 2024, Bulgarien 2006, Kolumbien 2009 – dessen Rechtsstatus seit dem Verfassungsgerichtsbeschluss 2010 offen ist), **Rotationen** (Polen, Litauen, Estland, Australien), Übungsplätze verbündeter Staaten (Bergen, Munster, Oberlausitz, Teulada, Vaziani), gemeinsam betriebene Anlagen (Pine Gap, Vardø, Exmouth) oder **historische** Nutzung (Pakistan 2001–2011). Der Datensatz unterscheidet das bisher nicht. Ohne diese Unterscheidung wirken Abkommensorte und Übungsplätze wie feste Basen.

### 3.4 Quellenlage nach Regionen

- **Gut belegbar:** US-Standorte in Europa, Japan, Korea (BSR, army.mil/DVIDS); britische und französische Überseestandorte (gov.uk, defense.gouv.fr); Abkommensorte (Vertragstexte).
- **Schwer belegbar:** Afrika (Ouagadougou, Bamako, Windhoek, Pemba, Bujumbura, Gabun, Kap Verde), Südamerika (Arauca, Iquitos, Paraguay), Südchinesisches Meer (Pratas, Second Thomas Shoal) und Fernmeldeanlagen in Deutschland (Rummelsberg, Eichbuck, Oberauerbach). Hier gibt es oft nur Einzelberichte oder gar nichts Abrufbares.
- **Bewegungsquellen:** frieden-und-zukunft.de und der AK gegen bewaffnete Drohnen (drohnen.frieden-und-zukunft.de) liefern für die gesuchten deutschen Fernmeldeanlagen keine zusätzlichen Belege; sie verweisen meist auf visualbases.org selbst. Als eigenständiger Beleg eignen sie sich daher hier nicht.

## 4. Empfehlungen

1. **Korrekturen vorschlagen statt still ändern:** Die Befunde aus 3.1 und 3.2 als Einträge in `data/corrections.json` (Feld, alter Wert, Vorschlag, Quelle), damit Profile „Angabe umstritten/veraltet“ zeigen und die Projektverantwortlichen entscheiden.
2. **`claims.json` (P1-1) um Präsenzart und Zeitraum erweitern:** `presence: permanent | rotational | access | exercise | joint | historical | planned` und `validFrom`/`validTo`. Die 83 handgeprüften Quellen und 122 BSR-Urteile lassen sich weitgehend automatisch in Aussagen überführen (Präsenz, Nation, Status).
3. **Belegstatus in der App zeigen** (P1-2): je Standort „geprüft belegt“, „nur Kontext“, „nur Wikipedia“, „ohne Beleg“, mit Quellenliste und Abrufdatum. Filter nach Belegstatus und Präsenzart im Atlas.
4. **Status- und Zeitfilter vorziehen** (P2-2): Mindestens 15 Standorte sind geschlossen oder stark verändert, darunter bekannte wie Bagram und Niger.
5. **BSR als strukturierte Quelle beibehalten** und jährlich mit der nächsten Ausgabe abgleichen; neue Ausgaben über den Workflow „Recherche“.
6. **Offene Fälle** (Abschnitt 2, Liste am Ende) an die Projektverantwortlichen und die Bewegung geben – lokale Kenntnisse sind hier wertvoller als weitere Websuche.

## 5. Dateien

| Datei | Inhalt |
|---|---|
| `data/research/manual.json` | handgeprüfte Quellen (eine Quelle kann mehrere Standorte belegen) |
| `data/research/bsr-review.json` | Urteile zu den BSR-Treffern |
| `data/research/sources.json` | zusammengeführte Quellen je Standort (BSR + manuell) |
| `data/research/candidates.json` | unbewertete Hinweise (Wikipedia-Nachweise, Wikidata-Websites) |
| `data/research/checks.json` | BSR-, Wikidata- und OSM-Prüfungen je Standort |
| `docs/research/coverage.csv` | eine Zeile je Standort: Quellen, Urteile, Prüfungen, offene Punkte |

Nachvollziehen: `node scripts/research/manual.mjs && node scripts/research/bsr.mjs && node scripts/research/summarize.mjs`; die Validierung (`npm run validate`) prüft das Schema aller Recherche-Dateien.
