# VisualBases – Verbesserungs-Roadmap

Stand: 2026-11-08 (Paketplan, Abgleich mit dem Code; vorher 2026-11-07 nach der Quellenrecherche) · Grundlage: vollständiges Audit von Repository, Daten (`data/*.json`), Build (`dist/`) und Anwendung im Browser (Playwright, Desktop und iPhone-Emulation, axe-core) sowie die Quellenrecherche zu den 291 Standorten ohne eigene Quelle (`docs/research/SOURCE-RESEARCH.md`).

**Prioritäten:** P0 = kritische Fehler und Datenintegrität · P1 = wesentliche Verbesserungen · P2 = funktionale Erweiterungen · P3 = optional.
**Aufwand:** XS < 1 h · S ≈ halber Tag · M ≈ 1–2 Tage · L ≈ mehrere Tage.
**Status:** ✅ umgesetzt · 🟡 teilweise umgesetzt · ⏳ offen (Roadmap freigegeben 2026-11-08) · ❓ braucht Entscheidung der Projektverantwortlichen. Die Paketbuchstaben in Klammern verweisen auf die Arbeitspakete in Abschnitt 5; ein Paket ist ein Pull Request.

## 1. Audit-Befunde

### 1.1 Festgestellte Probleme (nachgewiesen)

