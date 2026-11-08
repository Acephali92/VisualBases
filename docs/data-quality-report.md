# Datenqualitätsbericht

Automatisch erzeugt von `scripts/validate-data.mjs` am 2026-11-08. Regeln: [DATA-QUALITY.md](DATA-QUALITY.md).

## Überblick

| Kennzahl | Wert |
|---|---|
| Standorte | 365 |
| mit eigener Quelle (außer Wikipedia) | 74 |
| nur Wikipedia | 218 |
| ohne jede Quelle | 73 |
| auf visualbases.org als „Review“ markiert | 21 |
| angewandte Korrekturen (claims.json) / offene Vorschläge | 47 / 1 |
| Einträge mit Prüfhinweis | 83 |
| Kontext-Standorte (eigenes Staatsgebiet) | 9 |
| Position ungeprüft (corrections.json) | 0 |
| Position ungefähr | 8 |
| Positionsgenauigkeit: Anlage / Referenzpunkt der Quelle / Ort / Region | 4 / 353 / 7 / 1 |
| Korrekturen, deren Quellwert sich inzwischen geändert hat | 0 |
| Position redaktionell bestätigt (corrections.json) / damit quittierte Geo-Warnungen | 0 / 0 |
| Bilder / davon mit Lizenzangabe | 164 / 19 |
| Meldungen | 78 |
| **Fehler** | **0** |
| Warnungen | 431 |

## Fehler

Keine.

## Warnungen

### `sources-wikipedia-only` (218)

- `al-minhad-ab`: only Wikipedia as source
- `bagram-air-base`: only Wikipedia as source
- `camp-marmal-john-pratt`: only Wikipedia as source
- `camp-shaheen-camp-mike-spann`: only Wikipedia as source
- `herat-unnamed`: only Wikipedia as source
- `kandahar-airfield`: only Wikipedia as source
- `masar-i-sharif-communnity`: only Wikipedia as source
- `kucova-albania`: only Wikipedia as source
- `ushuaia`: only Wikipedia as source
- `naval-comm-station-exmouth`: only Wikipedia as source
- `robertson-barracks`: only Wikipedia as source
- `tindal-raaf-base`: only Wikipedia as source
- `savaneta-kamp`: only Wikipedia as source
- `aruba`: only Wikipedia as source
- `chievres-ab`: only Wikipedia as source
- `kleine-brogel-air-base`: only Wikipedia as source
- `shape-mons`: only Wikipedia as source
- `zutendaal-ab-belgium`: only Wikipedia as source
- `bezmer-air-base`: only Wikipedia as source
- `graf-ignatievo-ab-bulgaria`: only Wikipedia as source
- `nsa-coast-guard-bahrain`: only Wikipedia as source
- `shaikh-isa-air-base-bahrain`: only Wikipedia as source
- `bujumbura-burundi`: only Wikipedia as source
- `bfb-garrison-seria`: only Wikipedia as source
- `autec-bahamas`: only Wikipedia as source
- `bdf-glen-valley-botswana`: only Wikipedia as source
- `nas-argentia-newfoundland`: only Wikipedia as source
- `air-force-301-cameroon`: only Wikipedia as source
- `pratas-islands-south-china-sea`: only Wikipedia as source
- `money-island-south-chinese-sea`: only Wikipedia as source
- `apiay-ab`: only Wikipedia as source
- `arauca`: only Wikipedia as source
- `cartagena`: only Wikipedia as source
- `bahia-malaga`: only Wikipedia as source
- `fuerte-militar-larandia`: only Wikipedia as source
- `malambo-ab`: only Wikipedia as source
- `palanquero-ab`: only Wikipedia as source
- `fuerte-militar-tolemaida`: only Wikipedia as source
- `telecom-cape-verde`: only Wikipedia as source
- `davis-monthan-ab-curacao`: only Wikipedia as source
- … und 178 weitere

### `sources-none` (73)

- `abu-dhabi-uae-2`: no source at all
- `kabul-isaf-headquarters`: no source at all
- `durres-albania`: no source at all
- `darwin-raaf-base`: no source at all
- `east-chapman-satellite-station`: no source at all
- `ghan-joint-defence-pine-gap`: no source at all
- `learmonth-raaf-base`: no source at all
- `kleine-brogel-nuclear`: no source at all
- `ouagadougou`: no source at all
- `aitos-bulgaria`: no source at all
- `novo-selo`: no source at all
- `salak-cameroon`: no source at all
- `pattle-island`: no source at all
- `gitmo-guantanamo-bay`: no source at all
- `freihoelser-training-area-amberg`: no source at all
- `barton-barracks-ansbach`: no source at all
- `bismarck-kaserne-ansbach`: no source at all
- `shipton-kaserne-ansbach`: no source at all
- `baumholder-army-health-clinic`: no source at all
- `ausenfeuerstellung-205-baumholder`: no source at all
- `walter-wetzel-kaserne-baumholder`: no source at all
- `artillery-kaserne-garmisch-partenkirchen`: no source at all
- `gruenstadt-aafes-fac`: no source at all
- `oberdachstetten-training-area`: no source at all
- `eichbuck-illesheim`: no source at all
- `mccully-barracks-wackernheim`: no source at all
- `kaiserslautern-army-depot`: no source at all
- `de-kl-warrior-preparation-center`: no source at all
- `warrior-preparation-center-einsiedlerhof`: no source at all
- `kapaun-air-station-kaiserslautern`: no source at all
- `daenner-kaserne`: no source at all
- `kleber-kaserne-kaiserslautern`: no source at all
- `panzer-kaserne-kaiserslautern`: no source at all
- `pulaski-barracks-kaiserslautern`: no source at all
- `rhine-ordnance-barracks-vogelweh`: no source at all
- `radio-relay-site-rummelsberg`: no source at all
- `echterdingen-airfield`: no source at all
- `base-aerienne-188-djibouti`: no source at all
- `port-gentil-gabon`: no source at all
- `base-nautique-de-stoupan`: no source at all
- … und 33 weitere

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

