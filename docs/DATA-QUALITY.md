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

Für Datensätze, deren Position nachweislich zweifelhaft ist. Ein Eintrag mit `status: "proposed"` **ändert die Daten nicht**: Er kennzeichnet den Standort in der App als **„Position ungeprüft“**, nennt den Grund und einen Korrekturvorschlag mit Quelle. Erst nach Bestätigung durch die Projektverantwortlichen wird korrigiert (`status: "applied"` bzw. Korrektur an der Quelle).

```jsonc
{
  "id": "karlovac-croatia-2",
  "status": "proposed",               // proposed | applied
  "issue": "duplicate-in-source",
  "detail": "…",
  "duplicateOf": "zadar-gazenica-croatia",
  "proposal": { "lat": 45.4893, "lon": 15.5486, "precision": "town",
                "source": "OpenStreetMap relation 11227312", "url": "https://www.openstreetmap.org/relation/11227312",
                "retrieved": "2026-11-07" }
}
```

Veröffentlicht wird das als Feld `positionCheck` an jedem Standort (JSON, GeoJSON) bzw. als CSV-Spalte `position_check` (`unverified:<grund>` oder `approximate`).

## Automatische Validierung

`npm run validate` (`scripts/validate-data.mjs`) läuft:
- vor jedem `npm run build`,
- in **CI & Deploy** vor Tests und Build (ein Fehler verhindert das Deployment),
- in **Daten aktualisieren** (`npm run data:report`): Ein fehlerhafter Import erzeugt keinen Pull Request, sonst wird der Bericht mitgeschickt.

### Fehler (blockieren)

| Regel | Prüfung |
|---|---|
| `duplicate-id`, `id`, `name` | eindeutige ID, Name vorhanden |
| `coords-missing`, `coords-range`, `coords-null-island` | Koordinaten vorhanden, im gültigen Bereich, nicht 0/0 |
| `duplicate-position` | zwei Standorte < 200 m auseinander, ohne Garnison-/Einrichtungsbezug und ohne Eintrag in `corrections.json` |
| `country-missing`, `country-invalid`, `nation-invalid` | ISO-3166-Code (plus `XK`), geprüft mit `Intl.DisplayNames` |
| `site-type`, `status`, `feature`, `theme`, `activity`, `organisation`, `listing`, `us-posture`, `continent`, `presence-*` | Werte aus dem Vokabular in `src/lib/taxonomy.ts` |
| `country-territory`, `territory-invalid` | Gastland ist der souveräne Staat, das Gebiet gehört zu ihm |
| `rule-overseas`, `rule-domestic` | Fachregeln der Taxonomie ([TAXONOMY.md](TAXONOMY.md), Abschnitt 10) |
| `origin` | Herkunft und Rohbegriffe vorhanden |
| `claim-*` | `data/claims.json`: Schema, Quellen, Werte; Korrekturen müssen auf die aktuellen Daten passen |
| `related`, `news-base`, `movement-base`, `corrections` | Verweise zeigen auf existierende Standorte |
| `image-file`, `media-file`, `media-credit` | Bilddateien vorhanden, Urheber angegeben |
| `wikimedia-license`, `wikimedia-credit`, `wikimedia-page` | Wikimedia-Fotos nur mit freier Lizenz, Urheber und Dateiseite |
| `source-url`, `news-url`, `date`, `news-date` | gültige URLs und Datumsformate (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`) |

### Warnungen (im Bericht, blockieren nicht)

`sources-none` (keine Quelle) · `sources-wikipedia-only` · `issue-*` (Prüfhinweise der Taxonomie, z. B. `issue-multiple-site-types`, `issue-nation-missing`, `issue-review-on-origin`) · `term-unmapped` (neuer Begriff auf visualbases.org) · `coords-precision` (weniger als 3 Nachkommastellen) · `coords-approx` (von Hand geokodiert) · `duplicate-position-reviewed` / `-linked` · `image-unprocessed` · `news-date-vague` · `news-duplicate` · `wikimedia-orphan` · `continent-missing`

Neue Regeln brauchen einen Test in `src/lib/validate.test.ts`.

## Importer-Regeln, die Fehler der Quelle abfangen

- **Kopierte Kartenlinks:** Ist der erste Kartenlink eines Beitrags die Position eines anderen Beitrags und enthält der Beitrag einen weiteren, nicht vergebenen Link, wird dieser genommen (`resolveCopiedCoordinates`). Betraf: Ghedi, Taara.
- **Ländercodes:** `UK → GB`, `RKS → XK`, `RP → PH`.
- **Kategorien:** Fehlende Region oder Kontinent werden für vier Beiträge über `FIXES` ergänzt; der Kontinent wird aus der Region abgeleitet. Die Zuordnung aller Begriffe zur Taxonomie steht im Importer (`SITE_TYPE_BY_CAT`, `FEATURE_BY_TERM`, `*_BY_TAG`).
- **Gebiete:** Gebietscodes im Titel (`PR`, `GL`) werden zu Staat + Gebiet; Gebiete hinter Staatscodes werden am Ortsnamen erkannt (`TERRITORY_BY_NAME`).
- **Links in der Presseschau:** Führende kodierte Leerzeichen (`%20https://…`) werden entfernt.

## Kennzeichnung in der Anwendung

| Kennzeichen | Bedeutung |
|---|---|
| ⚠ Position ungeprüft | Eintrag in `corrections.json`, mit Grund und Vorschlag |
| ≈ Position ungefähr | von Hand geokodiert, weil die Quelle keine Koordinate enthält |
| ⚠ Eintrag wird geprüft | auf visualbases.org als „Review required“ markiert |
| 📄 Im Pentagon-Bericht gelistet | Quelle: Base Structure Report (BSR) |
| ✎ Korrekturen | angewandte Aussage aus `claims.json`, mit Originalwert und Quelle |
| ⚠ Offene Prüfhinweise | Vorschläge aus `claims.json` und Prüfhinweise der Taxonomie |
| Belegstatus je Aussage | belegt · korrigiert · umstritten · nur Kontext · ungeprüft – aus der Quellenrecherche, gekennzeichnet als „redaktionell noch nicht bestätigt“ |
| (abgeleitet), (nicht als geschlossen gemeldet) | Herkunft von Standorttyp, Status und Präsenz |
