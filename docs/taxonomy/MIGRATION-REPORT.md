# Migrationsbericht Taxonomie v1 → v2

Erzeugt mit `scripts/migration-report.mjs` am 2026-11-07. Einzelwerte je Standort: [migration-v1-v2.csv](migration-v1-v2.csv). Regeln: [TAXONOMY.md](../TAXONOMY.md#12-migrationsregeln).

## Vollständigkeit

| Prüfung | v1 | v2 |
|---|---:|---:|
| Standorte | 365 | 365 |
| Quellenlinks | 94 | 94 |
| Bildreferenzen | 139 | 139 |
| Wikipedia-Links | 371 | 371 |
| Notizen | 258 | 258 |
| Standorte ohne Standorttyp | – | 0 |

Standort-IDs und damit alle URLs (`#/base/<id>`, `b/<id>.html`) sind unverändert.

## Standortart (v1) → Standorttyp und Status (v2)

| v1 → v2 | Standorte |
|---|---:|
| foreign → foreign-base | 137 |
| shared → shared-base | 101 |
| closed → military-base + closed | 26 |
| national → host-base-foreign-use | 26 |
| foreign → overseas-base | 15 |
| hotspot → region-cluster | 13 |
| unspecific → unspecified | 12 |
| facility → special-facility | 9 |
| civilian → civilian-site | 8 |
| hotspot → garrison | 8 |
| usglobal → domestic-global | 7 |
| foreign → foreign-base + closed | 1 |
| closed → unspecified + closed | 1 |
| shared → region-cluster | 1 |

## Angewandte Korrekturen (data/claims.json)

- `bagram-air-base` – period: – → {"to":"2021-07"}. Anfang Juli 2021 an die afghanischen Sicherheitskräfte übergeben.
- `camp-marmal-john-pratt` – presences: [{"nation":"US","role":"stationing","via":"tag"}] → [{"nation":"US","role":"stationing","via":"tag"},{"nation":"DE","role":"stationing","via":"claim"}]. Camp Marmal war das größte Feldlager der Bundeswehr in Afghanistan.
- `camp-marmal-john-pratt` – period: – → {"to":"2021-06-29"}. Geräumt am 29.06.2021.
- `kabul-isaf-headquarters` – status: "active" → "closed". Die Mission Resolute Support (Nachfolgerin von ISAF) wurde Anfang September 2021 beendet.
- `kabul-isaf-headquarters` – period: – → {"to":"2021-09"}. Beendet im September 2021.
- `kleine-brogel-nuclear` – presences: [] → [{"nation":"US","role":"stationing","via":"claim"}]. RTBF nennt das 701st Munitions Support Squadron der US Air Force am Lager; die Atomwaffenlagerung selbst ist offiziell nicht bestätigt (Schätzung der FAS).
- `gitmo-guantanamo-bay` – presences: [] → [{"nation":"US","role":"stationing","via":"claim"}]. Der Base Structure Report FY2023 führt die Naval Station Guantánamo Bay der US Navy.
- `raf-akrotiri` – presences: [{"nation":"GB","role":"stationing","via":"tag"}] → [{"nation":"GB","role":"stationing","via":"tag"},{"nation":"US","role":"co-user","via":"claim"}]. Der Base Structure Report FY2023 führt bei RAF Akrotiri zusätzlich einen Standort der US Air Force.
- `medical-material-center-europe` – status: "active" → "closed". Das US Army Medical Materiel Center–Europe ist im Oktober 2021 von Pirmasens nach Kaiserslautern (Army Depot) umgezogen; der Standort Pirmasens ist ehemalig.
- `medical-material-center-europe` – period: – → {"from":"1975","to":"2021-10"}. In Pirmasens von 1975 bis Oktober 2021.
- `base-aerienne-188-djibouti` – presences: [{"nation":"US","role":"stationing","via":"tag"}] → [{"nation":"FR","role":"stationing","via":"claim"}]. BA 188 ist eine Basis der französischen Streitkräfte in Dschibuti (FFDj). Die US-Präsenz ist das benachbarte Camp Lemonnier.
- `camp-ayanganna` – host: {"country":"FR","territory":"GF"} → {"country":"GY"}. Camp Ayanganna liegt in Georgetown (Guyana), nicht in Französisch-Guayana.
- `camp-ayanganna` – region: "caribbean" → "america-latin". Region folgt aus der Lage in Guyana.
- `camp-ayanganna` – presences: [{"nation":"FR","role":"stationing","via":"tag"}] → []. Camp Ayanganna ist das Hauptquartier der Streitkräfte Guyanas; eine französische Präsenz ist nicht belegt.
- `camp-ayanganna` – siteType: "overseas-base" → "unspecified". Keine ausländische Basis: Ohne belegte fremde Präsenz passt keine Standortart des Atlas. Ob der Eintrag im Atlas bleibt, entscheiden die Projektverantwortlichen.
- `sarajevo-military-airport` – host: {"country":"HR"} → {"country":"BA"}. Sarajevo und Camp Butmir liegen in Bosnien und Herzegowina, nicht in Kroatien.
- `papa-ab-hungary` – presences: [] → [{"nation":"US","role":"co-user","via":"claim"}]. Die multinationale Heavy Airlift Wing in Pápa (12 Staaten) schließt die USA ein.
- `muwaffaq-salti-air-base-al-azraq-jordan` – presences: [] → [{"nation":"US","role":"stationing","via":"claim"}]. Der Base Structure Report FY2023 führt Muwaffaq Salti als Standort der US Air Force.
- `us-camp-castor` – presences: [{"nation":"US","role":"stationing","via":"tag"},{"nation":"DE","role":"co-user","via":"tag"}] → [{"nation":"DE","role":"stationing","via":"claim"}]. Camp Castor war ein deutsches Feldlager der UN-Mission MINUSMA, kein US-Lager.
- `us-camp-castor` – period: – → {"to":"2023-12-12"}. Am 12.12.2023 übergeben.
- `us-air-base-201` – period: – → {"to":"2024-08"}. US-Abzug im August 2024 abgeschlossen.
- `niamey-air-base` – period: – → {"to":"2024"}. US-Abzug aus Niamey im Sommer 2024 (ab 7. Juni, etwa einen Monat). Der Abzug Frankreichs Ende 2023 ist durch diese Quelle nicht belegt.
- `shamsi-airfield-pakistan` – status: "active" → "closed". Die USA haben Shamsi im Dezember 2011 geräumt (u. a. Wartung von Drohnen).
- `shamsi-airfield-pakistan` – period: – → {"to":"2011-12"}. US-Nutzung bis Dezember 2011.
- `al-udeid-doha` – presences: [{"nation":"GB","role":"stationing","via":"tag"}] → [{"nation":"GB","role":"stationing","via":"tag"},{"nation":"US","role":"stationing","via":"claim"}]. Der Base Structure Report FY2023 führt Al Udeid als Standort der US Air Force.
- `base-aerienne-dakar` – status: "active" → "closed". Frankreich hat am 17.07.2025 seine letzten Stützpunkte im Senegal übergeben, darunter den Flugplatz am Flughafen Dakar.
- `base-aerienne-dakar` – period: – → {"to":"2025-07-17"}. Übergeben am 17.07.2025.
- `al-tanf-syria` – period: – → {"to":"2026-02"}. US-Abzug laut CENTCOM im Februar 2026 abgeschlossen; an die syrische Regierung übergeben.
- `rumeilan-air-base` – period: – → {"to":"2026-03-14"}. US-Abzug am 14.03.2026 (eine Quelle, die sich auf die Syrische Beobachtungsstelle für Menschenrechte stützt; Kharab al-Jir und Rmeilan werden uneinheitlich benannt).

## Manuell zu prüfen

87 Einträge tragen einen Prüfhinweis oder einen offenen Korrekturvorschlag.

| Hinweis | Einträge |
|---|---:|
| Nutzungsform nach Schließung nicht angegeben (`site-type-from-status`) | 26 |
| Keine Stationierungsnation angegeben (`nation-missing`) | 24 |
| Auf visualbases.org zur Prüfung markiert (`review-on-origin`) | 21 |
| Mehrere Standorttypen in der Quelle (`multiple-site-types`) | 6 |
| Kontinent prüfen (`continent-check`) | 5 |
| Ohne Standorttyp in der Quelle (`no-site-type`) | 4 |
| Als ausländisch eingestuft, aber keine ausländische Präsenz (`foreign-without-foreign-presence`) | 3 |
| Position ungeprüft (`position-unverified`) | 2 |
| Gehört möglicherweise nicht in den Atlas (`out-of-scope-candidate`) | 1 |
| Offener Korrekturvorschlag | 8 |

| Standort | Hinweise | Vorschläge |
|---|---|---|
| [Bagram Air Base](../../data/bases.json) (`bagram-air-base`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Camp Marmal / John Pratt, Masar-i Sharif](../../data/bases.json) (`camp-marmal-john-pratt`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Camp Shaheen / Camp Mike Spann, Masar-i Sharif](../../data/bases.json) (`camp-shaheen-camp-mike-spann`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Herat Unnamed](../../data/bases.json) (`herat-unnamed`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Kandahar Airfield](../../data/bases.json) (`kandahar-airfield`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Masar-i Sharif Communnity](../../data/bases.json) (`masar-i-sharif-communnity`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Kucova](../../data/bases.json) (`kucova-albania`) | Keine Stationierungsnation angegeben |  |
| [Glen Valley Gaborone (Botswana)](../../data/bases.json) (`bdf-glen-valley-botswana`) | Keine Stationierungsnation angegeben |  |
| [Naval Air Station Argentia Newfoundland](../../data/bases.json) (`nas-argentia-newfoundland`) | Nutzungsform nach Schließung nicht angegeben, Auf visualbases.org zur Prüfung markiert |  |
| [South China Sea, Pratas-Islands](../../data/bases.json) (`pratas-islands-south-china-sea`) | Als ausländisch eingestuft, aber keine ausländische Präsenz |  |
| [South Chinese Sea, Money Island](../../data/bases.json) (`money-island-south-chinese-sea`) | Als ausländisch eingestuft, aber keine ausländische Präsenz |  |
| [South Chinese Sea, Pattle Island](../../data/bases.json) (`pattle-island`) | Als ausländisch eingestuft, aber keine ausländische Präsenz |  |
| [Cartagena](../../data/bases.json) (`cartagena`) | Auf visualbases.org zur Prüfung markiert |  |
| [The U.S. Military Base in Cuba: „GITMO“ Guantánamo Bay](../../data/bases.json) (`gitmo-guantanamo-bay`) | Ohne Standorttyp in der Quelle |  |
| [Cap Verde: Unnamed Telecommunications Station](../../data/bases.json) (`telecom-cape-verde`) | Auf visualbases.org zur Prüfung markiert |  |
| [Altmark: Truppenübungsplatz](../../data/bases.json) (`altmark-training-area`) | Keine Stationierungsnation angegeben |  |
| [Bellheim: NATO fuel depot](../../data/bases.json) (`deu-bellheim`) | Mehrere Standorttypen in der Quelle, Keine Stationierungsnation angegeben |  |
| [Bergen Training Area](../../data/bases.json) (`bergen-training-area`) | Keine Stationierungsnation angegeben |  |
| [Bitburg: Conversion area / former Air Base](../../data/bases.json) (`conversion-area-bitburg`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Bitburg: NATO-Pipeline Fuel Depot](../../data/bases.json) (`nato-pipeline-station-bitburg`) | Keine Stationierungsnation angegeben |  |
| [Darmstadt Training Center](../../data/bases.json) (`darmstadt-training-center`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Kalkar: von-Seydlitz-Kaserne](../../data/bases.json) (`kalkar-von-seydlitz-kaserne`) | Keine Stationierungsnation angegeben |  |
| [Landstuhl: Enterprise SATCOM Gateway](../../data/bases.json) (`satcom-landstuhl`) | Mehrere Standorttypen in der Quelle |  |
| [Munster training area](../../data/bases.json) (`munster-training-area`) | Keine Stationierungsnation angegeben |  |
| [Oberlausitz Training Area](../../data/bases.json) (`oberlausitz-training-area`) | Keine Stationierungsnation angegeben |  |
| [Rostock: Marinestützpunkt Hohe Düne](../../data/bases.json) (`marinestutzpunkt-hohe-dune-rostock`) | Keine Stationierungsnation angegeben, Auf visualbases.org zur Prüfung markiert |  |
| [Ulm: Wilhelmsburg Barracks](../../data/bases.json) (`wilhelmsburg-barracks-ulm`) | Keine Stationierungsnation angegeben |  |
| [Westfalen Garrison / Training Area, Paderborn-Sennelager](../../data/bases.json) (`sennelager`) | Mehrere Standorttypen in der Quelle |  |
| [Boufarik Military Base (Algeria)](../../data/bases.json) (`boufarik-base`) | Auf visualbases.org zur Prüfung markiert |  |
| [Tapa Army Base](../../data/bases.json) (`tapa-army-base`) |  | Das US-Kontingent in Estland ist 2026 auf unter 100 Soldaten gesunken; eine weitere Rotation und die Präsenz nach 2026 sind offen. |
| [Bicester Airfield](../../data/bases.json) (`raf-bicester`) | Nutzungsform nach Schließung nicht angegeben |  |
| [GCHQ Bude](../../data/bases.json) (`gchq-bude`) | Auf visualbases.org zur Prüfung markiert |  |
| [RAF Digby](../../data/bases.json) (`raf-digby`) | Keine Stationierungsnation angegeben |  |
| [RAF Oakhanger](../../data/bases.json) (`raf-oakhanger`) | Auf visualbases.org zur Prüfung markiert |  |
| [Guayana: Camp Ayanganna](../../data/bases.json) (`camp-ayanganna`) | Keine Stationierungsnation angegeben, Gehört möglicherweise nicht in den Atlas |  |
| [Camp Century (Greenland)](../../data/bases.json) (`camp-century-greenland`) | Nutzungsform nach Schließung nicht angegeben |  |
| [PAE du Lamentin, Guadeloupe](../../data/bases.json) (`pae-du-lamentin-guadeloupe`) |  | Das Pôle aéronautique étatique liegt laut Verteidigungsministerium in Le Lamentin auf Martinique; vermutlich Verwechslung der beiden Lamentin-Gemeinden. |
| [Crete: NAMFI Radar Station Souda Bay](../../data/bases.json) (`namfi-souda-bay`) | Keine Stationierungsnation angegeben |  |
| [Guam](../../data/bases.json) (`guam-naval-base`) | Kontinent prüfen |  |
| [Guam: Andersen Air Force Base](../../data/bases.json) (`andersen-afb-guam`) | Kontinent prüfen |  |
| [Guam: Naval Base](../../data/bases.json) (`naval-base-guam`) | Kontinent prüfen |  |
| [Base Aérea Coronel Enrique Soto Cano](../../data/bases.json) (`puerto-castilla-honduras`) | Position ungeprüft |  |
| [Karlovac](../../data/bases.json) (`karlovac-croatia-2`) | Position ungeprüft |  |
| [Sarajevo Military Airport](../../data/bases.json) (`sarajevo-military-airport`) | Auf visualbases.org zur Prüfung markiert |  |
| [Camp Speicher](../../data/bases.json) (`camp-speicher`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Lombardei, Solbiate Olona: NATO-Kaserne Ugo Mara](../../data/bases.json) (`i-solbiate-olona`) | Mehrere Standorttypen in der Quelle |  |
| [Naples: Maritime Component Command](../../data/bases.json) (`maritime-component-command-naples`) | Keine Stationierungsnation angegeben |  |
| [Sardinia, Salto di Quirra: Training Area](../../data/bases.json) (`salto-di-quirra-sardinia`) | Keine Stationierungsnation angegeben |  |
| [Sardinia: Decimomannu Air Base](../../data/bases.json) (`decimomannu-ab-sardinia`) | Keine Stationierungsnation angegeben |  |
| [Sardinia: Poligono Militare NATO](../../data/bases.json) (`poligono-militare-nato-sardinia-italy`) | Keine Stationierungsnation angegeben |  |
| [Okinawa, Naha: JASDF Air Base](../../data/bases.json) (`jasdf-naha-air-base`) |  | Im Base Structure Report steht nur der US-Hafen Naha Port; die Luftwaffenbasis selbst ist japanisch. Die US-Präsenz an der Basis ist nicht belegt. |
| [Okinawa: White Beach Naval Facility](../../data/bases.json) (`white-beach-okinawa`) | Ohne Standorttyp in der Quelle |  |
| [Yonaguni](../../data/bases.json) (`jpn-yonaguni`) | Ohne Standorttyp in der Quelle, Keine Stationierungsnation angegeben |  |
| [Daegu: Camp Walker](../../data/bases.json) (`camp-walker-taeku`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Abdullah Al-Mubarak Air Base](../../data/bases.json) (`abdullah-al-mubarak-ab`) | Auf visualbases.org zur Prüfung markiert |  |
| [Šiauliai](../../data/bases.json) (`siauliai-lithuania`) | Keine Stationierungsnation angegeben |  |
| [Aéroport de Guelmim](../../data/bases.json) (`guelmim-airport`) | Auf visualbases.org zur Prüfung markiert |  |
| [Inezgane Military Airport (Morocco)](../../data/bases.json) (`inezgane-airport`) | Auf visualbases.org zur Prüfung markiert |  |
| [Sinjajevina](../../data/bases.json) (`sinjajevina-montenegro`) | Mehrere Standorttypen in der Quelle, Keine Stationierungsnation angegeben |  |
| [Ballistic Missile Defense Test Site](../../data/bases.json) (`marshall-islands`) | Ohne Standorttyp in der Quelle |  |
| [US Camp Castor](../../data/bases.json) (`us-camp-castor`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Windhoek](../../data/bases.json) (`windhoek-namibia`) | Auf visualbases.org zur Prüfung markiert |  |
| [Air Base 201, Agadez](../../data/bases.json) (`us-air-base-201`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Dirkou Air Base, Agadez](../../data/bases.json) (`dirkou-ab-niger`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Niamey Air Base](../../data/bases.json) (`niamey-air-base`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Trondheim](../../data/bases.json) (`trondheim`) | Keine Stationierungsnation angegeben, Auf visualbases.org zur Prüfung markiert |  |
| [Thumrait MAP](../../data/bases.json) (`thumrait`) |  | Thumrait steht nur im Base Structure Report FY2019, nicht mehr in FY2023 – der aktuelle Status ist offen. |
| [Mount Santa Rita Naval Link Station](../../data/bases.json) (`mount-st-rita-naval-link-station`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Naval Station Makran](../../data/bases.json) (`makran-pakistan`) | Auf visualbases.org zur Prüfung markiert |  |
| [PAF Base Shahbaz / Jacobabad Airbase, Sindh](../../data/bases.json) (`shahbaz-ab`) | Auf visualbases.org zur Prüfung markiert |  |
| [Pasni Base, Baloshistan](../../data/bases.json) (`pasni-base-port`) | Auf visualbases.org zur Prüfung markiert |  |
| [Shamsi Airfield, Washuk / Balochistan](../../data/bases.json) (`shamsi-airfield-pakistan`) | Auf visualbases.org zur Prüfung markiert |  |
| [Lotniczy: 21 Centralny Poligon](../../data/bases.json) (`21-centralny-poligon-lotniczy`) | Keine Stationierungsnation angegeben |  |
| [Rzeszów](../../data/bases.json) (`rzeszow`) | Mehrere Standorttypen in der Quelle | Die US-Präsenz in Rzeszów-Jasionka wurde 2025 an andere Orte in Polen verlagert; das Drehkreuz bleibt unter polnischer/NATO-Führung aktiv. |
| [Vieques Island Training Area](../../data/bases.json) (`vieques-island-training-area`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Deveselu Base](../../data/bases.json) (`deveselu-base`) | Auf visualbases.org zur Prüfung markiert |  |
| [Mogadishu: Ocean Side Int. Campus](../../data/bases.json) (`ocean-side-mogadishu`) | Auf visualbases.org zur Prüfung markiert |  |
| [Príncipe Island (São Tomé)](../../data/bases.json) (`principe-island-sao-tome`) | Auf visualbases.org zur Prüfung markiert |  |
| [Al-Tanf](../../data/bases.json) (`al-tanf-syria`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Khmeimim Air Base](../../data/bases.json) (`khmeimim-ab`) | Nutzungsform nach Schließung nicht angegeben | visualbases.org führt Khmeimim als geschlossen. Laut Vereinbarung vom August 2026 bleibt eine russische Präsenz in veränderter Form (gemeinsames Ausbildungszentrum); das endgültige Abkommen stand im Herbst 2026 aus. |
| [Material-Technical Support Point, Tartus](../../data/bases.json) (`material-technical-support-point-tartus-syria`) | Nutzungsform nach Schließung nicht angegeben | visualbases.org führt Tartus als geschlossen. Laut Vereinbarung vom August 2026 bleibt eine russische Präsenz in veränderter Form; das endgültige Abkommen stand im Herbst 2026 aus. |
| [Rumeilan Air Base](../../data/bases.json) (`rumeilan-air-base`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Unnamed Airfield](../../data/bases.json) (`unnamed-syria-airfield`) | Nutzungsform nach Schließung nicht angegeben |  |
| [Fort-Lamy Air Base, N’Djamena (Chad)](../../data/bases.json) (`fort-lamy-ab-djamena`) | Nutzungsform nach Schließung nicht angegeben | Frankreich hat im Juni 2025 die Basis Kossei in N’Djamena übergeben. Dass Kossei der Eintrag „Fort-Lamy“ ist, ist eine eigene Annahme und muss geprüft werden. |
| [Taiwan](../../data/bases.json) (`taiwan`) | Auf visualbases.org zur Prüfung markiert |  |
| [Johnston Atoll Airfield](../../data/bases.json) (`johnston-atoll`) | Nutzungsform nach Schließung nicht angegeben, Keine Stationierungsnation angegeben, Kontinent prüfen |  |
| [Hawaii: Naval Radio Transmitter Facility Lualualei](../../data/bases.json) (`naval-radio-transmitter-lualualei`) | Kontinent prüfen |  |
