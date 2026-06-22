import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'
import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageOrientation,
  Paragraph,
  TextRun,
} from 'docx'

const ordner = path.dirname(fileURLToPath(import.meta.url))
const screenshotOrdner = path.join(ordner, 'screenshots')

const useCases = [
  {
    titel: '1. Anmelden',
    bild: '01-login.png',
    beschreibung:
      'Der Benutzer meldet sich über E-Mail und Passwort an. Geschützte Seiten wie Dashboard und Einstellungen werden erst danach freigeschaltet.',
    umsetzung: 'Frontend: src/views/LoginView.vue, src/auth.ts und src/router/index.ts',
  },
  {
    titel: '2. Dashboard und Lagerkennzahlen',
    bild: '02-dashboard.png',
    beschreibung:
      'Das Dashboard zeigt Artikelanzahl, Gesamtbestand, Lagerplätze, niedrige Bestände, kritische Artikel und das Aktivitätsprotokoll.',
    umsetzung: 'Frontend: src/views/DashboardView.vue und src/components/KleidungsListe.vue',
  },
  {
    titel: '3. Kleidungsstück erstellen und Eingaben validieren',
    bild: '03-erstellen-validierung.png',
    beschreibung:
      'Über die Eingabemaske wird ein neues Kleidungsstück gespeichert. Ungültige oder leere Pflichtfelder werden direkt am Feld markiert. Das Backend prüft dieselben Regeln erneut.',
    umsetzung:
      'Frontend: KleidungsListe.vue und formularValidierung.ts; Backend: Kleidungsstuecke.java, ApiExceptionHandler.java und KleidungController.java',
  },
  {
    titel: '4. Barcode scannen und Produkt finden',
    bild: '04-barcode-scanner.png',
    beschreibung:
      'Ein Barcode kann über die Kamera oder als manuelle Eingabe übernommen werden. Bei der Produktsuche wird eine exakte Artikelnummer gesucht und bei einem Treffer die Detailseite geöffnet.',
    umsetzung:
      'Frontend: BarcodeScanner.vue und barcode.ts; Backend: GET /api/kleidung/artikelnummer/{artikelnummer}',
  },
  {
    titel: '5. Live-Bestand und Kompaktansicht',
    bild: '05-livebestand-kompakt.png',
    beschreibung:
      'Gespeicherte Kleidungsstücke werden aus der REST-Schnittstelle geladen. Die Kompaktansicht stellt viele Artikel übersichtlich dar und richtet die Bestandszahlen einheitlich aus.',
    umsetzung: 'Frontend: KleidungsListe.vue; Backend: GET /api/kleidung',
  },
  {
    titel: '6. Details anzeigen, bearbeiten und löschen',
    bild: '06-detail-bearbeiten.png',
    beschreibung:
      'Auf der Detailseite können Stammdaten, Bestand, Lager und Bild bearbeitet werden. Der Löschen-Button entfernt den Artikel erst nach einer Bestätigung.',
    umsetzung:
      'Frontend: KleidungsDetailView.vue; Backend: PUT /api/kleidung/{id}/bestand und DELETE /api/kleidung/{id}',
  },
  {
    titel: '7. Einstellungen verwalten',
    bild: '07-einstellungen.png',
    beschreibung:
      'Profilwerte, Grenze für niedrigen Bestand, Standardsortierung, Kompaktansicht und Dunkelmodus können angepasst werden.',
    umsetzung: 'Frontend: src/views/SettingsView.vue und src/settings.ts',
  },
  {
    titel: '8. Impressum anzeigen',
    bild: '08-impressum.png',
    beschreibung:
      'Das Impressum stellt Name, Matrikelnummer, Hochschul-E-Mail-Adresse und Hochschule dar.',
    umsetzung: 'Frontend: src/views/ImpressumView.vue',
  },
  {
    titel: '9. Suchen, filtern, sortieren und Ansicht wechseln',
    bild: '09-tabellenansicht.png',
    beschreibung:
      'Der Live-Bestand kann nach mehreren Begriffen durchsucht, nach Kategorie, Größe und Lager gefiltert sowie nach Bezeichnung, Bestand, Lager, Kategorie oder Größe sortiert werden.',
    umsetzung: 'Frontend: src/components/KleidungsListe.vue',
  },
]

function pngGroesse(datei) {
  const daten = fs.readFileSync(datei)
  return {
    daten,
    breite: daten.readUInt32BE(16),
    hoehe: daten.readUInt32BE(20),
  }
}

function eingepassteGroesse(breite, hoehe, maxBreite, maxHoehe) {
  const faktor = Math.min(maxBreite / breite, maxHoehe / hoehe, 1)
  return {
    breite: Math.round(breite * faktor),
    hoehe: Math.round(hoehe * faktor),
  }
}