| # | Bereich | Befund | Nachweis |
|---|---|---|---|
| F1 | Daten | **Ghedi Air Base lag an der Position von Aviano** (46.0348/12.5963). | Die Originalseite beginnt mit dem Kartenlink von Aviano; der Importer übernahm den ersten Link. |
| F2 | Daten | **Taara (Estland) lag an der Position von Tapa.** | Gleiche Ursache wie F1; die eigene Koordinate (57.8379/27.0240, Võru) steht weiter unten auf der Seite und im Google-Earth-Link. |
| F3 | Daten | **Zwei Paare mit identischen Koordinaten schon auf visualbases.org:** `puerto-castilla-honduras` = `soto-cano-honduras` (gleicher Titel „Soto Cano“), `karlovac-croatia-2` = `zadar-gazenica-croatia`. | Validierung, Quelltext der Originalseiten |
| F4 | Daten | Ungültiger Ländercode `RP` (alter Code der Philippinen) bei `mount-st-rita-naval-link-station`. | `Intl.DisplayNames` |
| F5 | Daten | Eine Presseschau-Meldung hatte die ungültige URL `%20https://…` („U.S. Out of Korea“). | Validierung |
| F6 | Daten | Das Shannonwatch-Logo wurde nicht verarbeitet (116 px, Mindestbreite war 120 px). | `build-media.mjs` |
| F7 | Quellen | 73 von 365 Standorten ohne jede Quelle, 218 nur mit Wikipedia. Keine Quelle je Aussage, kein Abruf- oder Prüfdatum. `lastmod` ist nur das Änderungsdatum der Originalseite. 21 Einträge auf der Originalseite als „Review“ markiert. | `docs/data-quality-report.md` |
| F8 | Inhalte | Aussagen in Story und Quiz ohne sichtbare Quelle: „rund 800 US-Basen“ (Vine wird genannt, nicht verlinkt), „Hälfte fehlt im BSR“, Ramstein als Drohnen-Relaisstation, Shannon „rund drei Millionen“, Okinawa „< 1 % der Fläche“. | `src/lib/i18n.svelte.ts`, `src/lib/quiz.ts` |
| F9 | QS | Keine Datenvalidierung vor dem Deployment und vor dem Daten-Update-PR. | `.github/workflows/*.yml` |
| F10 | Performance | Der PWA-Precache lud beim ersten Besuch 3,7 MB (Karte 1,07 MB, Länderformen 0,86 MB, Worker 0,5 MB, `og.png` 0,4 MB, alle Schrift-Untermengen). | `dist/sw.js` |
| F11 | Robustheit | Ohne WebGL (alte Geräte, gesperrte GPU, manche Firmen-Browser) blieb der Kartenbereich leer; es gab kein `catch`. | `src/lib/map.ts` |
| F12 | Performance | Die Globus-Rotation (rAF-Schleife) läuft auch in Hintergrund-Tabs weiter; Lighthouse kommt deshalb nicht zum Ende. | `src/routes/Home.svelte` |
| F13 | A11y | Beim Öffnen eines Standort-Profils wird der Fokus nicht verschoben. Die Liste als Tastatur-Alternative zur Karte ist nirgends erklärt. axe läuft nur lokal, nicht in der CI. | Tastatur-Test, `tests/smoke.cjs` |
| F14 | i18n | `School.svelte` nutzt Inline-Übersetzungen statt `t()`. Statische Seiten (`prerender.mjs`) gibt es nur auf Deutsch, mit duplizierten Taxonomie-Labels. | Code |
| F15 | Datenschutz | Ergebnisse der Ortssuche (Nominatim) ohne OSM-Hinweis. Die externen Dienste sind nicht an einer Stelle dokumentiert. | `src/routes/Near.svelte` |
| F16 | Rechte | 145 von 164 Bildern ohne Lizenzfeld. Dritte mit ungeklärter Lizenz: Flickr-Foto Menwith Hill, „Marcha a Rota“, Camp Delta, Oakhanger, Aegis Ashore, Kampagnen-Logos, Porträts der Kongress-Redner. Datenlizenz inzwischen festgelegt (CC BY 4.0). Status der Anrisstexte der Presseschau ungeklärt. | `data/media.json` |
| F17 | Daten | Nur 19 von 132 ausgewählten Wikimedia-Fotos heruntergeladen (die Cloud-IP wird gedrosselt). Sechs Meldungen ohne genaues Datum. Die automatische Verknüpfung von Meldungen und Basen über Ortsnamen ist ungenau. | `data/wikimedia.json`, `data/news.json` |
| F18 | Performance | Haupt-Bundle 184 KB, weil alle Routen sofort geladen werden. Die Startseite lädt die 50m-Länderformen (243 KB gz) auch dann, wenn das Okinawa-Kapitel nie erreicht wird. | `dist/assets` |
| F19 | Betrieb | ~~Die Live-Seite ist aus der Entwicklungsumgebung nicht erreichbar.~~ Erledigt: freigegeben und geprüft (Stand PR #1, fehlerfrei auf Desktop und Mobil). | Netzwerk-Proxy |
| F20 | Daten | **Falsche Nation oder falsches Land** bei mindestens 8 Standorten: BA 188 Dschibuti (FR statt US), Camp Ayanganna (Guyana statt Französisch-Guayana), Sarajevo (BA statt HR), „US Camp Castor“ (deutsch), Camp Marmal (vor allem deutsch), Al Udeid und Akrotiri (US fehlt), dazu fehlende Nation bei Guantánamo, Muwaffaq Salti, Kleine Brogel (Lager), Pápa. | Recherche 3.1 |
| F21 | Daten | **Veralteter Status** bei mindestens 16 Standorten, die die App als aktiv zeigt: Kabul, Bagram, Marmal (2021), Shamsi (2011), Niamey und Agadez (2024), Dakar und N'Djamena (Frankreich, 2025), Camp Castor (2023), al-Tanf und Rmeilan (2026), USAMMCE Pirmasens (umgezogen 2021), BA 190, Thumrait, Johnston Atoll, Vieques. | Recherche 3.2 |
| F22 | Datenmodell | Die **Art der Präsenz** wird nicht unterschieden: Zugangsrechte aus Abkommen (Schweden, Norwegen, Bulgarien, Kolumbien), Rotationen (Polen, Baltikum, Australien), Übungsplätze, gemeinsam betriebene Anlagen und historische Nutzung erscheinen wie feste Basen. | Recherche 3.3 |
| F23 | Daten | Doppelte oder falsch benannte Einträge: Warrior Preparation Center (2×), „Stock“ statt Storck Barracks, PAE Lamentin Guadeloupe (vermutlich Martinique), „Davis-Monthan AFB“ auf Curaçao, Maritime Component Command Neapel. | Recherche 3.1 |
| F24 | Quellen | Nach der Recherche haben **199 der 291** Standorte ohne eigene Quelle mindestens einen handgeprüften Beleg für die Präsenz (68 %), 29 nur Kontext oder Widerspruch, **63 weiterhin keinen** – vor allem in Afrika, Südamerika, im Südchinesischen Meer und bei deutschen Fernmeldeanlagen. Die Belege liegen in `data/research/`, noch nicht in der App. | `docs/research/coverage.csv` |
| F25 | Performance | **Precache wieder 2 MB** statt 721 KB (P0-6): Das Kartenpaket heißt seit dem Build-Update `maplibre-gl-*` statt `map-*`, der Ausschluss in `globIgnores` greift nicht mehr; die Karten-Engine (1,08 MB) wird beim ersten Besuch geladen. | `dist/sw.js`, `vite.config.ts` (festgestellt 2026-11-08; ✅ behoben in Paket C) |

### 1.2 Verbesserungsideen (keine Fehler)

2D-Kartenmodus · Clustering und Heatmap · Zeit- und Qualitätsfilter · Länder- und Standortvergleich · Profile als Dossier mit Sprungnavigation · PDF/PNG-Export · englische statische Seiten mit `hreflang` · Meta-CSP · Lazy-Loading der Routen · Designsystem-Komponenten · Änderungsprotokoll der Daten im Update-PR.

## 2. Maßnahmen

| Priorität | Bereich | Problem | Verbesserung | Nutzen für | Dateien | Aufwand | Risiko | Abnahmekriterium | Status |
|---|---|---|---|---|---|---|---|---|---|
| P0-1 | Daten | F1, F2: kopierte Koordinate | Importer sammelt alle Kartenlinks; ist der erste Link die Position eines anderen Beitrags, nimmt er den eigenen (`resolveCopiedCoordinates`). | alle, v. a. Recherche | `scripts/import-visualbases.mjs`, `data/bases.json` | S | Gering: greift nur bei geteilter Koordinate **und** eigener Alternative | Ghedi 45.431/10.298, Taara 57.838/27.024; Unit-Test | ✅ |
| P0-2 | Daten | F3: Duplikate in der Quelle | Prüf-Schicht `data/corrections.json` mit Korrekturvorschlag (OSM-Quelle); Profil zeigt „Position ungeprüft“ samt Vorschlag, die Daten bleiben unverändert. | Recherche, Presse | `data/corrections.json`, `scripts/build-data.mjs`, `BaseProfile.svelte`, `types.ts` | S | keins | Hinweis in beiden Profilen; CSV-Spalte `position_check` | ✅ |
| P0-3 | Daten | F4 | Ländercode-Aliasse `UK→GB`, `RKS→XK`, `RP→PH` | Länderfilter, Statistik | `scripts/import-visualbases.mjs` | XS | keins | Validierung ohne `country-invalid` | ✅ |
| P0-4 | QS | F9, F5 | `scripts/validate-data.mjs`: Koordinaten, Duplikate (< 200 m), Länder, Kategorien, Referenzen, Bilddateien, Lizenzen, Meldungen; bricht bei Fehlern ab, schreibt `docs/data-quality-report.md`. In `npm run build`, `deploy.yml` und `update-data.yml`. | Projektpflege | `scripts/validate-data.mjs`, `package.json`, Workflows, `src/lib/validate.test.ts` | M | gering (falsch-positive Fehler blockieren Deploy → Regeln dokumentiert) | 0 Fehler im Bestand; Tests mit fehlerhaften Fixtures schlagen an | ✅ |
| P0-5 | Daten | F5, F6 | URL-Bereinigung im Nachrichten-Import; Mindestbreite für Logos 80 px | Nutzer | `scripts/import-news.mjs`, `scripts/build-media.mjs` | XS | keins | Validierung grün, Shannon-Logo sichtbar | ✅ |
| P0-6 | Performance | F10 | Kartenpakete, Länderformen, `og.png` und nicht-lateinische Schriften aus dem Precache; Hash-Assets per Runtime-Cache | mobile Nutzer | `vite.config.ts` | S | Karte offline erst nach dem ersten Kartenbesuch | Precache 721 KB (vorher 3,7 MB) | ✅ |
| P0-7 | Robustheit | F11 | WebGL-Erkennung, `MapUnavailableError`, Hinweis in Atlas, Startseite und Einbettung; Liste und Profile bleiben bedienbar | ältere Geräte, Firmen-PCs | `src/lib/map.ts`, `MapNotice.svelte`, `Atlas/Home/Embed.svelte`, `tests/smoke.cjs` | S | keins | Smoke-Test ohne WebGL grün | ✅ |
| P1-0 | Daten | F20, F21, F23 | **Korrekturen aus der Recherche** in `data/claims.json` (Feld, alter Wert, neuer Wert, Quelle, Entscheidungsdatum): Nation, Land, Status, Zeitraum, **Position und Name** (neu), Dubletten. Profile zeigen die Korrektur mit dem Originalwert von visualbases.org. | Presse, Recherche, Glaubwürdigkeit | `data/claims.json`, `scripts/lib/resolve.mjs`, `validate-data.mjs`, `BaseProfile.svelte` | S | falsche Korrektur → nur mit geprüfter Quelle; Zweifelsfälle bleiben Vorschlag | alle belegten Befunde aus Recherche 3.1/3.2/3.5 angewandt (46 Korrekturen, 2 Prüfhinweise), 1 Vorschlag offen (PAE Lamentin) | ✅ |
| P1-1 | Quellen | F7, F8, F22, F24 | **Aussagen-Modell `data/claims.json`** (siehe Abschnitt 3) mit **Präsenzart und Zeitraum**. Startbestand automatisch aus der Recherche: 83 handgeprüfte Quellen und 122 BSR-Urteile → Aussagen zu Präsenz, Nation und Status. Danach Story und Quiz, dann Funktionen (Drohnen, Atomwaffen …) | Presse, Bildung, Recherche | neu: `data/claims.json`, `scripts/research/to-claims.mjs`; `build-data.mjs`, `validate-data.mjs`, `BaseProfile.svelte`, `Home.svelte`, `quiz.ts` | M (vorher L: Belege liegen vor) | keine erfundenen Belege; Übernahme erst nach Durchsicht | ≥ 199 Standorte mit Quellenangabe im Profil; jede Story-/Quiz-Aussage mit Quelle | 🟡 teilweise: Korrekturschicht `data/claims.json`, Belegstatus je Aussage im Profil (Taxonomie v2); Präsenzart je Präsenz mit 40 belegten Claims und abgeleitet „historisch“ (Paket A); offen: Story-/Quiz-Belege (Paket D) |
| P1-2 | Quellen | F7, F24 | **Belegstatus** je Standort aus `claims.json`: „geprüft belegt“, „nur Kontext“, „nur Wikipedia“, „ohne Beleg“, mit Herausgeber und Abrufdatum; Liste der 63 offenen Fälle mit Aufruf „Beleg melden“ (vorhandenes Mitmach-Formular) | Recherche, Mitmachen | `BaseProfile.svelte`, `Contribute.svelte`, `data.ts` | M | gering | Kennzeichnung bei allen 365 Standorten; Link „Beleg melden“ mit Standort-ID | ✅ (Paket B): Belegstufe `sourceLevel` mit sechs Stufen bei allen 365 Standorten, Schlüsselquelle mit Abrufdatum, Formular „Beleg melden“, Abschnitt „Belege gesucht“ (91) auf „Mitmachen“, Atlas-Filter `?evidence=` |
| P1-3 | Rechte | F16 | Lizenzen der Commons- und Flickr-Bilder recherchieren und eintragen; Rest `rights: "unclear"` und Liste in `DATA-SOURCES.md` | Projekt (Rechtssicherheit) | `data/media.json`, `docs/DATA-SOURCES.md` | S | keins | Jedes Bild hat Lizenz oder `unclear` | ❓ (Paket F, Entscheidung 2) |
| P1-4 | A11y | F13 | Fokus auf Profil-Überschrift, Live-Region, Hinweis „Tastatur: Liste nutzen“, axe in den Smoke-Test (CI) | Screenreader-, Tastaturnutzer | `BaseProfile.svelte`, `Atlas.svelte`, `tests/smoke.cjs` | M | gering | axe in der CI ohne Verstöße; Tastatur-Durchlauf | ✅ (Paket C): axe (WCAG 2.1 A/AA, Best Practices) auf allen Smoke-Routen in beiden Breiten, 0 Verstöße; Sprunglink „Karte überspringen“, Fokus auf Profil-Überschrift, Trefferzahl als Live-Region (verzögert) |
| P1-5 | Performance | F12 | Rotation bei verstecktem Tab und außerhalb des Sichtbereichs pausieren, nach 60 s stoppen | alle (Akku) | `Home.svelte` | XS | keins | keine rAF-Aufrufe im Hintergrund-Tab | ✅ (Paket C): gemessen 0 rAF-Aufrufe bei verstecktem Tab und ab Kapitel 2 (`src/lib/spin.ts`) |
| P1-6 | Datenschutz | F15 | OSM-Hinweis bei der Ortssuche; `docs/DATA-SOURCES.md` mit allen externen Diensten | alle | `Near.svelte`, Doku | XS | keins | Dokument vollständig, Hinweis sichtbar | ✅ (Hinweis `near.osm` in „Deine Basis“, `docs/DATA-SOURCES.md`) |
| P1-7 | i18n | F14 | `School` auf `t()` umstellen; Taxonomie-Labels für `prerender.mjs` aus einer gemeinsamen Quelle | internationale Nutzer | `School.svelte`, `prerender.mjs`, `i18n.svelte.ts` | M | gering | keine Inline-Übersetzungen mehr | ⏳ (Paket E) |
| P1-8 | Performance | F18 | Routen per `import()` laden; 50m-Länder erst beim Okinawa-Kapitel | mobile Nutzer | `App.svelte`, `Home.svelte` | S | gering | Haupt-Bundle < 120 KB; Precache wieder < 1 MB (F25) | ✅ (Paket C) mit Abweichung: Haupt-Bundle 261 → 124 KB (45 KB gz) – der Rest ist Svelte-Laufzeit, Übersetzungen und Taxonomie, die jede Ansicht braucht; weiteres Aufteilen würde nur Bytes verschieben. Precache 2 MB → 0,97 MB. Beides wird jetzt im Build geprüft (`scripts/check-precache.mjs`: Precache ≤ 1280 KB, App-Shell ≤ 130 KB). 50m-Länder erst beim Scrollen in die Story |
| P1-9 | Doku | – | `ARCHITECTURE.md` ergänzen (`DATA-SOURCES.md` erledigt) | Mitwirkende | `docs/` | S | keins | Dokument vorhanden und aktuell | ⏳ (Paket E) |
| P1-10 | Atlas | F21, F22 | **Status- und Präsenzfilter** (vorgezogen aus P2-2): aktiv / geschlossen / geplant, fest / Rotation / Zugangsrecht / Übung; geschlossene Standorte grau statt entfernt | Recherche, Bildung | `data.ts`, `map.ts`, `Atlas.svelte`, `types.ts` | M | Darstellung muss „historisch“ klar machen | Filter in der URL; Kabul, Bagram, Niger als geschlossen erkennbar | ✅ Statusfilter, geschlossene Standorte grau (Taxonomie v2); Filter „Präsenzart“ `?forms=` (Paket A) |
| P1-11 | Betrieb | F24 | Workflow „Recherche“ monatlich (BSR, Wikidata, OSM inkrementell); Bericht neu erzeugen; neue Widersprüche (Wikidata-Auflösungsdatum, OSM ohne Fund) als Issue | Projektpflege | `.github/workflows/research.yml`, `summarize.mjs` | S | Drosselung durch Dienste → inkrementell | Lauf ohne Abbruch; Bericht aktuell | 🟡 teilweise: monatlich und auf Knopfdruck von `main`, parallele Jobs, Validierung vor dem Push, Wikipedia-Cache; offen: neue Widersprüche als Issue (Paket E) |
| P1-12 | Quellen | Audit DQ P5 | **Urteile je Aussagegruppe** in `data/research/sources.json` (`verdicts` statt eines `verdict`, Genauigkeit eines Positionsbelegs); „belegt die Existenz, für die Lage nur Kontext“ wird ausdrückbar | Recherche | `sources.json`, `scripts/research/*`, `validate-data.mjs` | M | Migration der bestehenden Urteile → mechanisch, `verdict` bleibt lesbar | `verdicts` optional, gelesen über `verdictsOf()`; Validierung prüft `verdicts` und `precision` | ✅ (Paket B): 1 geteiltes Urteil (Shamsi), 11 Positionsquellen mit Genauigkeit |
| P1-13 | QS | Audit DQ P6 | **Qualitätsbericht erweitern:** Abschnitt Geografie, Quellen einschließlich Recherche (`sources.json`), Widersprüche, Verlauf (`data/data-quality-history.json`) | Projektpflege | `validate-data.mjs`, `docs/data-quality-report.md` | M | keins | Bericht zeigt Trend über mindestens zwei Läufe | ⏳ (Paket E) |
| P2-1 | Atlas | Idee | 2D-Karte (Mercator) als Umschalter, URL-Parameter `view=2d` | Präsentation, Druck | `map.ts`, `Atlas.svelte` | M | Darstellung der Pole | Umschalten ohne Neuladen | ⏳ |
| P2-2 | Atlas | Idee | Clustering bei niedrigem Zoom, Filter „Belegstatus“ (Status/Präsenzart → P1-10) | Recherche | `map.ts`, `data.ts`, `Atlas.svelte` | M | Überladung der Karte vermeiden | Filter in der URL, Tests | ⏳ |
| P2-3 | Recherche | Idee | Vergleich von Ländern und Standorten (teilbare URL) | Presse, Bildung | neue Route | M | – | Vergleich per Link reproduzierbar | ⏳ |
| P2-4 | Profile | Idee | Dossier-Gliederung mit Sprungnavigation (Überblick, Lage, Funktionen, Geschichte, Auswirkungen, Widerstand, Bilder, Quellen) | Recherche | `BaseProfile.svelte` | M | keine künstlichen Inhalte | Abschnitte nur bei vorhandenen Daten | ⏳ |
| P2-5 | Export | Idee | Druck-/PDF-Ansicht für Profil und Land, Statistik-CSV, gefiltertes GeoJSON, Quellenverzeichnis, Karten-PNG mit Quellenzeile | Presse, Bildung | neue Export-Module | L | Kartenexport mit EOX-Kacheln: CC BY-NC-SA | Exporte auch bei fehlenden Feldern; Tests | ⏳ |
| P2-6 | SEO/i18n | Idee | Englische statische Seiten mit `hreflang` | international | `prerender.mjs` | S | – | `en/b/<id>.html` vorhanden | ⏳ |
| P2-7 | Daten | F17 | Änderungsprotokoll der Daten im Update-PR (neue, geänderte, entfernte Standorte) | Projektpflege | `update-data.yml`, neues Skript | S | – | PR-Text listet Änderungen | ⏳ |
| P2-8 | UI | Idee | Kleine Designsystem-Komponenten (Button, Chip, Card, Section) aus vorhandenem CSS | Wartbarkeit | `src/components/ui/*` | M | Refactoring-Risiko → schrittweise | keine visuellen Regressionen (Screenshots) | ⏳ |
| P3-1 | Atlas | Idee | Heatmap-Ebene für Konzentrationen | Präsentation | `map.ts` | S | Fehldeutung als „Anzahl Soldaten“ | Legende erklärt die Bedeutung | ⏳ |
| P3-2 | Sicherheit | Idee | Meta-CSP (GitHub Pages erlaubt keine Header) | – | `index.html` | S | bricht ggf. Worker oder Tiles | Smoke-Test grün | ⏳ |
| P3-3 | i18n | Idee | Weitere Sprachen, Übersetzungen nachladen | international | `i18n` | M | – | – | ⏳ |

## 3. Datenmodell für Phase II (entschieden: eigene Aussagen-Datei)

`data/bases.json` bleibt das Ziel des automatischen Imports. Handgepflegte Belege liegen getrennt, damit kein Import sie überschreibt:

```jsonc
// data/claims.json
[
  {
    "id": "ramstein-drone-relay",
    "base": "ramstein-air-base",            // oder null für allgemeine Aussagen (Story, Quiz)
    "field": "themes.drones",               // worauf sich die Aussage bezieht
    "statement": { "de": "…", "en": "…" },
    "status": "confirmed",                  // confirmed | unconfirmed | disputed | outdated
    "presence": "permanent",                // permanent | rotational | access | exercise | joint | historical | planned
    "validFrom": "2013", "validTo": null,   // zeitlicher Bezug
    "sources": [
      { "url": "…", "publisher": "…", "published": "2015-04-17", "accessed": "2026-11-07", "type": "media" }
    ]
  }
]
```

**Startbestand aus der Recherche:** Jede Quelle in `data/research/sources.json` mit `method: manual` wird zu einer Aussage je belegtem Merkmal (`supports` → `confirmed`, `contradicts` → `disputed`/`outdated`, `context` bleibt Anhang). Die Präsenzart wird von Hand ergänzt (Hinweise stehen in `note`). Ein Hilfsskript (`scripts/research/to-claims.mjs`) erzeugt einen Entwurf, die Übernahme erfolgt nach Durchsicht.

`build-data.mjs` hängt die Aussagen an die Standorte. Profile zeigen Status und Quelle je Aussage, und die Validierung prüft die Pflichtfelder. Änderungen bleiben über die Git-Historie nachvollziehbar.

## 4. Entscheidungen der Projektverantwortlichen

1. ~~**Datenlizenz**~~ – entschieden: **CC BY 4.0** (umgesetzt, `data/LICENSE.md`).
2. **Bilder Dritter:** Freigabe oder Urhebernennung für Flickr (Menwith Hill), „Marcha a Rota“, Camp Delta, Oakhanger, Aegis Ashore, Kampagnen-Logos, Porträts der Kongress-Redner.
3. **Anrisstexte der Presseschau:** Sind es eigene Zusammenfassungen von visualbases.org oder Zitate?
4. **Korrekturvorschläge:** ~~Puerto Castilla~~ – angewandt als eigener Ort (Ortsmitte, `town`); ~~Libreville~~ – angenommen 2026-11-08 (Gabun). Offen: **Karlovac**, genaue Anlage (derzeit Stadtmitte, `town`).
5. **Impressum** (Pflicht für eine deutsche Website).
6. ~~**Übernahme der Recherche**~~ – entschieden 2026-11-07: **alle belegten Befunde direkt korrigieren** (mit Quelle und Originalwert im Profil); nur nicht ausreichend belegte Fälle bleiben Vorschlag.
7. ~~**Geschlossene Standorte**~~ – entschieden: **grau in der Karte lassen**, nicht ausblenden.
8. ~~**Präsenzarten**~~ – entschieden: fest / Rotation / Zugangsrecht / Übung / gemeinsam betrieben / historisch / geplant **passen** (Umsetzung in P1-1 und P1-10).
9. ~~**Roadmap**~~ – freigegeben 2026-11-08, Reihenfolge und Arbeitspakete nach Abschnitt 5.
10. **Präsenzart in „Deine Basis“:** Sollen Standorte mit nur geplanter, Übungs- oder Zugangspräsenz in der Rangliste anders behandelt werden (ausblenden oder als „unsicher“ markieren)? Bis zur Entscheidung zeigt die Rangliste sie unverändert (Paket A, 2026-11-08).

## 5. Reihenfolge und Arbeitspakete

Bisher erledigt: ✅ Durchgang 1 (P0) · ✅ Quellenrecherche · ✅ P1-0 Korrekturen · ✅ Audit des Datenqualitätsmanagements, Pakete 1–3 (`docs/data-quality-audit.md`) · ✅ P1-6 · ✅ Paket 0 · ✅ Paket A · ✅ Paket B · ✅ Paket C.

**Arbeitsweise:** Ein Paket ist ein Pull Request. Vor der Umsetzung steht ein kurzer Plan mit Abnahmekriterien; danach laufen `npm test`, `npm run validate`, `npm run check`, Build und Smoke-Test, und Roadmap-Status und `docs/CHANGELOG.md` werden im selben PR nachgeführt. Gemergt wird nur von den Projektverantwortlichen. Entscheidungen, die kein Paket blockieren, sammelt `USER_TASKS.md`.

| Paket | Inhalt | Aufwand | Entscheidung nötig | Status |
|---|---|---|---|---|
| 0 | Roadmap aufräumen: Status mit dem Code abgleichen, offene Punkte des Datenqualitäts-Audits (P1-12, P1-13) übernehmen, Paketplan | XS | – | ✅ |
| A | **Präsenzart:** P1-1 Präsenzart je Präsenz (Datenmodell, Ableitung, Korrekturen aus der Recherche, Profil) + P1-10 Präsenzfilter im Atlas | M–L | – (Kategorien entschieden, Abschnitt 4.8) | ✅ |
| B | **Belegstatus:** P1-2 Kennzeichnung bei allen Standorten, Aufruf „Beleg melden“ + P1-12 Urteile je Aussagegruppe | M | – | ✅ |
| C | **Zugänglichkeit und Performance:** F25 Precache reparieren, P1-5 Rotation pausieren, P1-8 Routen nachladen, P1-4 Fokus, Live-Region, axe in der CI | S–M | – | ✅ |
| D | **Belege für Story und Quiz:** Rest von P1-1, jede Aussage mit Quelle | M | – | ⏳ |
| E | **Betrieb, Konsistenz und Doku:** Rest von P1-11, P1-7, P1-9, P1-13 | M | – | ⏳ |
| F | **Bildrechte:** P1-3 | S | ja (Abschnitt 4.2) | ❓ |
| G | **Atlas:** P2-1, P2-2 | M–L | – | ⏳ |
| H | **Dossier und Export:** P2-4, P2-5, P2-3 | L | – | ⏳ |
| I | **Rest:** P2-6 bis P2-8, P3 | – | – | ⏳ |

**Begründung der Änderung:** Die Recherche zeigt, dass das größte Risiko für die Glaubwürdigkeit nicht fehlende Quellen allein sind, sondern **falsche und veraltete Angaben** (F20, F21) und die fehlende Unterscheidung der Präsenzart (F22). Deshalb kommen Korrekturvorschläge (P1-0) und der Status-/Präsenzfilter (P1-10) nach vorn. Das Aussagen-Modell wird kleiner (M statt L), weil die Belege für zwei Drittel der Standorte schon vorliegen.
