# Klassifikationsmodell (Taxonomie v2)

Stand: 2026-11-08 (Präsenzart, Belegstufe). Maßgeblich für IDs, Bezeichnungen und Definitionen ist [`src/lib/taxonomy.ts`](../src/lib/taxonomy.ts); dieses Dokument erklärt das Modell. Die Bestandsaufnahme des alten Modells steht in [taxonomy/AUDIT.md](taxonomy/AUDIT.md), die Migration in [taxonomy/MIGRATION-REPORT.md](taxonomy/MIGRATION-REPORT.md).

## 1. Grundsätze

1. **Eine Frage, eine Dimension.** Standorttyp, Status, Gastland, Präsenz, Einrichtung, Funktion, Thema und militärischer Zusammenhang sind getrennte Felder.
2. **Stabile IDs statt Freitext.** Werte sind kurze englische IDs (`shared-base`, `nuclear-sharing`); deutsche und englische Bezeichnungen und Definitionen stehen nur in `taxonomy.ts`. App, statische Seiten und Exporte (`taxonomy.json`) nutzen dieselbe Quelle.
3. **Unbekannt ist ein gültiger Zustand.** Fehlt eine Angabe, bleibt das Feld leer (`presences: []`) oder trägt einen ausdrücklichen Wert (`unspecified`, `military-base`, Status `unknown`). Nichts wird geraten.
4. **Jede Angabe hat eine Herkunft.** Die Rohbegriffe von visualbases.org stehen an jedem Datensatz (`origin.terms`), abgeleitete Werte sind gekennzeichnet (`basis`, `via`), Korrekturen tragen Quelle, Datum und den Originalwert.
5. **Mehrfachzuordnung, wo sie Sinn ergibt.** Präsenzen, Organisationen, Einrichtungen, Themen und Aktivitäten sind Listen. Standorttyp und Status sind Einzelwerte, weil ihre Werte sich gegenseitig ausschließen.

## 2. Dimensionen im Überblick

| Dimension | Feld | Frage | Anzahl | Werte |
|---|---|---|---|---|
| Standorttyp | `siteType` | Was für ein Standort ist das? | genau 1 | 11, Abschnitt 3 |
| Status | `status` | Wird er (von den genannten Staaten) genutzt? | genau 1 | `active`, `closed`, `unknown` |
| Zeitraum | `period` | Seit/bis wann? | optional | `{ from, to }` (`YYYY[-MM[-DD]]`) |
| Gastland | `host.country` | Auf welchem Staatsgebiet? | 1 | ISO 3166-1 (souveräner Staat, plus `XK`) |
| Gebiet | `host.territory` | In welchem abhängigen Gebiet? | optional | ISO-Code des Gebiets (`GU`, `PR`, `GL`, `MQ` …) |
| Präsenz | `presences[]` | Welche Staaten sind dort militärisch präsent, und in welcher Form? | 0–n | `{ nation, role, via, form?, formVia? }` |
| Organisation | `organisations[]` | Welche Organisationen nutzen ihn mit? | 0–n | `nato`, `eu`, `un` |
| Einrichtungen & Funktionen | `features[]` | Welche Infrastruktur, welche Funktion? | 0–n | 14, Abschnitt 7 |
| Themen | `themes[]` | Welche politischen/gesellschaftlichen/ökologischen Themen? | 0–n | `resistance`, `drone-warfare`, `environment` |
| Aktivitäten | `activities[]` | Welche Operationen, Übungen, Missionen? | 0–n | Abschnitt 9 |
| Beziehungen | `relations[]` | Teil von / gehört zu / siehe auch | 0–n | `part-of`, `member-of`, `related` |
| Geografie | `continent`, `region`, `subregion` | Grobe Lage | je 0–1 | Kategorien von visualbases.org |
| US-Kategorie | `usPosture` | Kategorie der US-Stationierungsplanung | optional | `MOB`, `FOB`, `FOS`, `CSL` |
| Listen | `listedIn[]` | In welchen Verzeichnissen geführt? | 0–n | `bsr`, `bsr-multi`, `wikipedia-list`, `other-list` |

Berechnet (nicht gespeichert): `presences[].relation`, `scope`, `basis`, `evidence`, `issues`, `includes`, `hasParts`.

## 3. Standorttyp (`siteType`)

