# Ortssuche („Deine Basis“) und Nominatim

Die Funktion **Deine Basis** (`#/near`) wandelt eine Eingabe (Ort, Postleitzahl) in Koordinaten um und berechnet daraus die Luftlinienentfernung zu den nächsten ausländischen Militärstandorten. Für die Ortssuche nutzt die App die öffentliche Instanz von **OpenStreetMap Nominatim**. Die Entfernungen werden im Browser berechnet. Den Gerätestandort sendet die App nie an einen Dienst.

Code: `src/lib/geocode.ts` (Ortssuche), `src/lib/proximity.ts` (Klassifikation und Rangliste), `src/lib/geo.ts` (Großkreisentfernung), `src/routes/Near.svelte` (Darstellung). Laufzeit-Schalter: `public/config/geocoder.json`.

## 1. So funktioniert die Ortssuche

1. **Eingabe zerlegen** (`parseQuery`): Postleitzahl (Formate u. a. DE/AT/CH/FR/IT/US/PL/PT/JP/BR/SE/CZ, GB, CA, NL, IE, MT) und Länderhinweis (`DE-56068`, `D-56068`, `56068 DE`, `56068, Deutschland`, `75008 France`, `Koblenz, Schweiz`). Ein Ländername ohne Komma zählt nur neben einer Postleitzahl, damit z. B. „Atlanta Georgia“ nicht als Land Georgien gelesen wird. Außerdem gibt es ein optionales Länder-Auswahlfeld.
2. **Anfrage**: Eine reine Postleitzahl wird als strukturierte Suche gesendet (`postalcode=…`), alles andere als Freitext (`q=…`). Ist ein Land bekannt, kommt `countrycodes=` dazu. Immer gesetzt sind `addressdetails=1` und `limit=10`.
3. **Ergebnisse prüfen** (`normalizeResults`): Treffer mit fehlenden oder ungültigen Koordinaten werden verworfen und gezählt. Jeder Treffer bekommt Ort, Region, Land (ISO), PLZ und eine **Genauigkeitsstufe**: Adresse, PLZ-Gebiet, Ort, Region oder Land.
4. **Entscheiden** (`decide`), ohne den ersten Treffer ungeprüft zu übernehmen:
   - kein Treffer → „nicht gefunden“ (mit Tipps);
   - nur Treffer auf Landesebene → „zu ungenau“, es wird keine Entfernung berechnet;
   - eine Postleitzahl an mehreren Orten (z. B. `56068`: Koblenz **und** Minnesota Lake, USA) → **Auswahlliste**. Nominatim bewertet beide Treffer gleich (Importance 0,12), eine automatische Wahl wäre geraten;
   - Freitext mit mehreren Orten → Auswahlliste, außer ein Treffer führt klar (Importance-Abstand ≥ 0,15). Die übrigen Treffer bleiben dann über „Nicht der richtige Ort?“ wählbar. Beispiel „Koblenz“: Koblenz (DE) wird genommen, Koblenz (CH) wird als Alternative angeboten. Bei „Frankfurt“ (Main/Oder) muss gewählt werden;
   - ein Treffer auf Regionsebene wird verwendet, aber deutlich als grob markiert.
5. **Transparenz**: Vor den Ergebnissen zeigt die App die verwendete Position: Ort, Region, Land, PLZ und Genauigkeit. In der Detailansicht stehen außerdem die Koordinaten, das OSM-Objekt und der vollständige Nominatim-Name.
6. **Fehler** werden unterschieden: Netzwerk, Zeitüberschreitung (10 s), Ratenbegrenzung (HTTP 429/503), Zugriff verweigert (403), Dienstfehler, unbrauchbare Antwort und abgeschaltete Suche. Nach einem Fehler bleibt kein altes Ergebnis stehen.

## 2. Nutzungsbedingungen der öffentlichen Instanz

Geprüft am 2026-11-07: <https://operations.osmfoundation.org/policies/nominatim/>

