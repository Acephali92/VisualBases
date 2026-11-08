# Datenqualität

VisualBases soll nachvollziehbar sein: Jede Angabe braucht eine Herkunft, Unsicherheiten müssen sichtbar sein, Fehler dürfen nicht unbemerkt veröffentlicht werden. Dieses Dokument beschreibt die Regeln und Werkzeuge. Den aktuellen Stand zeigt der [Datenqualitätsbericht](data-quality-report.md).

## Datenschichten

| Datei | Herkunft | Pflege |
|---|---|---|
| `data/bases.json` | automatischer Import von visualbases.org (`scripts/import-visualbases.mjs`): Einordnung nach [Taxonomie v2](TAXONOMY.md) plus Rohbegriffe (`origin.terms`) | **nicht von Hand bearbeiten**, wird beim Import überschrieben |
| `data/corrections.json` | Prüf-Schicht: bekannte Probleme und Korrekturvorschläge | von Hand, mit Quelle |
| `data/claims.json` | Korrekturen und Vorschläge je Aussage (Feld, Wert, Quelle, Entscheidung) | von Hand, mit Quelle |
| `data/research/sources.json` | geprüfte Quellen je Standort → Belegstatus je Aussagegruppe | Recherche, siehe [SOURCE-RESEARCH.md](research/SOURCE-RESEARCH.md) |
| `data/media.json`, `data/wikimedia.json` | Bild-Pipeline, Wikimedia-Import | automatisch, Lizenzfelder geprüft |
| `data/news.json`, `data/movement.json` | Presseschau-Import, Initiativen | automatisch / von Hand |

`scripts/build-data.mjs` führt die Schichten mit `scripts/lib/resolve.mjs` zu `public/data/*` zusammen (Modell: [TAXONOMY.md](TAXONOMY.md), Abschnitt 11).

## Prüf-Schicht `data/corrections.json`

Für Datensätze, deren Position nachweislich zweifelhaft ist. Ein Eintrag mit `status: "proposed"` **ändert die Daten nicht**: Er kennzeichnet den Standort in der App als **„Position ungeprüft“**, nennt den Grund und einen Korrekturvorschlag mit Quelle. Korrigiert wird erst nach einer Entscheidung der Projektverantwortlichen, und zwar als angenommener `position`-Claim in `data/claims.json` oder an der Quelle. Danach wird der Eintrag entfernt oder auf `applied` gesetzt.

Stand 2026-11-07: Die Datei enthält keine offenen Einträge. Die beiden früheren Fälle (Puerto Castilla, Karlovac) sind über angenommene `position`-Claims korrigiert (siehe unten).

```jsonc
{
  "id": "karlovac-croatia-2",
  "status": "proposed",               // proposed | applied | confirmed
  "issue": "duplicate-in-source",     // Vokabular siehe unten
  "detail": "…",
  "duplicateOf": "zadar-gazenica-croatia",
  "proposal": { "lat": 45.4893, "lon": 15.5486, "precision": "town",   // site | reference | town | region
                "source": "OpenStreetMap relation 11227312", "url": "https://www.openstreetmap.org/relation/11227312",
                "retrieved": "2026-11-07" }
}
```

| Feld | Pflicht | Werte (geprüft von `npm run validate`, Regel `corrections`) |
|---|---|---|
| `id` | ja | existierender Standort |
| `status` | ja | `proposed` (zweifelhaft, wird gekennzeichnet) · `applied` (korrigiert) · `confirmed` (redaktionell geprüft und beibehalten) |
| `issue` | ja | `duplicate-in-source` · `copied-coordinates` · `wrong-country` · `off-site` (Referenzpunkt neben der Anlage) · `imprecise` (nur Ort/Region bekannt) · `shared-site` (mehrere Einträge teilen sich legitim einen Standort) · `reference-mismatch` (Abgleichsdaten passen nicht – falsches Wikidata-Objekt, Anlage in OSM nicht als militärisch erfasst, Insel fehlt in den Grenzdaten –, die Position selbst ist geprüft) |
| `duplicateOf` | nein | existierender Standort |
| `proposal` | nein | `lat`/`lon` gültig, `source`, `url` (http/https), optional `precision` (`site` · `reference` · `town` · `region`) und `retrieved` (Datum) |
| `source`, `url`, `retrieved` | bei `confirmed` | Beleg für die redaktionelle Entscheidung; das Profil zeigt „✓ Position redaktionell geprüft“ mit Link |
| `note` | nein | Begründung (z. B. „Riff, Position korrekt“) |
| `precision` | nein, nur bei `confirmed` | Genauigkeit der unverändert beibehaltenen Position (`site` · `reference` · `town` · `region`), z. B. `town` für einen Eintrag, zu dem nur die Stadt bekannt ist |
| `rules` | nein, nur bei `confirmed` | welche Geo-Warnungen der Eintrag quittiert (`coords-country`, `coords-country-disputed`, `coords-offshore`, `position-osm-none`, `position-wikidata-far`, `duplicate-name-near`); ohne `rules` alle |