| ID | Deutsch | English | Definition und Abgrenzung | Farbe |
|---|---|---|---|---|
| `foreign-base` | Ausländische Militärbasis | Foreign military base | Wird überwiegend von den Streitkräften eines anderen Staates betrieben. | orange |
| `overseas-base` | Basis im eigenen Überseegebiet | Base in own overseas territory | Vom Stationierungsstaat in einem eigenen Gebiet außerhalb des Kernlands betrieben (Guam, Puerto Rico, Martinique, Gibraltar …). Kein Gastland im engeren Sinn. | orange |
| `shared-base` | Gemeinsam genutzte Basis | Shared base | Vom Gastland betrieben, mit dauerhaft stationierten ausländischen Truppen oder Anlagen. | blau |
| `host-base-foreign-use` | Nationale Basis mit ausländischer Nutzung | National base with foreign use | Basis des Gastlands, zeitweise von ausländischen Streitkräften genutzt (Übungen, Zugangsabkommen). | grün |
| `domestic-global` | Inländische Basis mit globaler Funktion | Domestic base with global role | Auf dem eigenen Staatsgebiet des Betreibers (bisher nur USA) mit Rolle im weltweiten Netz. **Kontext-Standort.** | grün |
| `special-facility` | Militärische Sondereinrichtung | Special military facility | Einzelne Anlage mit besonderer Funktion, oft Teil eines größeren Standorts. | grün |
| `military-base` | Militärbasis (Nutzungsform nicht angegeben) | Military base (form of use not specified) | Die Quelle nennt den Ort nur als (geschlossene) Basis, ohne Betriebsform. | grün |
| `civilian-site` | Ziviler Standort mit Militärnutzung | Civilian site with military use | Offiziell zivil (meist Flughafen/Hafen), von ausländischen Streitkräften genutzt. Keine Militärbasis. | grün |
| `garrison` | Garnison / Militär-Community | Garrison / military community | Sammeleintrag (Σ): Verwaltungseinheit über mehrere Standorte (z. B. U.S. Army Garrison). | Ring |
| `region-cluster` | Regionaler Sammeleintrag | Regional summary entry | Sammeleintrag (Σ) für eine Insel, Stadt oder Region, oder eine Übersicht. | Ring |
| `unspecified` | Nicht näher bestimmter Ort | Unspecified site | Art in der Quelle nicht angegeben oder nicht eindeutig. | grün |

Abgrenzungen:
- **Ausländisch vs. eigenes Gebiet:** Ob eine Präsenz ausländisch ist, ergibt sich aus Nation und Gastland (Abschnitt 6), nicht aus dem Typ. `overseas-base` und `domestic-global` sind deshalb eigene Typen; eine US-Basis mit globaler Funktion wird **nicht** als ausländisch gezählt.
- **Garnison ≠ Basis:** Sammeleinträge zählen in Statistiken nicht als Standort und werden auf der Karte als Ring gezeigt. Ihre Mitglieder verweisen per `member-of` auf sie.
- **Zivil ≠ militärisch:** Die Nutzung ziviler Infrastruktur ist zusätzlich als Funktion erfasst (`civil-airport-use`, `civil-port-use`), auch an Militärbasen.
- **„Geschlossen“ ist kein Typ**, sondern ein Status (Abschnitt 4).

## 4. Status und Zeitraum

| ID | Deutsch | English | Definition |
|---|---|---|---|
| `active` | In Betrieb | In operation | Nicht als geschlossen bekannt. |
| `closed` | Geschlossen / ehemalig | Closed / former | Militärische Nutzung durch die genannten Staaten beendet. Der Ort kann weiter vom Gastland genutzt werden oder reaktivierbar sein. |
| `unknown` | Status unklar | Status unclear | Weitere Nutzung nicht belegt. |

`basis.status` sagt, woher der Status kommt: `source` (Kategorie „Closed Base“), `implicit` (auf visualbases.org nicht als geschlossen gemeldet – kein positiver Beleg für den Betrieb), `claim` (korrigiert). `period` wird nur gesetzt, wenn eine Quelle es belegt.

**Historische Standorte** bleiben im Datensatz: Status `closed`, Präsenzen unverändert (sie beschreiben, wer dort war), Zeitraum wenn belegt. Geschlossene Standorte sind auf der Karte grau, unabhängig vom Typ.

## 5. Gastland und Gebiet

- `host.country` ist immer der **souveräne Staat** (Grönland → `DK`, Puerto Rico → `US`, Martinique → `FR`).
- `host.territory` hält das abhängige Gebiet mit eigenem ISO-Code. Zuordnung `TERRITORY_SOVEREIGN` in `taxonomy.ts`. Der Importer übernimmt Gebietscodes aus dem Titel (`PR | …`) und erkennt Gebiete in Titeln mit Staatscode am Ortsnamen (`TERRITORY_BY_NAME`: Guam, Johnston Atoll, Martinique, Guadeloupe, Guayana, Réunion, Tahiti, Neukaledonien, Aruba, Curaçao, Diego Garcia, Falkland, Gibraltar, Ascension/St. Helena).
- Der Länderfilter und die Länderseiten (`c/<code>.html`) gibt es für Staaten **und** Gebiete; alte Länderseiten wie `c/GL.html` bleiben erhalten.
- Umstrittene Gebiete werden nicht entschieden, sondern als offene Fälle geführt (Abschnitt 14).

