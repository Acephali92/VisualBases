# Datenqualitätsbericht

Automatisch erzeugt von `scripts/validate-data.mjs` am 2026-11-08. Regeln: [DATA-QUALITY.md](DATA-QUALITY.md).

## Überblick

| Kennzahl | Wert |
|---|---|
| Standorte | 365 |
| mit eigener Quelle (außer Wikipedia) | 74 |
| ohne eigene, aber mit geprüfter Recherchequelle (sources.json) | 200 |
| nur Wikipedia | 74 |
| ohne jede Quelle | 17 |
| Standorte mit widersprochener Aussage (Recherche oder offener Vorschlag) | 1 |
| auf visualbases.org als „Review“ markiert | 21 |
| angewandte Korrekturen (claims.json) / offene Vorschläge | 56 / 1 |
| Einträge mit Prüfhinweis | 83 |
| Kontext-Standorte (eigenes Staatsgebiet) | 9 |
| Position ungeprüft (corrections.json) | 0 |
| Position ungefähr | 14 |
| Positionsgenauigkeit: Anlage / Referenzpunkt der Quelle / Ort / Region | 11 / 340 / 9 / 5 |
| Korrekturen, deren Quellwert sich inzwischen geändert hat | 0 |
| Position redaktionell bestätigt (corrections.json) / damit quittierte Geo-Warnungen | 17 / 12 |
| Bilder: frei lizenziert / Google Earth / eigenes Archiv / ungeklärt (nicht veröffentlicht) | 61 / 65 / 8 / 30 (von 164) |
| Meldungen | 78 |
| **Fehler** (blockieren das Deployment) | **0** |
| Warnungen (blockieren nicht) | 250 |

## Entwicklung seit 2026-11-07

| Kennzahl | vorher | jetzt | Änderung |
|---|---|---|---|
| Fehler | 0 | 0 | ±0 |
| Warnungen | 276 | 250 | -26 |
| mit eigener Quelle | 74 | 74 | ±0 |
| nur geprüfte Recherchequelle | 199 | 200 | +1 |
| ohne geprüfte Quelle (nur Wikipedia oder keine) | 92 | 91 | -1 |
| Position unabhängig belegt | 118 | 137 | +19 |
| Position ungefähr | 8 | 14 | +6 |
| geografische Warnungen | 24 | 8 | -16 |
| ungeklärte Dubletten | 1 | 0 | -1 |
| Standorte mit widersprochener Aussage | 1 | 1 | ±0 |
| offene Vorschläge | 1 | 1 | ±0 |
| angewandte Korrekturen | 46 | 56 | +10 |

## Geografie

| Kennzahl | Wert |
|---|---|
| Standorte mit Koordinate | 365 |
| Position unabhängig belegt (mind. ein Beleg) | 137 |
| … durch angenommene Positionskorrektur (claims.json) | 15 |
| … durch geprüfte Quelle zur Lage (sources.json) | 1 |
| … redaktionell bestätigt (corrections.json) | 17 |
| … OpenStreetMap: Militärgelände ≤ 1 km an der aktuellen Position | 110 |
| Position ohne unabhängigen Beleg (nur Kartenlink der Quelle) | 228 |
| Genauigkeit: Anlage / Referenzpunkt der Quelle / Ort / Region | 11 / 340 / 9 / 5 |
| Koordinate außerhalb des Gastlands (`coords-country`) | 0 |
| in umstrittenem Gebiet / auf See (`coords-country-disputed`, `coords-offshore`) | 0 / 0 |
| ungeklärte Dubletten (`duplicate-position-facility`, `duplicate-name-near`) | 0 |
| Abweichung von Wikidata / kein Militärgelände in OSM | 0 / 1 |
| OSM-Prüfung veraltet (Position seither geändert) | 7 |
| quittierte Geo-Warnungen (corrections.json, `confirmed`) | 12 |

## Fehler

Keine.

## Warnungen

### `sources-wikipedia-only` (74)

