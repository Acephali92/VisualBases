# VisualBases – Roadmap zum Launch und danach

Stand: 2026-11-08 · Ersetzt die Fassung vom 2026-11-07; deren Audit-Befunde und Maßnahmentabelle stehen unverändert im [Anhang](#anhang-a-audit-befunde-vom-2026-11-07).

**Priorität:** L0 = blockiert den Launch · L1 = erste Woche nach dem Launch · L2 = Ausbau · L3 = Ideen.
**Aufwand:** XS < 1 h · S ≈ halber Tag · M ≈ 1–2 Tage · L ≈ mehrere Tage.
**Wer:** 👤 Projektverantwortliche (Rechte, Entscheidungen, Kontakte) · 🤖 Claude (Code, Daten, Doku).

---

## 0. Ziel und Launch-Definition

**Ziel:** VisualBases macht ausländische Militärstützpunkte weltweit sichtbar und **nachprüfbar**, für Presse, Bildung, Friedensbewegung und interessierte Öffentlichkeit. Der Wert des Projekts liegt nicht in der Menge der Punkte auf der Karte, sondern in der **Glaubwürdigkeit** jeder Angabe: Herkunft, Beleg, Genauigkeit und Korrekturen sind offen gelegt.

**Launch-fähig heißt:** Eine Journalistin, eine Lehrerin oder ein Aktivist kann die Seite heute teilen, ohne dass sie peinlich oder angreifbar ist. Konkret:

| # | Kriterium | Stand |
|---|---|---|
| K1 | Seite öffentlich erreichbar, Deploy automatisch und grün | ✅ https://acephali92.github.io/VisualBases/ (HTTP 200, CI & Deploy grün) |
| K2 | **Rechtlich sauber:** Impressum, Datenschutzhinweis, Lizenzen der Daten und Bilder | 🟡 Datenschutzerklärung ✅ · Bildrechte ✅ (30 ungeklärte Bilder ausgeblendet) · **Impressum: Angaben fehlen** (`npm run launch:check`) |
| K3 | **Daten ohne bekannte grobe Fehler:** 0 Validierungsfehler, keine bekannten Länder- oder Positionsfehler offen | ✅ 0 Fehler; Audit-Pakete 1–4 und Geo-Recherche umgesetzt (PR #11–#14 offen) |
| K4 | **Transparenz:** Quelle, Belegstatus und Korrekturen je Standort sichtbar; Methodik erklärt | ✅ im Profil; Seite „Methodik & Datenqualität“ mit Kennzahlen, Verlauf und Korrekturprotokoll |
| K5 | **Belastbar bei Andrang:** Ortssuche fällt nicht aus, Seite lädt mobil schnell | 🟡 Ortssuche mit Cache, Drosselung und Not-Aus, aber ein öffentlicher Nominatim-Server für alle Nutzer |
| K6 | **Zugänglich:** keine axe-Verstöße auf den Hauptseiten, Tastaturbedienung | ✅ axe (WCAG 2.1 A/AA) im Smoke-Test: 16 Seiten, Deutsch (Desktop, Mobil) und Englisch, 48 Prüfungen, 0 Verstöße |
| K7 | **Daten bleiben aktuell:** wöchentlicher Import läuft und erzeugt prüfbare PRs | ❌ Workflow „Daten aktualisieren“ ist noch nie gelaufen |
| K8 | **Rückmeldewege funktionieren:** Hinweis- und Korrekturformular, Labels, Kontaktadresse | 🟡 Formulare vorhanden; Labels `hinweis`, `korrektur`, `daten` fehlen; E-Mail unbestätigt |

---

## 1. Was seit dem letzten Stand erledigt ist

- **Datenqualität (Audit 2026-11-08, [data-quality-audit.md](data-quality-audit.md)):**
  - **Robustheit:** Kaputte Datendateien gehen nicht mehr unbemerkt durch.
  - **Korrekturen:** halten ihren Ausgangswert fest (`expect`) und melden, wenn sich die Quelle ändert.
  - **Positionen:** haben eine Genauigkeitsstufe, werden gegen das Gastland geprüft (Natural Earth) und mit Wikidata und OSM abgeglichen. Quellen haben Urteile je Aussagegruppe.
  - **Bericht:** enthält einen Abschnitt Geografie und einen Verlauf über die Zeit.
- **Geo-Recherche:**
  - 25 Warnungen geklärt: 8 Positionen korrigiert, 17 bestätigt.
  - Libreville (Ghana → Gabun) korrigiert.
  - Ergebnis: Positionen mit unabhängigem Beleg 118 → 137, geografische Warnungen 24 → 8.
- **Importer:** übernimmt bei groben Kartenlinks die genauere Koordinate aus dem Beitrag. Laut Probelauf ändern sich damit beim nächsten Import 20 Positionen.
- **Offene PRs** (in dieser Reihenfolge mergen, jeweils die Basis des nächsten auf `main` umstellen):
  1. [#11](https://github.com/Acephali92/VisualBases/pull/11) Geo-Prüfungen
  2. [#12](https://github.com/Acephali92/VisualBases/pull/12) Geo-Recherche
  3. [#13](https://github.com/Acephali92/VisualBases/pull/13) Importer
  4. [#14](https://github.com/Acephali92/VisualBases/pull/14) Paket 4
  5. [#15](https://github.com/Acephali92/VisualBases/pull/15) Roadmap
  6. [#16](https://github.com/Acephali92/VisualBases/pull/16) Launch-Vorbereitung (Block B)

---

## 2. Launch-Plan: die nächsten Stunden (L0)

Reihenfolge so gewählt, dass nichts aufeinander wartet: Block A und Block B laufen parallel, Block C ist die Abnahme.

### Block A – Projektverantwortliche (👤, ca. 1 Stunde)

| # | Aufgabe | Warum | Aufwand |
|---|---|---|---|
| A1 | PR-Kette #11 → #14 (und diesen PR) mergen; nach jedem Merge die Basis des nächsten PR auf `main` stellen | bringt Datenkorrekturen und Prüfungen live | 20 min |
| A2 | **Impressum-Angaben** schicken: verantwortliche Person oder Verein, Anschrift, E-Mail (§ 5 DDG, § 18 MStV) | rechtliche Pflicht, K2 | 10 min |
| A3 | **Bildrechte entscheiden** (siehe B2): eigene Archivbilder von visualbases.org freigegeben? Bilder Dritter (Flickr Menwith Hill, „Marcha a Rota“, Camp Delta, Oakhanger, Aegis Ashore, Kampagnen-Logos, Redner-Porträts) bis zur Klärung ausblenden? | K2 | 15 min |
| A4 | **Settings → Actions → General:** „Read and write permissions“ und „Allow GitHub Actions to create and approve pull requests“; dann „Daten aktualisieren“ einmal manuell starten | K7, wendet die neue Importer-Regel an | 5 min |
| A5 | **Labels** `hinweis`, `korrektur`, `daten` anlegen; **Branch-Schutz** für `main` (PR + grüne CI) | K8, Schutz vor versehentlichen Direkt-Pushes | 10 min |
| A6 | **Kontakt-E-Mail** bestätigen (derzeit info@visualbases.org) | K8 | 2 min |

### Block B – Claude (🤖, ca. 2–3 Stunden)

| # | Aufgabe | Ergebnis / Abnahme | Aufwand |
|---|---|---|---|
| B1 ✅ | **Impressum und Datenschutzerklärung** als eigene Seiten (`#/impressum`, `#/datenschutz`), verlinkt im Fuß jeder Seite und in den statischen Seiten; Datenschutz listet alle externen Dienste (EOX-Satellitenkacheln, Nominatim, GitHub Pages) und betont: kein Tracking, keine Cookies | umgesetzt; Impressum-Angaben in `src/lib/legal.ts` eintragen (A2), `npm run launch:check` prüft sie | S |
| B2 ✅ | **Bildrechte absichern:** Feld `rights` in `data/media.json` (`own-archive` · `free-licence` · `google-earth` · `unclear`); `unclear` wird nicht angezeigt, bis geklärt; Validierungsregel `media-rights`; Liste der offenen Fälle in `DATA-SOURCES.md` | umgesetzt: 30 Bilder ausgeblendet und nicht mit ausgeliefert, Liste in `DATA-SOURCES.md` | S |
| B3 ✅ | **Seite „Methodik & Datenqualität“** (`#/quality`): wie Daten entstehen (Import, Korrekturen, Recherche), Belegstatus und Genauigkeit erklärt, Kennzahlen aus dem Bericht (unabhängig belegte Positionen, Korrekturen, offene Prüfungen) samt Verlauf, Link „Fehler melden“ | umgesetzt, dazu das öffentliche Korrekturprotokoll (Idee aus Abschnitt 5) | S |
| B4 ✅ | **axe in den Smoke-Test** (Startseite, Atlas, Profil, Deine Basis, Über) und gefundene Verstöße beheben | umgesetzt; behoben: Label-in-Name bei Sprachumschalter und Kennzahlen-Link | S |
| B5 | **Ortssuche absichern:** PLZ-Index für DE/AT/CH als statische Datei (GeoNames, CC BY 4.0) für die häufigste Eingabe; Nominatim nur noch für Ortsnamen. Not-Aus in `public/config/geocoder.json` dokumentiert | K5; „Deine Basis“ funktioniert auch bei Presseandrang für Postleitzahlen ohne externe Anfrage | S |
| B6 | **Erster Daten-Update-PR** (nach A4) prüfen: 20 verfeinerte Positionen, `claim-upstream-changed` bei 6 Positions-Claims (dann überflüssige Claims entfernen), neue/geänderte Beiträge | K3, K7 | XS–S |
| B7 🟡 | **Launch-Abnahme:** Smoke-Test Desktop und Mobil, Lighthouse (Performance, A11y, SEO), Vorschaubilder (Open Graph) in Messenger/Mastodon prüfen, englische Oberfläche durchklicken, 404-Verhalten, Offline-Fallback | erster Durchgang 2026-11-08: Smoke und axe grün, Lighthouse siehe unten; offen: Vorschaubilder in Messengern, Durchklicken auf echten Geräten | S |

**Lighthouse, mobil (Moto-G-Profil, Drosselung), lokaler Build, 2026-11-08.** Die TBT-Werte sind überhöht, weil WebGL in der Testumgebung per Software (SwiftShader) rechnet.

| Seite | Performance | Barrierefreiheit | Best Practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Startseite | 51 (vorher nicht messbar: Globus drehte endlos) | 100 | 100 | 100 | 4,4 s | 0 |
| Standort per geteiltem Link (`b/ramstein-air-base.html`) | 44 (vorher 17) | 100 | 100 | 100 | 5,6 s (vorher 8,6 s) | 0 (vorher 0,34) |
| Atlas | 65 | 100 | 100 | 100 | 3,0 s | 0 |
| Methodik | 93 | 100 | 100 | 100 | 3,0 s | 0 |

Verbleibender Hebel für die Ladezeit: App-Bundle und Karten-Engine (L1-6).

### Block C – Go/No-Go und Launch

1. **Go**, wenn: K1–K3 ✅, K4–K8 mindestens 🟡 mit bekanntem Plan, Smoke-Test und axe grün, Bericht 0 Fehler, `npm run build && npm run launch:check` ohne ✘.
2. **Launch-Paket:** kurzer Ankündigungstext (DE/EN) mit 3 Beispielen, die das Projekt tragen: Ramstein und der Drohnenkrieg, Okinawa, „Deine Basis“. Dazu Vorschaubild und Link auf die Methodik-Seite.
3. **Kanäle:** Partner benachrichtigen (Stopp Ramstein, World BEYOND War, CND, No to NATO), Einbett-Karte anbieten (Atlas → „Einbetten“).
4. **Rückfallebene:** Ortssuche per `geocoder.json` abschaltbar; Fehlerseite verweist auf das Hinweisformular; jeder Merge löst ein neues Deployment aus.

---

## 3. Erste Woche nach dem Launch (L1)

| # | Bereich | Maßnahme | Nutzen | Aufwand |
|---|---|---|---|---|
| L1-1 | Glaubwürdigkeit | **„Beleg melden“** direkt im Profil (vorausgefülltes Issue mit Standort, Aussagegruppe, Quelle); Liste „228 Positionen ohne unabhängigen Beleg – hilf mit“ auf der Methodik-Seite | verwandelt Leser in Prüfer | S |
| L1-2 | Glaubwürdigkeit | **Lage im Profil erklären:** Genauigkeitsstufe und Herkunft (`positionFrom`, OSM-Beleg, Korrektur) als kurze Zeile „Position: Anlage, belegt durch OpenStreetMap“ | beantwortet die häufigste Rückfrage der Presse | XS |
| L1-3 | Daten | **Präsenzart** je Präsenz (fest / Rotation / Zugangsrecht / Übung / gemeinsam / historisch / geplant, Kategorien entschieden) und Filter im Atlas | trennt „Basis“ von „Zugangsrecht“, der häufigste fachliche Einwand | M |
| L1-4 | Betrieb | **Änderungsprotokoll im Daten-PR** (neue, geänderte, entfernte Standorte, verschobene Positionen mit km) | Updates in Minuten prüfbar | S |
| L1-5 | Betrieb | Recherche-Workflow: neue Widersprüche und `position-check-stale` automatisch als Issue | nichts bleibt im Bericht liegen | S |
| L1-6 | Performance | Routen per `import()` nachladen, Länderformen erst bei Bedarf, Daten-Aufbereitung beim Start verschlanken (App-Bundle ≈ 3,4 s CPU auf Mittelklasse-Handys); Globus-Rotation ✅ begrenzt | schnellerer Erstaufruf mobil (LCP < 2,5 s) | S–M |
| L1-7 | Qualität | **Warnungen zu Fehlern hochstufen**, sobald 0: `coords-country`, `duplicate-name-near`, `claim-upstream-changed` | Rückfälle blockieren das Deployment | XS |
| L1-8 | Rechte | Bildrechte der ausgeblendeten Bilder klären, Wikimedia-Rest per Workflow laden | mehr Bilder, rechtssicher | S (👤 + 🤖) |

---

## 4. Ausbau (L2)

| # | Maßnahme | Nutzen | Aufwand |
|---|---|---|---|
| L2-1 | **Dossier-Profil** mit Sprungnavigation (Überblick, Lage, Funktionen, Geschichte, Auswirkungen, Widerstand, Bilder, Quellen), Abschnitte nur bei vorhandenen Daten | Recherche, Presse | M |
| L2-2 | **Export:** Druck/PDF je Profil und Land, gefiltertes GeoJSON/CSV, Quellenverzeichnis, Karten-PNG mit Quellenzeile (EOX-Kacheln nur nicht-kommerziell) | Presse, Bildung | L |
| L2-3 | **Zeitachse:** Präsenzen über die Jahre (Zeiträume aus `period`, geschlossene Standorte), z. B. Abzug aus Afghanistan 2021, Niger 2024 | Bildung, Analyse | M |
| L2-4 | **Englische statische Seiten** mit `hreflang`, weitere Sprachen bei Bedarf (ES/FR für Lateinamerika und Afrika) | internationale Reichweite | S–M |
| L2-5 | **2D-Karte** und Clustering bei niedrigem Zoom | Präsentation, Druck | M |
| L2-6 | **Vergleich** von Ländern und Standorten per teilbarer URL | Presse, Bildung | M |
| L2-7 | Restliche Geo-Kandidaten aus dem Beitragsabgleich (Übungsplätze) und das Darmstadt Training Center klären | Datenqualität | S |

---

## 5. Neue Ideen und Ansätze (L3, frei gedacht, vom Ziel her)

Leitfrage: *Was macht VisualBases zur Referenz, die man zitiert, statt zu einer Karte, die man einmal ansieht?*

### Glaubwürdigkeit als Produkt
- **Öffentliches Korrekturprotokoll:** jede angewandte Korrektur mit Originalwert, Quelle und Datum als Liste und RSS-Feed. Fehler offen zu legen schafft mehr Vertrauen als Fehlerfreiheit zu behaupten.
- **Versionierte Datenreleases mit DOI** (GitHub Release → Zenodo): monatlich, mit Changelog, CSV/GeoJSON und Lizenz. Forschende können eine feste Version zitieren.
- **Zitierhilfe** im Profil („So zitieren Sie diesen Eintrag“, mit Datenversion und Abrufdatum).
- **Abgleich mit amtlichen Listen** als eigene Ansicht: „Der Pentagon-Bericht (BSR) nennt in Land X n Standorte, VisualBases m, davon k nicht im BSR“. Macht Lücken der offiziellen Darstellung sichtbar, sachlich und belegt.

### Mitmachen, ohne die Qualität zu gefährden
- **Prüf-Warteschlange:** Die Warnungen des Berichts (ohne Beleg, Wikidata-Abweichung, ungefähr) werden zu kleinen Aufgaben („Liegt diese Basis hier? Quelle?“), die man ohne GitHub-Konto per Formular beantworten kann. Übernommen wird weiter nur nach redaktioneller Prüfung.
- **Lokale Paten:** Initiativen vor Ort übernehmen „ihre“ Standorte (Ramstein, Büchel, Okinawa) und halten Status und Bilder aktuell.

### Reichweite und Bildung
- **„Deine Basis“ als Einstieg** ausbauen: Teilbild mit Entfernung (vorhanden) plus Link auf das Dossier und eine Handlungsoption (Initiative in der Nähe, Abgeordnete).
- **Unterrichtsmaterial:** Quiz und Schule mit belegten Aussagen, druckbare Arbeitsblätter je Thema (Atomwaffen, Drohnen, Raketenabwehr), CC BY.
- **Themenpfade** statt nur Karte: kuratierte Geschichten (Ramstein und Drohnen, nukleare Teilhabe, Pazifik), jede Aussage mit Quelle.
- **Einbett-Widgets je Land/Region** für Partnerseiten und Lokalpresse.

### Nachhaltiger Betrieb
- **Öffentliche JSON-API dokumentieren** (die statischen Dateien sind schon eine API): JSON-Schema, Beispiele, Lizenz. Ermöglicht Nachnutzung durch Datenjournalismus.
- **Änderungsbenachrichtigung** je Standort oder Land (RSS aus dem Daten-Changelog), ohne Konten und ohne Tracking.
- **Eigene Domain** (`app.visualbases.org`) und ein gespiegelter Geocoder bzw. Fallback-Anbieter für Lastspitzen.

---

## 6. Offene Entscheidungen (👤)

1. **Impressum:** verantwortliche Stelle (A2).
2. **Bilder:** Freigabe der eigenen Archivbilder; Umgang mit Bildern Dritter bis zur Klärung (A3).
3. **Anrisstexte der Presseschau:** eigene Zusammenfassungen oder Zitate? (rechtlich relevant bei Zitaten)
4. **PLZ-Index** für „Deine Basis“ ins Repository aufnehmen (B5): empfohlen.
5. **Eigene Domain** ja/nein (beeinflusst `SITE_URL`, Vorschaubilder, Sitemap).
6. **Datenreleases mit DOI** (Zenodo) ja/nein.

Entschieden: Datenlizenz CC BY 4.0 · belegte Befunde direkt korrigieren, Zweifelsfälle als Vorschlag · geschlossene Standorte grau · Präsenzarten fest/Rotation/Zugangsrecht/Übung/gemeinsam/historisch/geplant · Libreville und Ouagadougou korrigiert (2026-11-08).

---

## Anhang A: Audit-Befunde vom 2026-11-07

Unverändert übernommen. Viele Punkte sind inzwischen erledigt; den aktuellen Datenstand zeigen [data-quality-report.md](data-quality-report.md) und [data-quality-audit.md](data-quality-audit.md).


### A.1 Festgestellte Probleme (nachgewiesen)

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


## Anhang B: Maßnahmentabelle vom 2026-11-07

Statusspalte auf dem Stand vom 2026-11-07. Die aktuelle Priorisierung steht oben (Abschnitte 2–4).

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
| P1-1 | Quellen | F7, F8, F22, F24 | **Aussagen-Modell `data/claims.json`** (siehe Abschnitt 3) mit **Präsenzart und Zeitraum**. Startbestand automatisch aus der Recherche: 83 handgeprüfte Quellen und 122 BSR-Urteile → Aussagen zu Präsenz, Nation und Status. Danach Story und Quiz, dann Funktionen (Drohnen, Atomwaffen …) | Presse, Bildung, Recherche | neu: `data/claims.json`, `scripts/research/to-claims.mjs`; `build-data.mjs`, `validate-data.mjs`, `BaseProfile.svelte`, `Home.svelte`, `quiz.ts` | M (vorher L: Belege liegen vor) | keine erfundenen Belege; Übernahme erst nach Durchsicht | ≥ 199 Standorte mit Quellenangabe im Profil; jede Story-/Quiz-Aussage mit Quelle | 🟡 teilweise (Taxonomie v2): Korrekturschicht `data/claims.json`, Belegstatus je Aussage im Profil; offen: Präsenzart, Story/Quiz-Belege |
| P1-2 | Quellen | F7, F24 | **Belegstatus** je Standort aus `claims.json`: „geprüft belegt“, „nur Kontext“, „nur Wikipedia“, „ohne Beleg“, mit Herausgeber und Abrufdatum; Liste der 63 offenen Fälle mit Aufruf „Beleg melden“ (vorhandenes Mitmach-Formular) | Recherche, Mitmachen | `BaseProfile.svelte`, `Contribute.svelte`, `data.ts` | M | gering | Kennzeichnung bei allen 365 Standorten; Link „Beleg melden“ mit Standort-ID | ⏳ |
| P1-3 | Rechte | F16 | Lizenzen der Commons- und Flickr-Bilder recherchieren und eintragen; Rest `rights: "unclear"` und Liste in `DATA-SOURCES.md` | Projekt (Rechtssicherheit) | `data/media.json`, `docs/DATA-SOURCES.md` | S | keins | Jedes Bild hat Lizenz oder `unclear` | ⏳ |
| P1-4 | A11y | F13 | Fokus auf Profil-Überschrift, Live-Region, Hinweis „Tastatur: Liste nutzen“, axe in den Smoke-Test (CI) | Screenreader-, Tastaturnutzer | `BaseProfile.svelte`, `Atlas.svelte`, `tests/smoke.cjs` | M | gering | axe in der CI ohne Verstöße; Tastatur-Durchlauf | ⏳ |
| P1-5 | Performance | F12 | Rotation bei verstecktem Tab und außerhalb des Sichtbereichs pausieren, nach 60 s stoppen | alle (Akku) | `Home.svelte` | XS | keins | keine rAF-Aufrufe im Hintergrund-Tab | ⏳ |
| P1-6 | Datenschutz | F15 | OSM-Hinweis bei der Ortssuche; `docs/DATA-SOURCES.md` mit allen externen Diensten | alle | `Near.svelte`, Doku | XS | keins | Dokument vollständig, Hinweis sichtbar | ⏳ |
| P1-7 | i18n | F14 | `School` auf `t()` umstellen; Taxonomie-Labels für `prerender.mjs` aus einer gemeinsamen Quelle | internationale Nutzer | `School.svelte`, `prerender.mjs`, `i18n.svelte.ts` | M | gering | keine Inline-Übersetzungen mehr | ⏳ |
| P1-8 | Performance | F18 | Routen per `import()` laden; 50m-Länder erst beim Okinawa-Kapitel | mobile Nutzer | `App.svelte`, `Home.svelte` | S | gering | Haupt-Bundle < 120 KB | ⏳ |
| P1-9 | Doku | – | `ARCHITECTURE.md` ergänzen (`DATA-SOURCES.md` erledigt) | Mitwirkende | `docs/` | S | keins | Dokument vorhanden und aktuell | ⏳ |
| P1-10 | Atlas | F21, F22 | **Status- und Präsenzfilter** (vorgezogen aus P2-2): aktiv / geschlossen / geplant, fest / Rotation / Zugangsrecht / Übung; geschlossene Standorte grau statt entfernt | Recherche, Bildung | `data.ts`, `map.ts`, `Atlas.svelte`, `types.ts` | M | Darstellung muss „historisch“ klar machen | Filter in der URL; Kabul, Bagram, Niger als geschlossen erkennbar | 🟡 teilweise (Taxonomie v2): Statusfilter, geschlossene Standorte grau; offen: Präsenzart (fest/Rotation/Zugang/Übung) |
| P1-11 | Betrieb | F24 | Workflow „Recherche“ monatlich (BSR, Wikidata, OSM inkrementell); Bericht neu erzeugen; neue Widersprüche (Wikidata-Auflösungsdatum, OSM ohne Fund) als Issue | Projektpflege | `.github/workflows/research.yml`, `summarize.mjs` | S | Drosselung durch Dienste → inkrementell | Lauf ohne Abbruch; Bericht aktuell | 🟡 teilweise: monatlich und auf Knopfdruck von `main`, parallele Jobs, Validierung vor dem Push, Wikipedia-Cache; offen: neue Widersprüche als Issue |
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