## 6. Präsenzen und Organisationen

`presences[]` – ein Eintrag je Staat:

| Feld | Werte | Bedeutung |
|---|---|---|
| `nation` | ISO 3166-1 | Staat |
| `role` | `stationing` (Stationierungsnation), `co-user` (Mitnutzer) | aus „Base nation: …“ bzw. „Base shared: …“ |
| `via` | `tag`, `bsr`, `us-posture`, `site-type`, `claim` | Herkunft: ausdrücklich angegeben, abgeleitet aus BSR-Listung, aus der US-Kategorie, aus „USA Global Base“, oder Korrektur |
| `relation` (berechnet) | `foreign`, `own-territory`, `domestic` | Nation ≠ Gastland → ausländisch; = Gastland mit Gebiet → eigenes Überseegebiet; = Gastland ohne Gebiet → eigenes Staatsgebiet |
| `form` (optional) | Abschnitt 6.1 | Präsenzart, nur wo belegt |
| `formVia` | `claim`, `status` | Herkunft der Präsenzart: Korrektur mit Quelle oder abgeleitet aus dem Status `closed` |

### 6.1 Präsenzart (`presences[].form`)

Unterscheidet, **wie** ein Staat an einem Standort präsent ist (Roadmap F22, Entscheidung vom 2026-11-07). Die Präsenzart gehört zur einzelnen Präsenz, nicht zum Standort: An einem Ort kann ein Staat fest stationiert sein und ein anderer rotieren.

| ID | Deutsch | English | Definition |
|---|---|---|---|
| `permanent` | Feste Stationierung | Permanent stationing | Dauerhaft dort stationierte Einheiten oder Personal des Staates. |
| `rotational` | Rotation | Rotational presence | Wiederkehrende, zeitlich begrenzte Verlegungen, keine dauerhaft stationierte Einheit. |
| `access` | Zugangsrecht | Access rights | Zugangs- und Nutzungsrechte aus einem Abkommen (z. B. DCA); kein Beleg für eine dauerhafte Stationierung. |
| `exercise` | Übung | Exercise use | Nutzung für Übungen oder Manöver, ohne dauerhaft stationierte Kräfte. |
| `joint` | Gemeinsam betrieben | Jointly operated | Anlage, die der Staat gemeinsam mit dem Gastland betreibt. |
| `historical` | Historisch | Historical | Die Präsenz dieses Staates ist beendet. |
| `planned` | Geplant / im Aufbau | Planned / under construction | Angekündigt oder im Bau, noch keine belegte Präsenz. |

Regeln:
- **Keine Angabe ist der Normalfall.** visualbases.org nennt keine Präsenzart. Ohne Beleg bleibt das Feld leer; Filter und Bericht zeigen das als „nicht angegeben“. Nichts wird aus Standorttyp, US-Kategorie oder Aktivitäten geraten.
- **Belegt** wird die Präsenzart über einen Claim `presenceForm` (`{ nation, form }`, nur `set`) mit Quelle aus `data/research/sources.json`. Der Claim ergänzt die vorhandene Präsenz und ändert die Liste nicht; fehlt die Präsenz des Staates, ist das ein Fehler (`claim-apply`). Weil er nichts korrigiert, bleibt der Belegstatus der Aussagegruppe `presence` unverändert.
- **Abgeleitet:** An Standorten mit Status `closed` gilt jede Präsenz ohne belegte Art als `historical` (`formVia: status`). Eine belegte Art geht vor.
- Der **Filter „Präsenzart“** im Atlas (`?forms=access,rotational`, auch `unspecified`) betrachtet nur ausländische Präsenzen, wie der Filter „Stationierungsnation“. Die Rangliste „Deine Basis“ berücksichtigt die Präsenzart (noch) nicht.
- Startbestand 2026-11-08: 40 Claims aus den von Hand geprüften Quellen der Recherche (20 Zugangsrecht, 10 Rotation, 3 gemeinsam betrieben, 3 geplant, 2 Übung, 2 fest) und 31 abgeleitet historische Präsenzen. Nicht übernommen, weil die Quelle die Art nicht selbst belegt: Exmouth (gemeinsamer Betrieb nur in der Notiz), die pakistanischen Basen (Ende der Nutzung offen), Zadar (nur Kontext), Standorte ohne Präsenz (Teulada, Bergen, Kuçova).