- `al-minhad-ab`: only Wikipedia as source
- `bagram-air-base`: only Wikipedia as source
- `camp-marmal-john-pratt`: only Wikipedia as source
- `camp-shaheen-camp-mike-spann`: only Wikipedia as source
- `herat-unnamed`: only Wikipedia as source
- `kandahar-airfield`: only Wikipedia as source
- `masar-i-sharif-communnity`: only Wikipedia as source
- `ushuaia`: only Wikipedia as source
- `savaneta-kamp`: only Wikipedia as source
- `aruba`: only Wikipedia as source
- `bujumbura-burundi`: only Wikipedia as source
- `bdf-glen-valley-botswana`: only Wikipedia as source
- `air-force-301-cameroon`: only Wikipedia as source
- `pratas-islands-south-china-sea`: only Wikipedia as source
- `arauca`: only Wikipedia as source
- `telecom-cape-verde`: only Wikipedia as source
- `conversion-area-bitburg`: only Wikipedia as source
- `tirpitzhafen-kiel`: only Wikipedia as source
- `oberauerbach-polygone`: only Wikipedia as source
- `medical-material-center-europe`: only Wikipedia as source
- `satellite-ground-system-ramstein`: only Wikipedia as source
- `marinestutzpunkt-hohe-dune-rostock`: only Wikipedia as source
- `jsdf-base-djibouti`: only Wikipedia as source
- `boufarik-base`: only Wikipedia as source
- `nurmsi-airfield-estonia`: only Wikipedia as source
- `lugar-research-center-georgia`: only Wikipedia as source
- `librevillegabon`: only Wikipedia as source
- `camp-century-greenland`: only Wikipedia as source
- `pae-du-lamentin-guadeloupe`: only Wikipedia as source
- `guam-naval-base`: only Wikipedia as source
- `gracias-a-dios-honduras`: only Wikipedia as source
- `training-area-eugen-kvaternik`: only Wikipedia as source
- `dimona-radar-facility`: only Wikipedia as source
- `camp-speicher`: only Wikipedia as source
- `ghedi-ab`: only Wikipedia as source
- `maritime-component-command-naples`: only Wikipedia as source
- `salto-di-quirra-sardinia`: only Wikipedia as source
- `decimomannu-ab-sardinia`: only Wikipedia as source
- `okinawa`: only Wikipedia as source
- `jasdf-naha-air-base`: only Wikipedia as source
- … und 34 weitere

### `media-rights-unclear` (30)

- not published until the rights are settled: Camp_Delta_Guantanamo_Bay_Wikipedia.jpg (Wikimedia Commons)
- not published until the rights are settled: campaign_Ansbach.png (Kampagne / campaign)
- not published until the rights are settled: 2015_LBB_NATO-Pipeline-RLP.jpg (visualbases.org)
- not published until the rights are settled: US-Army-Bremerhaven.jpg (visualbases.org)
- not published until the rights are settled: campaign_Buchel.jpg (Kampagne / campaign)
- not published until the rights are settled: Germersheim_Homepage.png (visualbases.org)
- not published until the rights are settled: Hahn_Homepage_Statistic_2006-2020.png (visualbases.org)
- not published until the rights are settled: campaign_Kalkar.png (Kampagne / campaign)
- not published until the rights are settled: campaign_Erbenheim.png (Kampagne / campaign)
- not published until the rights are settled: Marcha_contra_la_base_de_rota-scaled.jpg (Wikimedia Commons)
- not published until the rights are settled: campaign_Yorkshire.jpg (Kampagne / campaign)
- not published until the rights are settled: Menwith-Hill-Day-of-Action-2011-Flickr.jpg (Flickr)
- not published until the rights are settled: Wikimedia_Satellite_Dish_RAF_Oakhanger_328959.jpeg (Wikimedia Commons)
- not published until the rights are settled: campaign_noMUOS.png (Kampagne / campaign)
- not published until the rights are settled: Military_facilities_of_the_United_States_in_Japan_2016.gif (visualbases.org)
- not published until the rights are settled: campaign_okinawa.jpg (Kampagne / campaign)
- not published until the rights are settled: campaign_nohelipads-okinawa.jpg (Kampagne / campaign)
- not published until the rights are settled: campaign_jeju-island.png (Kampagne / campaign)
- not published until the rights are settled: Wikimedia_Aegis_Ashore_Missile_Defense_Complex_Romania.jpg (Wikimedia Commons)
- not published until the rights are settled: 2021-07-09_Vine_photo.png (visualbases.org)
- not published until the rights are settled: AnnWright.png (visualbases.org)
- not published until the rights are settled: 2021-07_A-Young_Screenshot2.png (visualbases.org)
- not published until the rights are settled: 2021-07_Okinawa_Screenshot.png (visualbases.org)
- not published until the rights are settled: 2021-07-09_Philippines-photo.png (visualbases.org)
- not published until the rights are settled: 2021-07_Julieta_Screenshot.png (visualbases.org)
- not published until the rights are settled: 2021-07-09_Lannon_photo.png (visualbases.org)
- not published until the rights are settled: 2021-04-05_Alain_Rouy.jpg (visualbases.org)
- not published until the rights are settled: 2021-07-09_Webb_photo.png (visualbases.org)
- not published until the rights are settled: 2021-07-09_Guantanomo-photo.png (visualbases.org)
- not published until the rights are settled: campaign_shannon-watch.jpg (Kampagne / campaign)

### `issue-site-type-from-status` (26)