### `position-wikidata-far` (11)

- `camp-shaheen-camp-mike-spann`: Wikidata Q29546985 (attempted murder) is 12.3 km away (tolerance 5 km) – wrong match or wrong position?
- `robertson-barracks`: Wikidata Q7352085 (barracks) is 9.5 km away (tolerance 5 km) – wrong match or wrong position?
- `money-island-south-chinese-sea`: Wikidata Q1098039 (island) is 7.4 km away (tolerance 5 km) – wrong match or wrong position?
- `dhekelia-military-camp`: Wikidata Q37362 (British Overseas Territories) is 82.2 km away (tolerance 15 km) – wrong match or wrong position?
- `us-camp-lemonnier`: Wikidata Q2935221 (military camp) is 25.6 km away (tolerance 5 km) – wrong match or wrong position?
- `maritime-component-command-naples`: Wikidata Q1476257 (command) is 17.7 km away (tolerance 5 km) – wrong match or wrong position?
- `secon-thomas-shoal`: Wikidata Q6855008 (reef) is 43.9 km away (tolerance 15 km) – wrong match or wrong position?
- `redzikowo`: Wikidata Q4064211 (missile base) is 32.7 km away (tolerance 5 km) – wrong match or wrong position?
- `s-kristinehamm`: Wikidata Q215832 (urban area in Sweden) is 40.9 km away (tolerance 15 km) – wrong match or wrong position?
- `beale-air-force-base-california`: Wikidata Q812921 (airbase, census-designated place in the United States) is 5.7 km away (tolerance 5 km) – wrong match or wrong position?
- `fort-greely-alaska`: Wikidata Q5471246 (military installation) is 29.7 km away (tolerance 15 km) – wrong match or wrong position?

### `position-osm-none` (9)

- `masar-i-sharif-communnity`: OpenStreetMap shows no military area or aerodrome within 3 km
- `aruba`: OpenStreetMap shows no military area or aerodrome within 3 km
- `ouagadougou`: OpenStreetMap shows no military area or aerodrome within 3 km
- `bezmer-air-base`: OpenStreetMap shows no military area or aerodrome within 3 km
- `money-island-south-chinese-sea`: OpenStreetMap shows no military area or aerodrome within 3 km
- `cartagena`: OpenStreetMap shows no military area or aerodrome within 3 km
- `darmstadt-training-center`: OpenStreetMap shows no military area or aerodrome within 3 km
- `grafenwoehr-training-area`: OpenStreetMap shows no military area or aerodrome within 3 km
- `gruenstadt-aafes-fac`: OpenStreetMap shows no military area or aerodrome within 3 km

### `coords-precision` (8)

- `herat-unnamed`: low precision (34.2034, 62.25)
- `eichbuck-illesheim`: low precision (49.44, 10.4089)
- `kapaun-air-station-kaiserslautern`: low precision (49.43, 7.7127)
- `raf-gibraltar`: low precision (36.15, -5.3496)
- `camp-century-greenland`: low precision (77.1797, -61.11)
- `camp-kinser-okinawa`: low precision (26.2586, 127.7)
- `kadena-ammunition-okinawa`: low precision (26.3989, 127.81)
- `ramsund-naval-station`: low precision (68.46, 16.5371)

### `coords-approx` (8)

- `gitmo-guantanamo-bay`: approximate position (geocoded by hand)
- `raf-akrotiri`: approximate position (geocoded by hand)
- `camp-century-greenland`: approximate position (geocoded by hand)
- `puerto-castilla-honduras`: approximate position (precision "town", set by a position claim)
- `karlovac-croatia-2`: approximate position (precision "town", set by a position claim)
- `jungle-warfare-training-center`: approximate position (precision "region", set by a position claim)
- `white-beach-okinawa`: approximate position (geocoded by hand)
- `inezgane-airport`: approximate position (geocoded by hand)

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

### `coords-offshore` (3)

- `bahrain`: position lies at sea, no land within 10 km (host BH)
- `pratas-islands-south-china-sea`: position lies at sea, no land within 10 km (host CN)
- `secon-thomas-shoal`: position lies at sea, no land within 10 km (host PH)

### `issue-duplicate-entry` (1)

- `de-kl-warrior-preparation-center`: duplicate-entry

### `issue-out-of-scope-candidate` (1)

- `camp-ayanganna`: out-of-scope-candidate

### `duplicate-position-reviewed` (1)

- `de-kl-warrior-preparation-center`: same position as warrior-preparation-center-einsiedlerhof (194 m) – de-kl-warrior-preparation-center is marked as duplicate entry in claims.json

### `duplicate-name-near` (1)

- `bann-communications-station`: same name as bann-communications-station-2 ("Landstuhl: Bann Communications Station 2"), 2.6 km apart – one facility posted twice?

### `position-check-stale` (1)

- `naval-comm-station-exmouth`: OSM check refers to a position 14.3 km away – run scripts/research/osm-check.mjs again