`scope` (berechnet): `foreign`, wenn mindestens eine Präsenz ausländisch ist; sonst `overseas`, `domestic` (**Kontext-Standort**) oder `unknown` (keine Präsenz bekannt). Der Filter „Stationierungsnation“ und die Kennzahl „mit US-Präsenz“ zählen keine Präsenzen auf eigenem Staatsgebiet.

`organisations[]`: `nato`, `eu` (Tags „Base shared: NATO/EU“). `un` ist Träger der Aktivität `un-mission`. Mitgliedschaften von Staaten in Bündnissen werden **nicht** gespeichert – sie sind keine Eigenschaft des Standorts.

## 7. Einrichtungen und Funktionen (`features`)

| ID | Gruppe | Deutsch | Quelle auf visualbases.org |
|---|---|---|---|
| `airfield` | Physische Einrichtung | Militärflugplatz | „Airplane Landing Site“ |
| `helipad` | Physische Einrichtung | Hubschrauberlandeplatz | „Helipad Landing Site“ |
| `naval-port` | Physische Einrichtung | Marinehafen | „Naval Port“ |
| `training-area` | Physische Einrichtung | Übungsplatz | „Training Area“ |
| `depot` | Physische Einrichtung | Depot / Lager | „Depot“ |
| `laboratory` | Physische Einrichtung | Labor | „Laboratory“ |
| `telecom-station` | Physische Einrichtung | Fernmeldeanlage | „Telecommunications Station“ |
| `radar-station` | Physische Einrichtung | Radaranlage | Tag „Use: Radar station“ |
| `civil-airport-use` | Genutzte zivile Infrastruktur | Nutzung eines zivilen Flughafens | „Use of Civil Airport“ |
| `civil-port-use` | Genutzte zivile Infrastruktur | Nutzung eines zivilen Hafens | „Use of Civil Naval Port“ |
| `command` | Militärische Funktion | Kommando und Führung | „Command Center“ |
| `missile-defence` | Militärische Funktion | Raketenabwehr | „Missile Defence“ |
| `signals-intelligence` | Militärische Funktion | Fernmeldeaufklärung / Abhören | Tag „Use: Listening station“ |
| `nuclear-sharing` | Strategisches Arrangement | Nukleare Teilhabe | „Nuclear Sharing“ |

Abgrenzungen: Eine Fernmeldeanlage ist nicht automatisch eine Abhörstation (nur `signals-intelligence` sagt das). Raketenabwehr ist eine Funktion; zugehörige Radare stehen zusätzlich als `radar-station`, wenn die Quelle es sagt. Nukleare Teilhabe ist ein Arrangement, keine Anlage. Ein Flugplatz ist eine Einrichtung; die Mitnutzung eines zivilen Flughafens ist eine eigene Nutzungsform.

## 8. Themen (`themes`)

| ID | Deutsch | English | Quelle |
|---|---|---|---|
| `resistance` | Widerstand und Protest | Resistance and protest | Tag „Campaign info“ |
| `drone-warfare` | Drohnenkrieg | Drone warfare | Tag „Use: Drone warfare“ |
| `environment` | Umweltfolgen | Environmental impact | Tag „Use: Environmental impact“ |

Geprüft und **nicht** als Thema übernommen: „Überwachung“ und „Radar“ (sind Funktion bzw. Einrichtung), „Atomwaffen“ und „Raketenabwehr“ (wären Doppelungen von `nuclear-sharing`/`missile-defence`; die Startseite verlinkt diese Filter direkt), „Militarisierung“ (keine Daten).

## 9. Aktivitäten (`activities`)

| ID | Art | Gruppe (Filter) | Quelle |
|---|---|---|---|
| `atlantic-resolve` | Operation | `atlantic-resolve` | Tag „Active: Atlantic Resolve“ |
| `defender-europe-20` | Übung | `defender-europe` | Tag „Active: Defender20 Europe“ |
| `defender-europe-21` | Übung | `defender-europe` | Tag „Active: Defender21 Europe“ |
| `un-mission` | Internationale Mission (Träger `un`) | `un-mission` | Tag „Use: UN mission“ |

Der Filter arbeitet auf Gruppen (eine Übungsserie wie DEFENDER-Europe, eine Operation) und zusätzlich auf Organisationen (`nato`, `eu`) – Filtergruppe „Einsätze, Übungen & Bündnisse“.

## 10. Regeln

