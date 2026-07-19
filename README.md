# Kleidungslager Frontend

Webanwendung zur Verwaltung eines Kleidungslagers. Das Frontend wurde mit Vue 3, TypeScript und Vite umgesetzt und bindet ein Backend über REST-Endpunkte an.

## Student

Ibrahim Danisman<br>
Matrikelnummer: 578949

## Projektüberblick

Das Kleidungslager dient dazu, Kleidungsstücke in einem Lagerbestand übersichtlich zu erfassen, zu verwalten und auszuwerten. Nach einer Demo-Anmeldung gelangt der Benutzer in ein geschütztes Dashboard, in dem neue Artikel angelegt, vorhandene Artikel gesucht, gefiltert, sortiert, bearbeitet und gelöscht werden können.

Die Anwendung arbeitet mit Live-Daten aus dem Backend. Die API-Basis-URL wird über `VITE_API_BASE_URL` konfiguriert und ist in der Entwicklungsumgebung auf `http://localhost:8080` gesetzt.

## Features

- **Startseite:** kurze Projektvorstellung mit Einstieg zum Login und Dashboard.
- **Demo-Login:** geschützter Dashboard-Bereich mit lokal gespeichertem Login-Status.
- **Dashboard:** zentrale Lagerübersicht mit Kennzahlen zu Artikeln, Gesamtbestand, Lagerplätzen und niedrigen Beständen.
- **Bestandswarnungen:** Artikel mit niedrigem Bestand werden anhand eines einstellbaren Schwellenwerts hervorgehoben.
- **Kleidungsstücke erstellen:** neue Artikel können mit Artikelnummer/Barcode, Bezeichnung, Größe, Kategorie, Farbe, Lager, Bestand und Bild gespeichert werden.
- **Formularvalidierung:** Pflichtfelder, maximale Zeichenlängen und gültige Zahlenwerte werden vor dem Speichern geprüft.
- **Live-Bestand anzeigen:** gespeicherte Kleidungsstücke werden aus dem Backend geladen und im Dashboard dargestellt.
- **Suche, Filter und Sortierung:** Bestand kann nach Suchbegriffen, Kategorie, Größe, Lager und Sortierung eingegrenzt werden.
- **Ansichtswechsel:** Kartenansicht, Tabellenansicht und Kompaktansicht für unterschiedliche Arbeitsweisen.
- **Bestand und Lager bearbeiten:** Bestand und Lagerplatz können direkt in der Liste angepasst und gespeichert werden.
- **Detailseite:** jedes Kleidungsstück besitzt eine eigene Detailansicht mit Bild, Stammdaten und Aktionen.
- **Bearbeitungsmodus:** Artikelnummer, Bezeichnung, Größe, Kategorie, Farbe, Lager, Bestand und Bild können auf der Detailseite bearbeitet werden.
- **Löschen:** Kleidungsstücke können aus dem Bestand entfernt werden.
- **Barcode-Scanner:** Barcode kann per Kamera gescannt oder manuell eingegeben werden. Barcodes können in das Formular übernommen oder zur Suche genutzt werden.
- **CSV-Export:** der aktuelle Lagerbestand kann als CSV-Datei exportiert werden.
- **Aktivitätsprotokoll:** Änderungen wie Erstellen, Löschen, Bestandsänderungen, Lagerwechsel und Bildänderungen werden lokal im Browser protokolliert.
- **Einstellungen:** Profilwerte, niedriger-Bestand-Schwelle, Standardsortierung, API-Hinweis, Kompaktansicht und Dunkelmodus können angepasst werden.
- **Dunkelmodus:** optionale dunkle Darstellung für die Anwendung.
- **Impressum:** eigene Impressumsseite mit Studentendaten und Hochschulangabe.

## Wichtige Seiten

- `/` - Startseite
- `/login` - Demo-Anmeldung
- `/dashboard` - geschützte Lagerverwaltung
- `/kleidung/:id` - Detailseite eines Kleidungsstücks
- `/einstellungen` - Einstellungen
- `/impressum` - Impressum

## REST-Anbindung

Das Frontend erwartet ein Backend unter der konfigurierten API-Basis-URL. Verwendete Endpunkte sind unter anderem:

- `GET /api/kleidung` - Kleidungsliste laden
- `POST /api/kleidung` - neues Kleidungsstück speichern
- `PUT /api/kleidung/{id}/bestand` - Kleidungsstück aktualisieren
- `DELETE /api/kleidung/{id}` - Kleidungsstück löschen
- `GET /api/kleidung/artikelnummer/{artikelnummer}` - Kleidungsstück per Artikelnummer oder Barcode suchen

## Technologien

- Vue 3
- TypeScript
- Vite
- Vue Router
- Axios
- ZXing Browser für Barcode-Erkennung
- Vitest für Tests
- ESLint, Oxlint und Prettier für Codequalität

## Projekt starten

Abhängigkeiten installieren:

```sh
npm install
```

Entwicklungsserver starten:

```sh
npm run dev
```

Produktionsbuild erstellen:

```sh
npm run build
```

Unit-Tests ausführen:

```sh
npm run test:unit
```

Linting ausführen:

```sh
npm run lint
```

## Dokumentation

Im Ordner `docs/` und `dokumentation/` befinden sich zusätzliche Screenshot-Dokumentationen zum Projekt. Die README liegt im Root-Verzeichnis des Repositorys, damit sie direkt auf GitHub angezeigt wird.
