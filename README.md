# VisualBases

**Ein interaktiver Open-Data-Atlas ausländischer Militärbasen weltweit, gebaut als moderne, schnelle Web-App ohne Tracking.**

VisualBases macht sichtbar, was selten sichtbar ist: rund 360 Standorte in über 80 Ländern, eingeordnet nach Art, Stationierungsnation, Einrichtungen und Themen (Drohnenkrieg, Atomwaffen, Umweltschäden, Widerstand vor Ort). Dazu kommen Quellen und Hintergründe.

> Idee und Datenbestand stammen von **[visualbases.org](https://visualbases.org)** (Konzept und Recherche: Karl-Heinz Peil, Friedens- und Zukunftswerkstatt e. V., in Zusammenarbeit mit World BEYOND War). Dieses Repository ist eine eigenständige Neuentwicklung als offene Web-App.

## Funktionen

| | |
|---|---|
| 🌍 **Globus-Story** | Startseite mit 3D-Globus, der beim Scrollen eine Geschichte erzählt: Netz → Deutschland → Okinawa → Afrika → Widerstand |
| 🔎 **Atlas** | Filter für Art, Nation, Einrichtung, Thema und Kontinent, Volltextsuche, synchronisierte Liste, teilbare Links (Filter stehen in der URL) |
| 🏷 **Standort-Profile** | Steckbrief, Einrichtungen, Themen, Hintergrund, Quellen, Wikipedia, verwandte Orte und Orte in der Nähe, optional Satellitenbild |
| 📍 **Deine Basis** | Entfernung zur nächsten Basis (wird im Browser berechnet) und ein **Story-Bild 1080×1920** zum Teilen auf Instagram, TikTok oder WhatsApp |
| 📊 **Zahlen** | Statistiken live aus dem Datensatz, jeweils auch als Tabelle |
| ⬇ **Offene Daten** | `data/bases.csv`, `bases.geojson`, `bases.json` zum Download |
| 🌐 **DE / EN** | Zweisprachig, Ländernamen automatisch über `Intl.DisplayNames` |
| 📱 **PWA** | Installierbar, funktioniert offline, für das Handy zuerst gestaltet |
| 🔒 **Datenschutz** | Keine Cookies, kein Tracking, keine Google-Dienste. Die Weltkarte (Natural Earth) ist Teil der App. Externe Anfragen gibt es nur auf Wunsch: Satellitenbilder (EOX Sentinel‑2) und Ortssuche (Nominatim) |

## Technik

- [Svelte 5](https://svelte.dev) + TypeScript + [Vite](https://vite.dev)
- [MapLibre GL JS](https://maplibre.org) mit Globus-Projektion, Ländergrenzen aus [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth)
- `vite-plugin-pwa` (Workbox) für Offline-Nutzung
- Vitest für Unit-Tests, `svelte-check` für Typen
- Statisches Hosting (GitHub Pages über `.github/workflows/deploy.yml`), kein Server nötig

```
data/                 Quelldaten (bases.json, stories.json) – im Repo versioniert
scripts/
  import-visualbases.mjs   Import aus visualbases.org (langsamer, höflicher Crawler mit Cache)
  build-data.mjs           erzeugt public/data/*.json|geojson|csv
src/
  lib/        Daten, Filter, i18n, Router, Karte, Share-Bild
  routes/     Home, Atlas, Near, Stats, About
  components/ BaseProfile, Legend, BarChart
```

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests
npm run check      # Typprüfung
npm run build      # Produktions-Build nach dist/
```

Daten neu von visualbases.org importieren (lädt nur Seiten, die noch nicht im Cache `.cache/visualbases` liegen):

```bash
npm run data:import
```

## Deployment auf GitHub Pages

1. Im Repository unter **Settings → Pages → Build and deployment** als Quelle **GitHub Actions** wählen.
2. Auf `main` pushen. Der Workflow prüft, testet, baut und veröffentlicht die Seite automatisch.

## Datenmodell (Auszug)

```jsonc
{
  "id": "ramstein-air-base",
  "name": "Ramstein Air Base",
  "country": "DE",                 // Gastland (ISO alpha-2)
  "lat": 49.4398, "lon": 7.6019,
  "kind": "foreign",               // foreign | shared | national | usglobal | civilian | facility | closed | hotspot | unspecific
  "nations": ["US"],               // stationierende Staaten
  "facilities": ["airfield", "command", "missile", "telecom"],
  "themes": ["resistance", "drones", "environment"],
  "usType": "MOB",                 // US-Kategorie: MOB | FOB | FOS | CSL
  "sources": [{ "url": "https://www.stoppramstein.de", "label": "Stopp Air Base Ramstein" }],
  "origin": "https://visualbases.org/ramstein-air-base/"
}
```

## Mitmachen

Fehler gefunden, neue Basis, Foto vom Protest? Dann bitte ein **Issue** eröffnen oder einen **Pull Request** stellen. Jede Angabe sollte eine Quelle haben.

## Lizenz

Code: MIT (siehe `LICENSE`). Die Daten stammen von visualbases.org; bitte bei Weiterverwendung die Quelle nennen. Die Lizenz für die Daten ist mit dem Betreiber noch abzustimmen.
Kartengrundlage: Natural Earth (gemeinfrei). Satellitenbilder: Sentinel‑2 cloudless © EOX IT Services GmbH (enthält modifizierte Copernicus-Sentinel-Daten), CC BY-NC-SA 4.0.