**Mehrfachzuordnung**
- Präsenzen: beliebig viele Staaten, jeder höchstens einmal (Regel `presence-duplicate`).
- Ein Standort kann zugleich Basis sein und zivile Infrastruktur nutzen, mehrere Funktionen und Themen haben und an mehreren Aktivitäten beteiligt sein.
- Trägt ein Beitrag auf visualbases.org mehrere Standortarten, wird nach fester Reihenfolge eine übernommen (Sammeleintrag, ausländisch, gemeinsam, USA global, national, zivil, Sondereinrichtung) und der Eintrag mit `multiple-site-types` markiert.

**Fachregeln der Validierung** (`scripts/validate-data.mjs`, Fehler blockieren das Deployment)
- jeder Wert aus dem Vokabular; Gastland ist ein souveräner Staat, Gebiet gehört zu diesem Staat;
- `overseas-base` nur mit Gebiet und nur mit Präsenzen des Gebietsstaats (`rule-overseas`);
- `domestic-global` nur mit Präsenz des Gastlands selbst (`rule-domestic`);
- `origin.terms` ist Pflicht; unbekannte Begriffe von visualbases.org werden gemeldet (`term-unmapped`), damit neues Vokabular nach einem Import auffällt;
- Korrekturen (`data/claims.json`) brauchen Quelle, Aussage DE/EN, gültige Werte und Entscheidungsdatum; eine Korrektur, die nicht mehr passt (z. B. weil die Quelle inzwischen korrigiert wurde), ist ein Fehler (`claim-apply`).

**Prüfhinweise** (`issues`, Warnungen im Datenqualitätsbericht, im Profil sichtbar): `multiple-site-types`, `no-site-type`, `site-type-from-status`, `foreign-without-foreign-presence`, `nation-missing`, `continent-check`, `review-on-origin`, `position-unverified`, `out-of-scope-candidate`.

**Rangliste „Deine Basis“** (`src/lib/proximity.ts`, `nearExclusion` / `certaintyOf`). Es gibt dafür keine eigene Kategorie, nur eine Auswahl über bestehende Felder:
- ausgeschlossen: Sammeleinträge (`garrison`, `region-cluster`), `scope: domestic` (Staat auf eigenem Staatsgebiet, Kontext-Standort), `scope: overseas` (Basis im eigenen Überseegebiet), Einträge ohne gültige Koordinaten;
- aufgenommen: `scope: foreign`, also mindestens eine Präsenz mit `relation: foreign`. Maßgeblich ist das Verhältnis Nation ↔ Gastland, nicht der Standorttyp. Deshalb ist Creech (US-Inlandsbasis, RAF-Mitnutzung) aufgenommen und Pratas (`foreign-base`, Nation = Gastland) nicht;
- `scope: unknown` (keine Präsenz belegt): nur wenn der Typ ausländische Nutzung schon definiert (`foreign-base`, `shared-base`, `host-base-foreign-use`) und kein `out-of-scope-candidate` vorliegt. **Zivile Standorte ohne belegte ausländische Präsenz werden nie aufgenommen**;
- `status: closed` nur auf Wunsch des Nutzers (Schalter);
- Gewissheit: „unsicher“, wenn die Stationierungsnation nicht belegt ist (`scope: unknown`) oder die Nutzungsform nicht angegeben ist (`military-base`, `unspecified`). Zivile Standorte (`civilian-site`) tragen den Hinweis „keine Militärbasis“.
Stand 2026-11-07: 365 Einträge, davon 284 in der Rangliste (314 mit geschlossenen). Nicht aufgenommen: 22 Sammeleinträge, 9 auf eigenem Staatsgebiet, 15 im eigenen Überseegebiet, 5 ohne belegte ausländische Präsenz, 30 geschlossen.

## 11. Quellen- und Belegmodell

| Schicht | Datei | Inhalt | Pflege |
|---|---|---|---|
| Import | `data/bases.json` | normalisierte Einordnung von visualbases.org, Rohbegriffe, Quellenlinks, Notizen, Bilder | nur der Importer |
| Korrekturen | `data/claims.json` | Aussagen mit Feld, Operation (`set`/`add`/`remove`), Wert, bei `set` der Ausgangswert der Quelle (`expect`), Status, Quellen, Entscheidungsdatum. Felder: `presences`, `presenceForm` (`{ nation, form }`, nur `set`, ergänzt eine Präsenz), `host`, `region`, `position` (`{ lat, lon, precision }`, nur `set`; das ältere `approx: true` wird als `town` gelesen), `name` (nur `set`), `status`, `period`, `siteType`, `features`, `activities`, `issues` | von Hand |
| Positionen | `data/corrections.json` | zweifelhafte Koordinaten ohne belegte Korrektur (belegte Korrekturen stehen als `position` in `claims.json`) | von Hand |
| Belege | `data/research/sources.json` | geprüfte Quellen je Standort: Herausgeber, Art (`official`, `academic`, `media`, `movement`, `dataset`, `geodata`), Veröffentlichungs- und Abrufdatum, Urteil, gestützte Aussagegruppen | Recherche-Skripte und von Hand |

