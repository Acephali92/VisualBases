# Aufgaben für dich (Projekt-Inhaber)

Diese Punkte kann ich (Claude) nicht selbst erledigen, weil sie Rechte im GitHub-Konto, Entscheidungen oder Kontakte erfordern. Sortiert nach Dringlichkeit. Den Gesamtplan zeigt [docs/IMPROVEMENT-ROADMAP.md](docs/IMPROVEMENT-ROADMAP.md) (Abschnitt 2 „Launch-Plan“).

## 1. Jetzt: Launch (Block A der Roadmap, ca. 1 Stunde)

- [ ] **PR-Kette mergen**, in dieser Reihenfolge. Nach jedem Merge stellst du beim nächsten PR die Basis auf `main` um (im PR oben „Edit“ → base: `main`):
  1. [Acephali92/VisualBases#11](https://github.com/Acephali92/VisualBases/pull/11) Geo-Prüfungen
  2. [Acephali92/VisualBases#12](https://github.com/Acephali92/VisualBases/pull/12) Geo-Recherche
  3. [Acephali92/VisualBases#13](https://github.com/Acephali92/VisualBases/pull/13) Importer
  4. [Acephali92/VisualBases#14](https://github.com/Acephali92/VisualBases/pull/14) Paket 4
  5. der Roadmap-PR

  Der Branch `claude/dq-audit-paket4` ist überholt und kann gelöscht werden.
- [ ] **Impressum-Angaben schicken:** verantwortliche Person oder Verein (z. B. Friedens- und Zukunftswerkstatt e. V.), Anschrift, E-Mail. Für eine öffentliche deutsche Seite ist das Pflicht. Ich baue dann Impressum und Datenschutzerklärung.
- [ ] **Bildrechte entscheiden:**
  - Sind die eigenen Archivbilder von visualbases.org freigegeben?
  - Sollen Bilder Dritter bis zur Klärung ausgeblendet werden? Betroffen sind das Flickr-Foto von Menwith Hill, „Marcha a Rota“, Camp Delta, Oakhanger, Aegis Ashore, die Kampagnen-Logos und die Redner-Porträts.
- [ ] **Automatische Daten-Aktualisierung einschalten:**
  - Unter **Settings → Actions → General → Workflow permissions** „Read and write permissions“ wählen **und** „Allow GitHub Actions to create and approve pull requests“ anhaken.
  - Danach **Actions → „Daten aktualisieren“ → „Run workflow“** starten. Der erste Lauf übernimmt auch die neue Importer-Regel (20 genauere Positionen) und lädt die restlichen Wikimedia-Fotos.
- [ ] **Labels** `hinweis`, `korrektur` und `daten` anlegen (Issues → Labels). Die Formulare und der Daten-Workflow setzen sie.
- [ ] **Branch-Schutz** für `main` (Settings → Branches): Änderungen nur per Pull Request mit grüner CI.
- [ ] **Kontakt-E-Mail bestätigen:** Hinweise „per E-Mail“ gehen derzeit an **info@visualbases.org**. Die Adresse steht zentral in `src/lib/github.ts`.

## 2. Entscheidungen (Roadmap, Abschnitt 6)

- [ ] **PLZ-Index für „Deine Basis“** ins Repository aufnehmen (GeoNames, CC BY 4.0). Empfohlen: Postleitzahlen funktionieren dann auch bei Presseandrang ohne externe Anfrage. Notfalls lässt sich die Ortssuche über `public/config/geocoder.json` abschalten.
- [ ] **Anrisstexte der Presseschau:** eigene Zusammenfassungen oder Zitate?
- [ ] **Eigene Domain** (z. B. `app.visualbases.org`): DNS-Eintrag (CNAME auf `acephali92.github.io`) setzen und unter Settings → Pages die „Custom domain“ eintragen. Danach passe ich `SITE_URL` an (Vorschaubilder, Sitemap).
- [ ] **Datenreleases mit DOI** (GitHub Release → Zenodo), damit Forschende eine feste Datenversion zitieren können.
- [ ] **Darmstadt Training Center:** Falls jemand die Lage kennt (geschlossen 2008), bitte mit Quelle melden.

## 3. Nach dem Launch: Reichweite

- [ ] **Partner informieren**, dass es eine einbettbare Karte gibt (Atlas → „Einbetten“): Stopp Ramstein, World BEYOND War, CND, No to NATO …
- [ ] **Newsletter / Messenger-Kanal** (optional): Wenn es einen Signal-, Telegram- oder Mastodon-Kanal oder einen Newsletter gibt bzw. geben soll, nenn mir die Links. Ich binde sie auf „Mitmachen“ und im Fußbereich ein.

## Erledigt

- [x] Seite online unter https://acephali92.github.io/VisualBases/ (GitHub Pages über GitHub Actions)
- [x] Datenlizenz CC BY 4.0 (`data/LICENSE.md`)
- [x] Puerto Castilla und Karlovac korrigiert (Ortsmitte, „ungefähr“); Libreville (Gabun), Ouagadougou (Flughafen) und weitere Positionen nach Recherche korrigiert
- [x] Google-Earth-Bilder: nicht-kommerzielle Nutzung mit Namensnennung, Kennzeichnung bleibt erhalten