- `bagram-air-base`: site-type-from-status
- `camp-marmal-john-pratt`: site-type-from-status
- `camp-shaheen-camp-mike-spann`: site-type-from-status
- `herat-unnamed`: site-type-from-status
- `kandahar-airfield`: site-type-from-status
- `masar-i-sharif-communnity`: site-type-from-status
- `nas-argentia-newfoundland`: site-type-from-status
- `conversion-area-bitburg`: site-type-from-status
- `darmstadt-training-center`: site-type-from-status
- `raf-bicester`: site-type-from-status
- `camp-century-greenland`: site-type-from-status
- `camp-speicher`: site-type-from-status
- `camp-walker-taeku`: site-type-from-status
- `us-camp-castor`: site-type-from-status
- `us-air-base-201`: site-type-from-status
- `dirkou-ab-niger`: site-type-from-status
- `niamey-air-base`: site-type-from-status
- `mount-st-rita-naval-link-station`: site-type-from-status
- `vieques-island-training-area`: site-type-from-status
- `al-tanf-syria`: site-type-from-status
- `khmeimim-ab`: site-type-from-status
- `material-technical-support-point-tartus-syria`: site-type-from-status
- `rumeilan-air-base`: site-type-from-status
- `unnamed-syria-airfield`: site-type-from-status
- `fort-lamy-ab-djamena`: site-type-from-status
- `johnston-atoll`: site-type-from-status

### `issue-nation-missing` (25)

- `kucova-albania`: nation-missing
- `bdf-glen-valley-botswana`: nation-missing
- `altmark-training-area`: nation-missing
- `deu-bellheim`: nation-missing
- `bergen-training-area`: nation-missing
- `nato-pipeline-station-bitburg`: nation-missing
- `kalkar-von-seydlitz-kaserne`: nation-missing
- `munster-training-area`: nation-missing
- `oberlausitz-training-area`: nation-missing
- `marinestutzpunkt-hohe-dune-rostock`: nation-missing
- `wilhelmsburg-barracks-ulm`: nation-missing
- `raf-digby`: nation-missing
- `camp-ayanganna`: nation-missing
- `namfi-souda-bay`: nation-missing
- `maritime-component-command-naples`: nation-missing
- `salto-di-quirra-sardinia`: nation-missing
- `decimomannu-ab-sardinia`: nation-missing
- `poligono-militare-nato-sardinia-italy`: nation-missing
- `jasdf-naha-air-base`: nation-missing
- `jpn-yonaguni`: nation-missing
- `siauliai-lithuania`: nation-missing
- `sinjajevina-montenegro`: nation-missing
- `trondheim`: nation-missing
- `21-centralny-poligon-lotniczy`: nation-missing
- `johnston-atoll`: nation-missing

### `issue-review-on-origin` (21)

- `nas-argentia-newfoundland`: review-on-origin
- `cartagena`: review-on-origin
- `telecom-cape-verde`: review-on-origin
- `marinestutzpunkt-hohe-dune-rostock`: review-on-origin
- `boufarik-base`: review-on-origin
- `gchq-bude`: review-on-origin
- `raf-oakhanger`: review-on-origin
- `sarajevo-military-airport`: review-on-origin
- `abdullah-al-mubarak-ab`: review-on-origin
- `guelmim-airport`: review-on-origin
- `inezgane-airport`: review-on-origin
- `windhoek-namibia`: review-on-origin
- `trondheim`: review-on-origin
- `makran-pakistan`: review-on-origin
- `shahbaz-ab`: review-on-origin
- `pasni-base-port`: review-on-origin
- `shamsi-airfield-pakistan`: review-on-origin
- `deveselu-base`: review-on-origin
- `ocean-side-mogadishu`: review-on-origin
- `principe-island-sao-tome`: review-on-origin
- `taiwan`: review-on-origin

### `sources-none` (17)

- `kabul-isaf-headquarters`: no source at all
- `ouagadougou`: no source at all
- `ausenfeuerstellung-205-baumholder`: no source at all
- `eichbuck-illesheim`: no source at all
- `radio-relay-site-rummelsberg`: no source at all
- `port-gentil-gabon`: no source at all
- `camp-ayanganna`: no source at all
- `zadar-gazenica-croatia`: no source at all
- `command-ground-system-sigonella`: no source at all
- `vicenza-padova`: no source at all
- `kenyan-naval-base`: no source at all
- `taegu-region`: no source at all
- `deblin-irena-air-base`: no source at all
- `nadarzyce-air-base`: no source at all
- `singapore`: no source at all
- `ocean-side-mogadishu`: no source at all
- `unnamed-syria-airfield`: no source at all

### `coords-approx` (14)