`scripts/lib/resolve.mjs` führt die Schichten zusammen:
- **`accepted`-Aussagen** werden angewandt; der vorherige Wert steht in `corrections[].from` und im Profil („Bisher laut visualbases.org: …“).
- **`proposed`-Aussagen** ändern nichts; sie erscheinen als „Offener Prüfhinweis“ und setzen den Belegstatus der Aussagegruppe auf „umstritten“.
- **Urteil je Aussagegruppe:** Eine Quelle hat ein `verdict` für alle Gruppen in `supports`. Wo es sich zwischen den Gruppen unterscheidet, trägt sie zusätzlich `verdicts` (`{ "presence": "supports", "status": "contradicts" }`), das Vorrang hat. Positionsquellen können ihre Genauigkeit angeben (`precision`: `site`, `reference`, `town`, `region`). Gelesen wird beides nur über `verdictsOf()` (`src/lib/verdicts.ts`). Gepflegt wird es in `data/research/manual.json` (auch je Standort über `perBase`).
- **Belegstatus je Aussagegruppe** (`evidence`: `presence`, `nation`, `position`, `status`, `facility`, `activity`): `corrected` (anhand einer Quelle korrigiert), `disputed` (geprüfte Quelle widerspricht oder Vorschlag offen), `confirmed` (mindestens eine von Hand geprüfte Quelle stützt), `context` (nur Kontext), sonst ungeprüft. Automatische, nicht geprüfte Treffer zählen nie. **Es gibt keine Vertrauenswerte** – nur nachvollziehbare Zustände. Eine Quelle, die eine Korrektur belegt, zählt für die korrigierte Gruppe nicht mehr (die Korrektur spricht dort für sie), für alle anderen Gruppen weiter.
- **Belegstufe je Standort** (`sourceLevel`), aus dem Belegstatus von Präsenz und Nation und den Quellenlinks, in dieser Reihenfolge:

  | ID | Deutsch | Bedingung |
  |---|---|---|
  | `disputed` | umstritten | Präsenz oder Nation `disputed` |
  | `verified` | geprüft belegt | Präsenz oder Nation `confirmed` oder `corrected` |
  | `context` | nur Kontext | von Hand geprüfte Quellen, aber keine belegt Präsenz oder Nation |
  | `source-listed` | Quelle von visualbases.org | Quellenlink von visualbases.org, nicht geprüft |
  | `wikipedia-only` | nur Wikipedia | nur ein Wikipedia-Artikel |
  | `none` | ohne Beleg | keine Quelle |

  `keySource` nennt Herausgeber, Datum und Abrufdatum der Quelle hinter „geprüft belegt“ (bei einer Korrektur die Quelle der Korrektur). **Belege gesucht** sind `context`, `wikipedia-only` und `none` (`SOURCE_WANTED`): Atlas-Filter `?evidence=`, Abschnitt auf „Mitmachen“ und Qualitätsbericht zählen dieselbe Menge. Position, Status oder Einrichtungen heben die Stufe nicht.
- `lastChecked` = jüngstes Abrufdatum einer von Hand geprüften Quelle. `origin.lastmod` = letzte Änderung auf visualbases.org.
- **Geografische Genauigkeit**: `positionPrecision` je Standort: `site` (auf der Anlage, z. B. OSM-Objekt der Basis), `reference` (Referenzpunkt aus dem Kartenlink der Quelle, Standard), `town` (Ortsmitte; auch von Hand geokodierte Einträge mit `approx`), `region` (Gebiet oder Insel). `town` und `region` gelten in der App als „Position ungefähr“ (`approx`). Dazu `positionCheck` (zweifelhaft, „Position ungeprüft“). Es wird keine Genauigkeit aus der Zoomstufe abgeleitet.

Die Quellenlinks von visualbases.org (`sources`, `wikipedia`) sind keiner einzelnen Aussage zugeordnet, weil die Quelle das nicht angibt; sie erscheinen als „Quellen & Kampagnen“.

## 12. Migrationsregeln

Ausgeführt am 2026-11-07 durch den neuen Importer auf den unveränderten Seiten von visualbases.org; geprüft durch `src/lib/migration.test.ts` gegen `docs/taxonomy/migration-v1-v2.csv`.