async function erstelleWord() {
  const inhalt = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun('Kleidungslager – Screenshot-Dokumentation')],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Projekt: ', bold: true }),
        new TextRun('Kleidungslager'),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Autor: ', bold: true }),
        new TextRun('Ibrahim Danisman · Matrikelnummer 578949'),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Zweck: ', bold: true }),
        new TextRun('Dokumentation der zentralen Use-Cases mit sichtbarem Umsetzungsnachweis.'),
      ],
    }),
  ]

  for (const useCase of useCases) {
    const bildPfad = path.join(screenshotOrdner, useCase.bild)
    const bild = pngGroesse(bildPfad)
    const groesse = eingepassteGroesse(bild.breite, bild.hoehe, 680, 400)

    inhalt.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: useCase.titel }),
      new Paragraph({ text: useCase.beschreibung }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Umsetzung: ', bold: true }),
          new TextRun(useCase.umsetzung),
        ],
      }),
      new Paragraph({
        spacing: { before: 220 },
        children: [
          new ImageRun({
            data: bild.daten,
            type: 'png',
            transformation: {
              width: groesse.breite,
              height: groesse.hoehe,
            },
          }),
        ],
      }),
    )
  }

  inhalt.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '10. Automatisierte Tests' }),
    new Paragraph({
      text: 'Frontend- und Backend-Tests werden lokal und bei jedem Push beziehungsweise Pull Request automatisch über GitHub Actions ausgeführt.',
    }),
    new Paragraph({ text: 'Frontend: .github/workflows/frontend-tests.yml' }),
    new Paragraph({ text: 'Backend: .github/workflows/backend-tests.yml' }),
    new Paragraph({ text: 'Frontend: 10 Vitest-Tests, TypeScript-Prüfung und Produktions-Build' }),
    new Paragraph({ text: 'Frontend-Integrationstests: GET-Ladevorgang, Formularvalidierung, POST-Erstellung und Barcode-Navigation' }),
    new Paragraph({ text: 'Backend: 7 JUnit-Tests mit Validierung, Controller-Endpunkten und Barcode-Suche' }),
    new Paragraph({ text: 'Backend-Integrationstest: Spring Boot läuft auf einem echten HTTP-Port und verwendet über Testcontainers eine temporäre PostgreSQL-16-Datenbank.' }),
    new Paragraph({ text: 'Geprüfter CRUD-Ablauf: POST erstellen, GET abrufen, Barcode suchen, PUT aktualisieren und DELETE löschen.' }),
    new Paragraph({ text: 'Die Render-Datenbank wird von den Tests nicht verwendet oder verändert.' }),
  )

  const dokument = new Document({
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: inhalt,
    }],
  })

  const ausgabe = path.join(ordner, 'Kleidungslager-Screenshot-Dokumentation.docx')
  fs.writeFileSync(ausgabe, await Packer.toBuffer(dokument))
}

function erstellePdf() {
  const ausgabe = path.join(ordner, 'Kleidungslager-Screenshot-Dokumentation.pdf')
  const dokument = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 })
  dokument.pipe(fs.createWriteStream(ausgabe))

  dokument.font('Helvetica-Bold').fontSize(25).fillColor('#10231d')
    .text('Kleidungslager – Screenshot-Dokumentation')
  dokument.moveDown(1)
  dokument.font('Helvetica').fontSize(13).fillColor('#334e46')
    .text('Projekt: Kleidungslager')
    .text('Autor: Ibrahim Danisman · Matrikelnummer 578949')
    .text('Dokumentation der zentralen Use-Cases mit sichtbarem Umsetzungsnachweis.')

  for (const useCase of useCases) {
    dokument.addPage()
    dokument.font('Helvetica-Bold').fontSize(20).fillColor('#10231d')
      .text(useCase.titel)
    dokument.moveDown(0.4)
    dokument.font('Helvetica').fontSize(10.5).fillColor('#334e46')
      .text(useCase.beschreibung, { width: 750 })
    dokument.moveDown(0.25)
    dokument.font('Helvetica-Bold').text('Umsetzung:', { continued: true })
    dokument.font('Helvetica').text(' ' + useCase.umsetzung)
    dokument.moveDown(0.7)
    dokument.image(path.join(screenshotOrdner, useCase.bild), dokument.x, dokument.y, {
      fit: [760, 400],
      align: 'center',
      valign: 'center',
    })
  }

  dokument.addPage()
  dokument.font('Helvetica-Bold').fontSize(20).fillColor('#10231d')
    .text('10. Automatisierte Tests')
  dokument.moveDown(0.5)
  dokument.font('Helvetica').fontSize(11).fillColor('#334e46')
    .text('Frontend- und Backend-Tests laufen lokal sowie bei Push und Pull Request automatisch über GitHub Actions.')
    .moveDown(0.4)
    .text('Frontend: .github/workflows/frontend-tests.yml')
    .text('Backend: .github/workflows/backend-tests.yml')
    .moveDown(0.3)
    .text('Frontend: 10 Vitest-Tests, TypeScript-Prüfung und Produktions-Build')
    .text('Integration: GET-Ladevorgang, Formularvalidierung, POST-Erstellung und Barcode-Navigation')
    .moveDown(0.3)
    .text('Backend: 7 JUnit-Tests mit Validierung, Controller-Endpunkten und Barcode-Suche')
    .text('Integration: Spring Boot mit echtem HTTP-Port und temporärer PostgreSQL-16-Datenbank über Testcontainers')
    .text('CRUD: POST erstellen, GET abrufen, Barcode suchen, PUT aktualisieren und DELETE löschen')
    .moveDown(0.3)
    .text('Die Render-Datenbank wird von den Tests nicht verwendet oder verändert.')

  dokument.end()
}

await erstelleWord()
erstellePdf()