- `masar-i-sharif-communnity`: approximate position (precision "town", confirmed in corrections.json)
- `cartagena`: approximate position (precision "region", confirmed in corrections.json)
- `gitmo-guantanamo-bay`: approximate position (geocoded by hand)
- `raf-akrotiri`: approximate position (geocoded by hand)
- `bann-communications-station`: approximate position (precision "town", confirmed in corrections.json)
- `camp-century-greenland`: approximate position (geocoded by hand)
- `puerto-castilla-honduras`: approximate position (precision "town", set by a position claim)
- `gracias-a-dios-honduras`: approximate position (precision "region", confirmed in corrections.json)
- `karlovac-croatia-2`: approximate position (precision "town", set by a position claim)
- `jungle-warfare-training-center`: approximate position (precision "region", set by a position claim)
- `white-beach-okinawa`: approximate position (geocoded by hand)
- `inezgane-airport`: approximate position (geocoded by hand)
- `secon-thomas-shoal`: approximate position (precision "region", set by a position claim)
- `vieques-island-training-area`: approximate position (precision "region", confirmed in corrections.json)

### `coords-precision` (8)

- `herat-unnamed`: low precision (34.2034, 62.25)
- `eichbuck-illesheim`: low precision (49.44, 10.4089)
- `kapaun-air-station-kaiserslautern`: low precision (49.43, 7.7127)
- `raf-gibraltar`: low precision (36.15, -5.3496)
- `camp-century-greenland`: low precision (77.1797, -61.11)
- `camp-kinser-okinawa`: low precision (26.2586, 127.7)
- `kadena-ammunition-okinawa`: low precision (26.3989, 127.81)
- `ramsund-naval-station`: low precision (68.46, 16.5371)

### `position-check-stale` (7)

- `camp-shaheen-camp-mike-spann`: OSM check refers to a position 3.1 km away – run scripts/research/osm-check.mjs again
- `naval-comm-station-exmouth`: OSM check refers to a position 14.3 km away – run scripts/research/osm-check.mjs again
- `robertson-barracks`: OSM check refers to a position 8.9 km away – run scripts/research/osm-check.mjs again
- `aruba`: OSM check refers to a position 11.1 km away – run scripts/research/osm-check.mjs again
- `ouagadougou`: OSM check refers to a position 7.9 km away – run scripts/research/osm-check.mjs again
- `bezmer-air-base`: OSM check refers to a position 5.4 km away – run scripts/research/osm-check.mjs again
- `money-island-south-chinese-sea`: OSM check refers to a position 7.3 km away – run scripts/research/osm-check.mjs again

### `issue-multiple-site-types` (6)

- `deu-bellheim`: multiple-site-types
- `satcom-landstuhl`: multiple-site-types
- `sennelager`: multiple-site-types
- `i-solbiate-olona`: multiple-site-types
- `sinjajevina-montenegro`: multiple-site-types
- `rzeszow`: multiple-site-types

### `news-date-vague` (6)

- news item without exact date: "Trump’s battle plan for Iran"
- news item without exact date: "Visual Database Lets You Examine Over 900 U.S. Bases Outside"
- news item without exact date: "Romania To Host Largest NATO Military Base in Europe"
- news item without exact date: "Korea war bases: U.S. in Pyeongtaek tops the charts"
- news item without exact date: "US bases on Guam"
- news item without exact date: "Was haben US-Biolaboratorien in der Ukraine zu suchen?"

### `issue-continent-check` (5)

- `guam-naval-base`: continent-check
- `andersen-afb-guam`: continent-check
- `naval-base-guam`: continent-check
- `johnston-atoll`: continent-check
- `naval-radio-transmitter-lualualei`: continent-check

### `issue-no-site-type` (4)

- `gitmo-guantanamo-bay`: no-site-type
- `white-beach-okinawa`: no-site-type
- `jpn-yonaguni`: no-site-type
- `marshall-islands`: no-site-type

### `issue-foreign-without-foreign-presence` (3)

- `pratas-islands-south-china-sea`: foreign-without-foreign-presence
- `money-island-south-chinese-sea`: foreign-without-foreign-presence
- `pattle-island`: foreign-without-foreign-presence

### `issue-duplicate-entry` (1)

- `de-kl-warrior-preparation-center`: duplicate-entry

### `issue-out-of-scope-candidate` (1)

- `camp-ayanganna`: out-of-scope-candidate

### `duplicate-position-reviewed` (1)

- `de-kl-warrior-preparation-center`: same position as warrior-preparation-center-einsiedlerhof (194 m) – de-kl-warrior-preparation-center is marked as duplicate entry in claims.json

### `position-osm-none` (1)

- `darmstadt-training-center`: OpenStreetMap shows no military area or aerodrome within 3 km