| v1 | v2 |
|---|---|
| `kind: foreign` | `foreign-base`, oder `overseas-base` wenn alle Stationierungsnationen = Gastland und ein Gebiet vorliegt |
| `kind: shared` / `national` / `usglobal` / `civilian` / `facility` / `unspecific` | `shared-base` / `host-base-foreign-use` / `domestic-global` / `civilian-site` / `special-facility` / `unspecified` |
| `kind: hotspot` | `garrison` (Name enthält Garrison/USAG/Community), sonst `region-cluster` |
| `kind: closed` | `status: closed`; Typ aus weiteren Kategorien, sonst `military-base` (+ Prüfhinweis) |
| Kategorie „Closed Base“ zusätzlich zu einer Art | Art bleibt, `status: closed` (vorher verloren) |
| Titel „Overview …“ | `region-cluster` |
| `facilities` | `features` (1:1, neue IDs, Abschnitt 7) |
| `themes: surveillance` / `radar` | `features: signals-intelligence` / `radar-station` |
| `themes: defender` | `activities: defender-europe-20` und/oder `-21` (Jahr aus dem Tag, vorher verloren) |
| `themes: atlantic-resolve` / `un` | `activities: atlantic-resolve` / `un-mission` |
| `themes: drones` | `themes: drone-warfare` |
| `nations` | `presences` mit `role: stationing` und `via` |
| `sharedWith` (Staat) / (`NATO`, `EU`) | `presences` mit `role: co-user` / `organisations` |
| „USA Global Base“ ohne Nation | Präsenz `US`, `via: site-type` |
| `country` | `host.country` (souverän) + `host.territory` |
| `related` | `relations` mit Typ (`member-of`, `part-of`, `related`) |
| `usType`, `sourceType`, `review`, `updates`, `lastmod`, `origin` | `usPosture`, `listedIn`, `origin.review`, `origin.updates`, `origin.lastmod`, `origin.url` |

Ergebnis: 365 von 365 Standorten, alle IDs, 94 Quellenlinks, 139 Bildreferenzen, 371 Wikipedia-Links und 258 Notizen erhalten. Alte Atlas-Links werden über `LEGACY_FILTERS` übersetzt (`?kinds=closed` → `?status=closed`).

## 13. Beispiele

| Standort | Standorttyp | Status | Gastland | Präsenz | Einrichtungen & Funktionen | Weiteres |
|---|---|---|---|---|---|---|
| NAS Argentia (`nas-argentia-newfoundland`) | `military-base` (abgeleitet) | `closed` | CA | US (Tag) – ausländisch | `airfield` | Prüfhinweise: Nutzungsform nach Schließung nicht angegeben; auf visualbases.org zur Prüfung markiert |
| Büchel (`buechel-nato-air-base`) | `shared-base` | `active` (implizit) | DE | US (Tag) – ausländisch | `airfield` (Einrichtung), `nuclear-sharing` (Arrangement) | Thema `resistance` |
| Lualualei (`naval-radio-transmitter-lualualei`) | `domestic-global` | `active` (implizit) | US | US (abgeleitet aus „USA Global Base“) – eigenes Staatsgebiet | `telecom-station`, `radar-station` | Kontext-Standort; Prüfhinweis Kontinent |
| BA 188 Dschibuti (`base-aerienne-188-djibouti`) | `foreign-base` | `active` | DJ | FR (Korrektur; vorher US) | `civil-airport-use` | Beleg: defense.gouv.fr |
| Guam Naval Base (`naval-base-guam`) | `overseas-base` | `active` | US, Gebiet GU | US – eigenes Überseegebiet | `naval-port` | |
| Dschibuti (`armed-forces-djibouti`) | `region-cluster` | `active` | DJ | US, FR, JP, CN (Stationierung), IT (Mitnutzer) | `civil-airport-use`, `civil-port-use` | Mehrfachpräsenz |

## 14. Nicht eindeutig lösbare Fälle

Diese Fälle bleiben sichtbar (Prüfhinweis oder offener Vorschlag im Profil) und brauchen eine Entscheidung der Projektverantwortlichen oder weitere Quellen.

