# Aufgaben für dich (Projekt-Inhaber)

Diese Punkte kann ich (Claude) nicht selbst erledigen, weil sie Rechte im GitHub-Konto, Entscheidungen oder Kontakte erfordern. Sortiert nach Dringlichkeit.

## 1. Sofort: damit die Seite online geht

- [ ] **Pull Request zusammenführen:** [Acephali92/VisualBases#1](https://github.com/Acephali92/VisualBases/pull/1) öffnen, kurz durchsehen und auf **„Merge pull request“** klicken.
  (Mir fehlt die Berechtigung, ohne Review auf `main` zu mergen.)
- [ ] **GitHub Pages auf „GitHub Actions“ stellen:** Repository → **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
  Im Moment steht die Quelle vermutlich auf „Deploy from a branch“. Dann würde nur die README angezeigt, nicht die App.
- [ ] Nach dem Merge unter **Actions** prüfen, dass „CI & Deploy“ grün durchläuft. Die Seite ist danach unter
  **https://acephali92.github.io/VisualBases/** erreichbar.

## 2. Bald: Inhalte und Rechte

- [ ] **Datenlizenz festlegen** (mit Karl-Heinz Peil): Unter welcher Lizenz dürfen andere die Daten nutzen? Vorschlag: **CC BY 4.0** (Namensnennung „VisualBases“).
  Danach ersetze ich den Hinweis „Lizenz noch abzustimmen“ in README und „Über & Daten“.
- [ ] **Bildrechte der eigenen Fotos bestätigen:** Die Protestfotos stammen aus dem Archiv von visualbases.org. Bei Fotos Dritter (z. B. Kampagnen, Flickr-Bild von Menwith Hill, „Marcha a Rota“) bitte mit Karl-Heinz Peil klären, ob Urheber genannt werden sollen. Ich trage sie dann ein (`data/media.json` → `credit`).
- [ ] **Google-Earth-Bilder:** Google erlaubt die nicht-kommerzielle Nutzung mit Namensnennung. Die Bilder müssen die eingebaute Google-Kennzeichnung behalten; das tun sie. Nichts weiter zu tun, solange das Projekt nicht kommerziell wird.
- [ ] **Impressum / Verantwortliche Stelle:** Für eine öffentliche deutsche Seite ist ein Impressum Pflicht. Bitte Name und Adresse der verantwortlichen Person oder des Vereins nennen (z. B. Friedens- und Zukunftswerkstatt e. V.). Ich baue dann eine Impressum-Seite.

## 3. Optional: Reichweite

- [ ] **Eigene Domain** (z. B. `visualbases.org` auf die neue App umstellen oder `app.visualbases.org`): DNS-Eintrag (CNAME auf `acephali92.github.io`) setzen und unter Settings → Pages die „Custom domain“ eintragen. Danach passe ich `SITE_URL` an (für Vorschaubilder und Sitemap).
- [ ] **Partner informieren**, dass es eine einbettbare Karte gibt (Atlas → „Einbetten“): Stopp Ramstein, World BEYOND War, CND, No to NATO …
- [ ] **Labels im Repo anlegen**: `hinweis`, `korrektur` (werden von den Issue-Formularen gesetzt).
- [ ] **Branch-Schutz** für `main` aktivieren (Settings → Branches), damit Änderungen immer über Pull Requests mit grüner CI laufen.


## 4. Automatische Daten-Aktualisierung einschalten

- [ ] **Settings → Actions → General → Workflow permissions:** „Read and write permissions“ wählen **und** „Allow GitHub Actions to create and approve pull requests“ anhaken.
  Danach erstellt der Workflow **„Daten aktualisieren“** jeden Montag automatisch einen Pull Request mit neuen Standorten, Presseschau und Fotos.
- [ ] Einmal manuell starten: **Actions → „Daten aktualisieren“ → „Run workflow“.** Dabei werden auch die restlichen Wikimedia-Fotos geladen (aus meiner Cloud-Umgebung wurde der Download von Wikimedia gedrosselt).
- [ ] Label **`daten`** im Repo anlegen (optional; der Workflow setzt es an den Pull Request).

## 5. Kontakt und Kanäle

- [ ] **E-Mail-Adresse bestätigen:** Hinweise „per E-Mail“ gehen an **info@visualbases.org** (laut Impressum der Originalseite). Falls eine andere Adresse gewünscht ist, sag Bescheid. Sie steht zentral in `src/lib/github.ts`.
- [ ] **Newsletter / Messenger-Kanal** (optional): Wenn es einen Signal-, Telegram- oder Mastodon-Kanal oder einen Newsletter gibt bzw. geben soll, nenn mir die Links. Ich binde sie auf „Mitmachen“ und im Fußbereich ein.