Die Vokabulare stehen in `src/lib/taxonomy.ts` (`POSITION_CHECK_STATUSES`, `POSITION_ISSUES`, `POSITION_PRECISIONS`). Jeder Eintrag, unabhängig vom Status, nimmt den Standort aus der Dublettenprüfung heraus (`duplicate-position-reviewed`).

Veröffentlicht wird das als Feld `positionCheck` an jedem Standort (JSON, GeoJSON) bzw. als CSV-Spalte `position_check` (`unverified:<grund>` nur bei `proposed`, sonst `approximate` für ungefähre Positionen).

## Automatische Validierung

`npm run validate` (`scripts/validate-data.mjs`) läuft:
- vor jedem `npm run build`,
- in **CI & Deploy** vor Tests und Build (ein Fehler verhindert das Deployment),
- in **Daten aktualisieren** (`npm run data:report`): Ein fehlerhafter Import erzeugt keinen Pull Request, sonst wird der Bericht mitgeschickt.

### Fehler (blockieren)

| Regel | Prüfung |
|---|---|
| `file-invalid`, `bases-empty` | Datendatei unlesbar, kein gültiges JSON oder falsche Struktur; `bases.json` leer. Fehlende optionale Dateien sind erlaubt, eine kaputte Datei gilt nie als „leer“ (das gilt auch für `npm run data:build` und die Recherche-Skripte) |
| `duplicate-id`, `id`, `name` | eindeutige ID, Name vorhanden |
| `schema` | Listenfelder (`features`, `themes`, `activities`, `organisations`, `presences`) sind Listen |
| `coords-missing`, `coords-range`, `coords-null-island` | Koordinaten vorhanden, im gültigen Bereich, nicht 0/0 |
| `duplicate-position` | zwei Standorte < 200 m auseinander (nach Anwendung der Claims), ohne Bezug über Sammeleintrag (`garrison`, `region-cluster`) oder `relations`, kein `special-facility`, ohne Eintrag in `corrections.json` und ohne Prüfhinweis `duplicate-entry` |
| `country-missing`, `country-invalid`, `nation-invalid` | ISO-3166-Code (plus `XK`), geprüft mit `Intl.DisplayNames` |
| `site-type`, `status`, `feature`, `theme`, `activity`, `organisation`, `listing`, `us-posture`, `continent`, `presence-*` | Werte aus dem Vokabular in `src/lib/taxonomy.ts` |
| `country-territory`, `territory-invalid` | Gastland ist der souveräne Staat, das Gebiet gehört zu ihm |
| `rule-overseas`, `rule-domestic` | Fachregeln der Taxonomie ([TAXONOMY.md](TAXONOMY.md), Abschnitt 10) |
| `origin` | Herkunft und Rohbegriffe vorhanden |
| `claim-*` | `data/claims.json`: Schema, Quellen, Werte (bei `position` auch `precision` aus dem Vokabular); Korrekturen müssen auf die aktuellen Daten passen; `expect` nur bei `set` (`claim-expect`) |
| `related`, `relation-type`, `relation`, `news-base`, `movement-base` | Verweise zeigen auf existierende Standorte, Relationstyp ist `part-of`, `member-of` oder `related` |
| `corrections` | Schema von `data/corrections.json` (siehe oben) |
| `resolve` | die Datenschichten lassen sich zusammenführen |
| `research-base`, `research-url`, `research-type`, `research-verdict`, `research-claim`, `research-date`, `research-summary`, `research-review` | `data/research/*.json`: bekannter Standort, gültige URL, Quellentyp und Aussagegruppe aus dem Vokabular, Zugriffsdatum; `supports`/`contradicts` nur bei manueller Prüfung (`method: "manual"`) mit Zusammenfassung; `bsr-review.json` nennt die BSR-Zeile |
| `image-file`, `media-file`, `media-credit` | Bilddateien vorhanden, Urheber angegeben |
| `wikimedia-license`, `wikimedia-credit`, `wikimedia-page` | Wikimedia-Fotos nur mit freier Lizenz, Urheber und Dateiseite |
| `source-url`, `news-url`, `date`, `news-date` | gültige URLs und Datumsformate (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`) |

### Warnungen (im Bericht, blockieren nicht)

`sources-none` (keine Quelle) · `sources-wikipedia-only` · `issue-*` (Prüfhinweise der Taxonomie, z. B. `issue-multiple-site-types`, `issue-nation-missing`, `issue-review-on-origin`) · `term-unmapped` (neuer Begriff auf visualbases.org) · `rule-civilian` (zivile Anlage mit nuklearer Teilhabe) · `coords-precision` (weniger als 3 Nachkommastellen) · `coords-approx` (von Hand geokodiert oder per Claim als ungefähr gesetzt) · `duplicate-position-reviewed` (in `corrections.json` oder per angenommenem Claim als `duplicate-entry` markiert) / `-linked` (Sammeleintrag oder Relation) / `-facility` (`special-facility` ohne Relation: Teil der Basis oder zweiter Beitrag zur selben Anlage? Klären über `relations` oder `corrections.json`) · `claim-upstream-changed` (der Wert in `bases.json` weicht vom `expect` eines Claims ab: visualbases.org hat das Feld seit der Entscheidung geändert; der Claim gilt weiter, die Entscheidung ist zu prüfen) · `claim-expect-missing` (angenommener `set`-Claim ohne `expect`) · `claim-precision-missing` (Positions-Claim ohne `precision`) · `image-unprocessed` · `news-date-vague` · `news-duplicate` · `wikimedia-orphan` · `continent-missing`

`coords-precision`, `coords-approx` und die Dublettenprüfung laufen auf den **aufgelösten** Datensätzen, also mit den angenommenen `position`-Claims. Die Kennzahl „Position ungefähr“ zählt deshalb auch Positionen, die ein Claim als ungefähr setzt; „Position ungeprüft“ zählt nur Einträge mit `status: "proposed"`.

Neue Regeln brauchen einen Test in `src/lib/validate.test.ts`.

### Geografische Plausibilität (Warnungen)

Läuft in `npm run validate` auf den aufgelösten Datensätzen (`scripts/lib/geo-check.mjs`, offline):

| Regel | Prüfung | Grundlage |
|---|---|---|
| `coords-country` | Koordinate liegt in einem anderen Staat als dem Gastland bzw. Gebiet (Grenzen und Küsten mit 5–10 km Toleranz) | Ländergrenzen Natural Earth 1:10m (`world-atlas`, ohnehin Abhängigkeit der App) |
| `coords-country-disputed` | Koordinate liegt in einem umstrittenen Gebiet, das auch das Gastland beansprucht (Spratly-Inseln, Scarborough-Riff, Taiwan, Westsahara …): politische Frage, kein Datenfehler | wie oben |
| `coords-offshore` | auf See, kein Land im Umkreis von 10 km (Riffe, Kleinstinseln, Sammeleinträge) | wie oben |
| `position-osm-none` | OpenStreetMap zeigt im Umkreis von 3 km weder Militärgelände noch Flugplatz | `data/research/checks.json` (`osm-check.mjs`) |
| `position-wikidata-far` | Koordinate des zugeordneten Wikidata-Objekts liegt mehr als 5 km (Flugplätze, Übungsplätze: 15 km) entfernt; Objekte für Orte und Staaten zählen nicht | `checks.json` (`wikidata.mjs`) |
| `position-check-stale` | die OSM-Prüfung gilt einer anderen Position (z. B. vor einer Korrektur) und wird nicht ausgewertet | `checks.json` |
| `duplicate-name-near` | gleicher kennzeichnender Name (ohne reine Ortsnamen), 200 m bis 3 km auseinander, ohne Relation: eine Anlage zweimal erfasst? | `bases.json` |

Sammeleinträge (`garrison`, `region-cluster`) und ungefähre Positionen (`town`, `region`) werden nicht mit OSM und Wikidata abgeglichen. Geprüfte Fehlalarme quittiert ein Eintrag `status: "confirmed"` in `data/corrections.json` (mit Quelle, optional `rules`); der Bericht zählt die quittierten Warnungen. Die Recherche-Skripte (`scripts/research/*`) prüfen seit 2026-11-08 die **korrigierte** Position und das korrigierte Gastland (angenommene Claims angewandt).

Gegenprobe beim Einführen: Auf den Rohdaten findet `coords-country` genau die drei schon über Claims korrigierten Fälle (`librevillegabon`, `camp-ayanganna`, `sarajevo-military-airport`), auf den aufgelösten Daten keinen.

### Recherche der Geo-Warnungen (2026-11-08)

Alle 25 geografischen Warnungen der Einführung wurden mit OpenStreetMap (Nominatim), Wikidata, dem Base Structure Report und den Originalbeiträgen geprüft:

| Ergebnis | Standorte | Umsetzung |
|---|---|---|
| Position falsch, OSM-Objekt der Anlage belegt | Robertson Barracks (8,9 km), Bezmer (5,4 km), Money Island (7,3 km, offene See), Second Thomas Shoal (40 km), Aruba (11 km; der Beitrag nennt die Flughafenkoordinate selbst im Text), Camp Shaheen (3,1 km) | angenommene `position`-Claims |
| Position fraglich, Ermessensfall | Ouagadougou (Wohngebiet 7,9 km östlich des Flughafens) | Vorschlag `ouagadougou-position`, am 2026-11-08 angenommen (Flughafen) |
| Position stimmt, Wikidata-Objekt oder -Koordinate falsch | Camp Lemonnier, Redzikowo, Fort Greely, Beale, Maritime Component Command Neapel (Nisida), Dhekelia, Camp Shaheen | `confirmed`, `reference-mismatch` |
| Position stimmt, OSM erfasst die Anlage nicht als militärisch | Grafenwöhr (Verwaltungsgrenze), Grünstadt (Funkturm) | `confirmed`, `reference-mismatch` |
| Position stimmt, Insel/Riff fehlt in den Grenzdaten | Pratas, Second Thomas Shoal, Money Island | `confirmed`, `reference-mismatch` |
| nur Ort oder Region bekannt | Masar-i Scharif (Sammeleintrag), Cartagena (regionaler Kartenlink), Bann Communications Station (laut BSR eigener Standort neben „Station 2“, Position = Ort Bann) | `confirmed`, `imprecise`, mit `precision` |
| Wikidata-Treffer ist die Stadt | Kristinehamn | Regel angepasst (Objekte vom Typ „urban area“ zählen als Ort) |
| Sammeleintrag auf See | Bahrain | Regel angepasst (Sammeleinträge werden nicht als „auf See“ gemeldet) |
| offen | Darmstadt Training Center (geschlossen 2008, Lage nicht belegt; auch den Projektverantwortlichen keine Hinweise bekannt) | – |

Die OSM-Prüfung der korrigierten Positionen (`position-check-stale`) erneuert der monatliche Recherche-Workflow.

### Abgleich mit den Koordinaten in den Originalbeiträgen (2026-11-08)

Der Importer übernimmt den ersten OpenStreetBrowser-Link eines Beitrags (bei kopierten Links den eigenen, `resolveCopiedCoordinates`). Viele Beiträge nennen zusätzlich eine Koordinate im Text oder einen Google-Earth-Link. Ein einmaliger Abgleich aller 365 Beiträge ergab: 297 Beiträge mit weiteren Koordinaten, bei 126 Standorten liegt eine davon mehr als 1 km von der veröffentlichten Position entfernt. Meist sind das andere Anlagen im selben Beitrag (Übersichten, mehrere Standorte), gerundete Google-Earth-Links, Tippfehler im Text (z. B. Guantánamo 75.17 statt -75.17) oder ein anderer Referenzpunkt auf derselben großen Anlage.

Geprüft wurden die vier deutlichsten Fälle:

| Standort | Befund | Umsetzung |
|---|---|---|
| Rudninkai | Fehlalarm: Der erste Link ist von Gaižiūnai kopiert, der Importer hat bereits den eigenen genommen | – |
| Pemba | Position 10 km neben der Marinebasis (OSM „Base Naval de Pemba“) | angenommener Claim `pemba-position` |
| Gracias a Dios | nur das Departement bekannt, mehrere Landepisten möglich | `confirmed`, `imprecise`, `precision: region` |
| Vieques | großes früheres Übungsgelände, beide Koordinaten liegen darauf | `confirmed`, `imprecise`, `precision: region` |

Weitere Kandidaten mit einem groben Kartenlink (Zoomstufe 11) und einer genaueren Koordinate im Beitrag, meist Übungsplätze mit 5–15 km Abweichung: Pabradė, Bemowo Piskie, Tapa, Sennelager, Żagań, Popescu, Hohenfels, Munster. Offen ist, ob der Importer bei groben Kartenlinks eine nahe gelegene Text- oder Google-Earth-Koordinate bevorzugen soll (das würde Positionen in `bases.json` beim nächsten Import ändern).

## Importer-Regeln, die Fehler der Quelle abfangen

- **Grobe Kartenlinks** (`refineCoordinates`, seit 2026-11-08): Hat der Kartenlink Zoomstufe 11 oder gröber und nennt der Beitrag im Text oder als Google-Earth-Link eine Koordinate mit mindestens 3 Nachkommastellen, die höchstens 20 km entfernt liegt, mit allen anderen solchen Angaben übereinstimmt (≤ 2 km) und nicht die Position eines anderen Beitrags ist, wird diese genommen. Herkunft im Feld `positionFrom` (`text` · `google-earth`) und in der CSV-Spalte `position_from`. Probelauf mit allen 388 Seiten: 20 Positionen, 0,6–17,5 km. Bei den 6 davon, die schon per OSM korrigiert waren (Aruba, Robertson Barracks, Exmouth, Money Island, Muwaffaq Salti, JWTC), landet die Regel 0,2–3,6 km neben der Korrektur (vorher 7–18 km); Übungsplätze rücken an das jeweilige Wikidata- bzw. OSM-Objekt heran (z. B. Bemowo Piskie 14,8 → 1,2 km, Sinjajevina 9,2 → 0,9 km, Tapa auf den Keskpolügoon). Nach dem nächsten Import melden die 6 Positions-Claims `claim-upstream-changed`; sie können dann entfallen, wenn die neue Quellposition genügt.
- **Kopierte Kartenlinks:** Ist der erste Kartenlink eines Beitrags die Position eines anderen Beitrags und enthält der Beitrag einen weiteren, nicht vergebenen Link, wird dieser genommen (`resolveCopiedCoordinates`). Betraf: Ghedi, Taara.
- **Ländercodes:** `UK → GB`, `RKS → XK`, `RP → PH`.
- **Kategorien:** Fehlende Region oder Kontinent werden für vier Beiträge über `FIXES` ergänzt; der Kontinent wird aus der Region abgeleitet. Die Zuordnung aller Begriffe zur Taxonomie steht im Importer (`SITE_TYPE_BY_CAT`, `FEATURE_BY_TERM`, `*_BY_TAG`).
- **Gebiete:** Gebietscodes im Titel (`PR`, `GL`) werden zu Staat + Gebiet; Gebiete hinter Staatscodes werden am Ortsnamen erkannt (`TERRITORY_BY_NAME`).
- **Links in der Presseschau:** Führende kodierte Leerzeichen (`%20https://…`) werden entfernt.

## Korrekturen nachvollziehbar halten: `expect` und `precision`

Jeder `set`-Claim in `data/claims.json` hält in `expect` den Wert fest, den `bases.json` bei der Entscheidung hatte (Position als `{ lat, lon }`, Präsenzen ohne `via`, ein fehlendes Feld als `null`). Ändert visualbases.org das Feld später, meldet die Validierung `claim-upstream-changed`, statt die neue Angabe stillschweigend zu überdecken. Zu entscheiden ist dann, ob der Claim noch nötig ist, angepasst wird oder entfällt. `add`/`remove` brauchen kein `expect`; sie schlagen ohnehin fehl, wenn der Wert schon da bzw. weg ist (`claim-apply`).

Positions-Claims nennen die Genauigkeit des neuen Werts (`precision`):

| Stufe | Bedeutung | App | Stand 2026-11-08 |
|---|---|---|---|
| `site` | auf der Anlage (z. B. OSM-Objekt der Basis) | – | 4 (Creech, Muwaffaq Salti, Humphreys, Harold E. Holt) |
| `reference` | Referenzpunkt aus dem Kartenlink der Quelle (Standard für importierte Koordinaten) | – | 353 |
| `town` | Ortsmitte | ≈ Position ungefähr | 7 (5 von Hand geokodiert, Puerto Castilla, Karlovac) |
| `region` | Gebiet oder Insel | ≈ Position ungefähr | 1 (Jungle Warfare Training Center: Mittelpunkt des Northern Training Area) |

Veröffentlicht als `positionPrecision` (JSON, GeoJSON) und CSV-Spalte `position_precision`. Der Bericht zeigt die Verteilung.

## Positionsgenauigkeit und „Deine Basis“

Die Rangliste unter `#/near` verwendet die **gespeicherte** Koordinate jedes Eintrags. Unbestätigte Korrekturvorschläge werden **nicht** angewendet. Betroffene Treffer werden gekennzeichnet, aber nicht verschoben. Die Quelldaten (`data/*.json`) wurden dafür nicht geändert.

Prüfung vom 2026-11-07, aktualisiert 2026-11-08 (alle 365 Einträge, paarweiser Abstand, nach Anwendung der Claims):

| Befund | Einträge | Wirkung auf „Deine Basis“ |
|---|---|---|
| Koordinate identisch mit anderem Eintrag (Abstand 0 m) in `bases.json` | `puerto-castilla-honduras` = `soto-cano-honduras`; `karlovac-croatia-2` = `zadar-gazenica-croatia` | Durch die angenommenen Claims `puerto-castilla-position` und `karlovac-position` korrigiert (Ortsmitte, ungefähr; Quelle OSM/Nominatim). Treffer tragen „≈ Position ungefähr“. Karlovac (`unspecified`, US) ist zusätzlich als „Nutzungsform nicht angegeben“ markiert. |
| weitere Paare unter 200 m | `de-kl-warrior-preparation-center` ↔ `warrior-preparation-center-einsiedlerhof` (194 m) | zwei Beiträge zur selben Anlage; über den angenommenen Claim `wpc-duplicate` (Prüfhinweis `duplicate-entry`) geklärt → Warnung `duplicate-position-reviewed`. Bis 2026-11-07 nahm die Validierung `special-facility` pauschal aus und sah das Paar gar nicht. |
| ungefähr (`approx`) | von Hand verortet: `gitmo-guantanamo-bay`, `raf-akrotiri`, `camp-century-greenland` (geschlossen), `white-beach-okinawa`, `inezgane-airport`; per Claim: `puerto-castilla-honduras`, `karlovac-croatia-2`, `jungle-warfare-training-center` | Treffer tragen „≈ Position ungefähr“ |
| ungültige Koordinaten | keine (der Validator blockiert sie) | würden ausgeschlossen und unter „Wie genau ist das?“ gezählt |

Allgemein steht jede Koordinate für einen Referenzpunkt aus dem Kartenlink der Quelle. Große Anlagen (Truppenübungsplätze, Flugplätze) erstrecken sich über mehrere Kilometer. Die App leitet daraus keine Fehlergrenzen ab (siehe TAXONOMY, Abschnitt 11) und erklärt Rechen- und Positionsgenauigkeit getrennt (Aufklappbereich „Wie genau sind diese Entfernungen?“).

## Kennzeichnung in der Anwendung

| Kennzeichen | Bedeutung |
|---|---|
| ⚠ Position ungeprüft | Eintrag in `corrections.json` mit `status: "proposed"`, mit Grund und Vorschlag |
| ✓ Position redaktionell geprüft | Eintrag in `corrections.json` mit `status: "confirmed"`, verlinkt auf den Beleg |
| ≈ Position ungefähr | von Hand geokodiert, weil die Quelle keine Koordinate enthält |
| ⚠ Eintrag wird geprüft | auf visualbases.org als „Review required“ markiert |
| 📄 Im Pentagon-Bericht gelistet | Quelle: Base Structure Report (BSR) |
| ✎ Korrekturen | angewandte Aussage aus `claims.json`, mit Originalwert und Quelle |
| ⚠ Offene Prüfhinweise | Vorschläge aus `claims.json` und Prüfhinweise der Taxonomie |
| Belegstatus je Aussage | belegt · korrigiert · umstritten · nur Kontext · ungeprüft – aus der Quellenrecherche, gekennzeichnet als „redaktionell noch nicht bestätigt“ |
| ⚠ Unsicher: Stationierungsnation nicht belegt / Nutzungsform nicht angegeben | nur in „Deine Basis“: Eintrag ohne belegte ausländische Präsenz bzw. vom Typ `military-base`/`unspecified` |
| (abgeleitet), (nicht als geschlossen gemeldet) | Herkunft von Standorttyp, Status und Präsenz |