| Regel der Policy | Umsetzung in VisualBases |
|---|---|
| **Höchstens 1 Anfrage pro Sekunde, und zwar pro Anwendung**: „the sum of traffic by all your users should not exceed the limits“ | Pro Browser wird höchstens etwa alle 1,1 s gefragt. **Das ist keine globale Begrenzung**, siehe Abschnitt 3. |
| Von Nutzern ausgelöste Suchen sind erlaubt, „provided that your number of users is moderate“ | Gefragt wird nur beim Absenden des Formulars, nie beim Tippen. |
| Ergebnisse **müssen zwischengespeichert** werden; wer dieselbe Anfrage wiederholt, kann gesperrt werden | Antworten liegen im Speicher und in `sessionStorage` (je URL). Fehler werden nicht gespeichert. Eine laufende Anfrage wird bei einer neuen Suche abgebrochen. |
| Kein Autocomplete bzw. keine Suche beim Tippen | nicht umgesetzt (gewollt) |
| Anwendung erkennbar machen (HTTP Referer oder User-Agent) | Browser dürfen keinen User-Agent setzen. Der Referer (Origin `acephali92.github.io`) wird mit der Standard-Referrer-Policy gesendet. Die App setzt nirgends `no-referrer`. |
| Attribution | „Ortsdaten © OpenStreetMap-Mitwirkende (ODbL)“ unter dem Suchfeld |
| Der Dienst muss sich jederzeit auf Anfrage umstellen lassen, „without requiring a software update“ | Die Datei `public/config/geocoder.json` (`enabled`, `endpoint`) wird zur Laufzeit geladen und vom Service Worker nicht vorab gespeichert (NetworkFirst). Mit `"enabled": false` ist die Ortssuche aus, der Gerätestandort funktioniert weiter. Mit `endpoint` lässt sich eine andere Nominatim-kompatible Instanz eintragen (nur https). Dafür muss nur diese eine Datei geändert werden, kein Code. |
| Zugang kann ohne Vorwarnung entzogen werden | Die App meldet dann „vorübergehend nicht erreichbar“ und bietet den Gerätestandort an. |

## 3. Was sich ohne Backend nicht garantieren lässt

- **Globale Rate:** Jeder Browser drosselt nur sich selbst. Suchen 100 Menschen gleichzeitig (Medienbericht, Schulklasse, geteilter Link), gehen bis zu 100 Anfragen pro Sekunde an Nominatim. Das verletzt die Policy, und die OSMF kann die Anwendung (am Referer erkennbar) sperren. Der Cache hilft nur bei Wiederholungen im selben Tab.
- **„Moderate“ Nutzerzahl** ist nicht genau festgelegt. Bei wachsender Reichweite sollte die Abhängigkeit früh abgelöst werden.
- **Verfügbarkeit und Qualität** der Antworten liegen bei Nominatim. Für Postleitzahlen liefert Nominatim einen Mittelpunkt oder einen repräsentativen Punkt, nicht die Fläche.

## 4. Langfristige Alternativen (Entscheidung beim Projektinhaber)

| Option | Vorteile | Nachteile |
|---|---|---|
| **a) Statischer PLZ-Index im Repo** (z. B. GeoNames-Postleitzahlen, CC BY 4.0) für DE/AT/CH, als JSON neben `bases.json` | Für die häufigste Eingabe (deutsche PLZ) gibt es dann gar keine externe Anfrage mehr: deterministisch, offline-fähig, kein Ratenproblem; einige hundert KB, nur bei Bedarf geladen | Pflege bei PLZ-Änderungen; weitere Länder bräuchten weitere Dateien; Ortsnamen gehen weiter an Nominatim |
| **b) Caching-Proxy** (z. B. Cloudflare Worker mit KV-Cache und globaler Drosselung) | erfüllt die Policy wirklich (eine Quelle, gemeinsamer Cache, echter User-Agent) | ein kleines Backend, das betrieben werden muss |
| **c) Kommerzieller OSM-basierter Anbieter** (siehe [Nominatim-Wiki, Alternatives](https://wiki.openstreetmap.org/wiki/Nominatim#Alternatives_.2F_Third-party_providers)) | hohe Kontingente, SLA | Kosten; API-Schlüssel im Frontend ist öffentlich (Domainbindung nötig) |
| **d) Eigene Nominatim-Instanz** | volle Kontrolle | Server mit viel Speicher, Betriebsaufwand |

**Empfehlung:** (a) als nächster Schritt. Damit ist die Postleitzahlsuche für den deutschsprachigen Raum unabhängig, und Nominatim bleibt für Ortsnamen und andere Länder (über `endpoint` umschaltbar). (b) kommt in Frage, sobald die Reichweite deutlich steigt.

## 5. Tests

`src/lib/geocode.test.ts` arbeitet nur mit aufgezeichneten Antworten (`src/lib/fixtures/nominatim/*.json`, einmalig am 2026-11-07 mit 10 gedrosselten Anfragen aufgezeichnet). Der Browser-Smoke-Test (`tests/smoke.cjs`) beantwortet Nominatim-Anfragen über `page.route` aus denselben Dateien. Kein Test fragt den Live-Dienst ab.