| Fall | Problem | Vorschlag |
|---|---|---|
| **US-Inlandsstandorte** (Lualualei, Beale, Cape Cod, Clear, Fort Greely, Vandenberg; Creech mit britischer Mitnutzung) | Liegen auf eigenem Staatsgebiet der USA, also außerhalb von „ausländische Basen“. | **Entschieden 2026-11-07:** als Kontext-Standort sichtbar und filterbar, nicht als ausländische Präsenz gezählt. Creech zählt wegen der RAF-Mitnutzung als ausländische Präsenz (Großbritannien). |
| Lualualei – Radar | VLF-Sender, auf visualbases.org als „Radar station“ getaggt. | Tag auf visualbases.org prüfen; bis dahin übernommen. |
| Hawaii, Johnston-Atoll – Kontinent | Kategorie „Asia / Pacific Region“ der Quelle. | Kontinent „Ozeanien“ oder „Amerika“ – Entscheidung offen (`continent-check`). |
| Pratas, Money Island, Pattle Island (Südchinesisches Meer) | Als „ausländisch“ geführt, Gastland = China = Nation. Pratas wird von Taiwan verwaltet, die Paracels sind umstritten. | Umstrittene Gebiete nicht entscheiden; ggf. Feld `host.disputed` mit Quelle einführen (`foreign-without-foreign-presence`). |
| 26 geschlossene Standorte ohne Art | Bagram, Kandahar, Niger, Syrien u. a. – die Quelle sagt nur „Closed Base“. | Nutzungsform (meist vermutlich ausländische Basis) mit Quelle festlegen (`site-type-from-status`). |
| 6 Beiträge mit zwei Arten | `rzeszow`, `deu-bellheim`, `i-solbiate-olona`, `sennelager`, `satcom-landstuhl`, `sinjajevina-montenegro`. | Auf visualbases.org bereinigen (`multiple-site-types`). |
| `gitmo-guantanamo-bay` | Artikel über Guantánamo, als Standort neben `guantanamo-bay-naval-base` geführt. | Als Übersicht kennzeichnen oder zusammenführen. |
| `overview-new-us-access-in-sweden` | Übersicht über das Abkommen, kein Ort. | Als `region-cluster` geführt; prüfen, ob als Standort gewünscht. |
| `camp-ayanganna` | Nach Korrektur: HQ der Streitkräfte Guyanas, keine ausländische Präsenz. | Aus dem Atlas entfernen? (`out-of-scope-candidate`) |
| Khmeimim, Tartus, Tapa, Rzeszów, Thumrait, JASDF Naha, Fort-Lamy | Bisher offene Vorschläge. | **Korrigiert 2026-11-07** (Entscheidung „alle belegten Befunde direkt korrigieren“). |
| PAE du Lamentin | Laut Ministerium liegt das PAE auf Martinique; die Koordinaten des Eintrags liegen aber am Flughafen Pointe-à-Pitre (Guadeloupe). | Gebiet `MQ` bleibt **offener Vorschlag**, bis geklärt ist, ob es in Guadeloupe ebenfalls eine solche Stelle gibt. |
| Namen | „Stock Barracks“ → Storck Barracks, Warrior Preparation Center → USAFE-AFAFRICA Warfare Center, Puerto Castilla (Titel von Soto Cano) – **korrigiert** (Feld `name`); der doppelte WPC-Eintrag trägt den Hinweis `duplicate-entry`. Offen: „Davis-Monthan AFB“ auf Curaçao (Forward Operating Location Hato) und „Maritime Component Command“ Neapel – dafür liegt noch keine geprüfte Quelle vor. | Auch auf visualbases.org korrigieren. |
| Positionen | Creech, Muwaffaq Salti, Humphreys, Jungle Warfare Training Center, Harold E. Holt, Puerto Castilla, Karlovac lagen 14–160 km daneben. | **Korrigiert** nach OpenStreetMap (Feld `position`, Originalwert im Profil). |
| Präsenzform | Abkommen (Schweden, Norwegen), Rotation (Polen, Baltikum) und dauerhafte Stationierung sind nicht unterschieden. | **Kategorien entschieden 2026-11-07:** `permanent`, `rotational`, `access`, `exercise`, `joint`, `historical`, `planned`. Umsetzung als Feld je Präsenz mit Quelle (Roadmap P1-1, P1-10). |

## 15. Datenpflege

- **Neue Kategorie:** Eintrag in `taxonomy.ts` (ID, `label.de`/`label.en`, `info`), ggf. Zuordnung im Importer (`*_BY_TAG`, `FEATURE_BY_TERM`); die Tests prüfen Vollständigkeit der Übersetzungen. Filter, Profil, Statistik und Exporte übernehmen sie automatisch.
- **Neuer Begriff auf visualbases.org:** erscheint nach dem Import als Warnung `term-unmapped`; zuordnen oder in `KNOWN_TERM` als bewusst nicht übernommen eintragen.
- **Korrektur:** Eintrag in `data/claims.json` mit Quelle (die Quelle zuerst in `data/research/manual.json` erfassen, damit Herausgeber und Datum bekannt sind), `status: proposed` zur Prüfung, `accepted` nach Entscheidung.
