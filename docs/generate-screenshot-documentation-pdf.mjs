import { chromium } from 'playwright'
import { marked } from 'marked'
import {
  PDFDocument,
  rgb,
  StandardFonts,
} from 'pdf-lib'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ensureHtwLogoAsset } from './htw-logo.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const docsDir = __dirname
const markdownPath = path.join(
  docsDir,
  'Kleidungslager-Screenshot-Dokumentation.md'
)
const screenshotsDir = path.join(docsDir, 'screenshots')
const deckblattPath = path.join(
  docsDir,
  'assets',
  'Deckblatt_AA_Deutsch_01.pdf'
)
const htwLogoPath = path.join(
  docsDir,
  'assets',
  'pdf-image-87.jpg'
)
const outputPath = path.join(
  docsDir,
  'Kleidungslager-Screenshot-Dokumentation.pdf'
)

const deckblattDaten = {
  titel: 'Kleidungslager – Screenshot-Dokumentation',
  artDerArbeit: 'Screenshot-Dokumentation',
  projekt: 'Kleidungslager',
  vorgelegtVon: 'Ibrahim Danisman',
  matrikelnummer: '578949',
  studiengang: 'Wirtschaftsinformatik',
  hochschule: 'HTW Berlin',
  datum: new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date()),
}

function sanitizeText(value) {
  return String(value)
    .replace(/[\uFFFE\uFEFF\u00AD\u200B\u2060]/g, '')
    .replaceAll('REST-Endpunkte', 'REST-Endpunkte')
    .replaceAll('CSV-Export', 'CSV-Export')
    .replaceAll('E-Mail-Feld', 'E-Mail-Feld')
    .replaceAll('Lager-Filter', 'Lager-Filter')
}

async function assertExists(filePath, label) {
  try {
    await fs.access(filePath)
  } catch {
    throw new Error(`${label} wurde nicht gefunden: ${filePath}`)
  }
}

function extractContentMarkdown(markdown) {
  const cleanMarkdown = sanitizeText(markdown)
  const startMarker = '## Kurze Projektbeschreibung'
  const markerIndex = cleanMarkdown.indexOf(startMarker)

  if (markerIndex === -1) {
    return cleanMarkdown
  }

  return cleanMarkdown.slice(markerIndex)
}

async function validateScreenshotReferences(markdown) {
  const imageMatches = [...markdown.matchAll(/!\[[^\]]*]\((screenshots\/[^)]+)\)/g)]

  for (const match of imageMatches) {
    const relativeImagePath = match[1].replaceAll('/', path.sep)
    await assertExists(
      path.join(docsDir, relativeImagePath),
      `Screenshot ${match[1]}`
    )
  }
}

function markdownToStyledHtml(markdown) {
  const htmlBody = marked.parse(markdown).replace(
    /(<h2 id="use-case-(\d+)[\s\S]*?)(?=<h2 id="use-case-\d+|<h2 id="kurzes-fazit"|$)/g,
    (_match, section, number) =>
      `<section class="use-case use-case-${number}">${section}</section>`
  )
  const docsUrl = pathToFileURL(docsDir + path.sep).href

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <base href="${docsUrl}">
  <title>Kleidungslager – Screenshot-Dokumentation</title>
  <style>
    @page {
      size: A4;
      margin: 11mm 11mm 14mm;
    }

    :root {
      --htw-green: #007a64;
      --ink: #18231f;
      --muted: #65746f;
      --line: #d8e2df;
      --soft: #f4f8f6;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--ink);
      background: #ffffff;
      font-family: Helvetica, Arial, sans-serif;
      font-size: 9.2pt;
      line-height: 1.32;
    }

    h2 {
      margin: 0 0 4.5mm;
      padding-bottom: 2.2mm;
      border-bottom: 1.4pt solid var(--htw-green);
      color: var(--ink);
      font-size: 18pt;
      line-height: 1.15;
      break-after: avoid;
      page-break-after: avoid;
    }

    h3 {
      margin: 5mm 0 2mm;
      color: var(--htw-green);
      font-size: 10.5pt;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      break-after: avoid;
    }

    p {
      margin: 0 0 2.7mm;
    }

    strong {
      color: var(--ink);
    }

    ul {
      margin: 1mm 0 4mm 5mm;
      padding: 0;
    }

    li {
      margin: 0 0 1.1mm;
    }

    table {
      width: 100%;
      margin: 2mm 0 5mm;
      border-collapse: collapse;
      font-size: 9.5pt;
    }

    th,
    td {
      padding: 2.2mm 2.6mm;
      border: 0.7pt solid var(--line);
      vertical-align: top;
    }

    th {
      color: #ffffff;
      background: var(--htw-green);
      font-weight: 700;
    }

    img {
      display: block;
      width: 100%;
      max-height: 136mm;
      margin: 1.8mm auto 3mm;
      object-fit: contain;
      border: 0.7pt solid var(--line);
      border-radius: 2mm;
      background: #ffffff;
      box-shadow: 0 2mm 8mm rgba(24, 35, 31, 0.08);
      page-break-inside: avoid;
    }

    img[src*="usecase-03"],
    img[src*="usecase-04"] {
      width: auto;
      max-width: 66%;
      max-height: 126mm;
    }

    img[src*="usecase-08"] {
      width: auto;
      max-width: 74%;
      max-height: 138mm;
    }

    img[src*="usecase-05"],
    img[src*="usecase-06"],
    img[src*="usecase-07"] {
      max-height: 132mm;
    }

    img[src*="usecase-10"] {
      max-height: 142mm;
    }

    code {
      padding: 0.2mm 0.8mm;
      border-radius: 1mm;
      background: var(--soft);
      color: #163a32;
      font-family: Consolas, 'Courier New', monospace;
      font-size: 9.2pt;
    }

    hr {
      margin: 8mm 0;
      border: 0;
      border-top: 0.8pt solid var(--line);
    }

    blockquote {
      margin: 0 0 5mm;
      padding: 3mm 4mm;
      border-left: 3pt solid var(--htw-green);
      background: var(--soft);
      color: var(--muted);
    }

    .use-case {
      break-before: page;
      page-break-before: always;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .use-case h2 {
      margin-bottom: 3.2mm;
    }

    .use-case p {
      margin-bottom: 2mm;
    }

    .use-case ul {
      margin-bottom: 2.4mm;
    }

    .use-case li {
      font-size: 8.9pt;
      line-height: 1.24;
    }

    h2[id^="use-case"] {
      break-before: auto;
      page-break-before: auto;
      break-after: avoid;
      page-break-after: avoid;
    }

    h2[id="kurze-projektbeschreibung"] {
      break-before: auto;
    }

    h2[id="kurzes-fazit"] {
      break-before: page;
    }

    p:has(img) {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    p:has(img) strong {
      display: block;
      margin-bottom: 1.5mm;
    }

    h2 + p,
    p:has(+ p img),
    p:has(+ p strong) {
      break-after: avoid;
      page-break-after: avoid;
    }

    a {
      color: var(--htw-green);
      text-decoration: none;
    }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`
}

async function createContentPdf(html) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'kleidungslager-docs-')
  )
  const htmlPath = path.join(tempDir, 'content.html')
  const pdfPath = path.join(tempDir, 'content.pdf')

  await fs.writeFile(htmlPath, html, 'utf8')

  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()
    await page.goto(pathToFileURL(htmlPath).href, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('load')
    await page.evaluate(async () => {
      const images = Array.from(document.images)
      await Promise.all(
        images.map((image) => {
          if (image.complete) {
            return Promise.resolve()
          }

          return new Promise((resolve, reject) => {
            image.addEventListener('load', resolve, { once: true })
            image.addEventListener('error', reject, { once: true })
          })
        })
      )
    })

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    })
  } finally {
    await browser.close()
  }

  return {
    pdfBytes: await fs.readFile(pdfPath),
    cleanup: () =>
      fs.rm(tempDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      }),
  }
}

function drawLabelValue(page, fonts, label, value, x, y) {
  page.drawText(label, {
    x,
    y,
    size: 9.5,
    font: fonts.bold,
    color: rgb(0.05, 0.05, 0.05),
  })

  page.drawText(value, {
    x,
    y: y - 17,
    size: 12,
    font: fonts.regular,
    color: rgb(0.06, 0.06, 0.06),
  })
}

async function createFinalPdf(contentPdfBytes) {
  await ensureHtwLogoAsset(deckblattPath, htwLogoPath)
  const logoBytes = await fs.readFile(htwLogoPath)
  const contentDoc = await PDFDocument.load(contentPdfBytes)
  const finalDoc = await PDFDocument.create()

  const regular = await finalDoc.embedFont(StandardFonts.Helvetica)
  const bold = await finalDoc.embedFont(StandardFonts.HelveticaBold)
  const fonts = { regular, bold }
  const logo = await finalDoc.embedJpg(logoBytes)

  const coverPage = finalDoc.addPage([595.32, 841.92])
  const width = coverPage.getWidth()
  const height = coverPage.getHeight()
  const logoWidth = 218
  const logoHeight = logoWidth * (logo.height / logo.width)

  coverPage.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(1, 1, 1),
  })
  coverPage.drawImage(logo, {
    x: 54,
    y: 690,
    width: logoWidth,
    height: logoHeight,
  })
  coverPage.drawText(deckblattDaten.titel, {
    x: 58,
    y: 604,
    size: 24,
    font: bold,
    color: rgb(0.05, 0.05, 0.05),
    maxWidth: width - 116,
    lineHeight: 30,
  })

  coverPage.drawLine({
    start: { x: 58, y: 566 },
    end: { x: width - 58, y: 566 },
    thickness: 1.2,
    color: rgb(0, 0.48, 0.39),
  })

  drawLabelValue(
    coverPage,
    fonts,
    'Art der Arbeit',
    deckblattDaten.artDerArbeit,
    58,
    520
  )
  drawLabelValue(
    coverPage,
    fonts,
    'Projekt',
    deckblattDaten.projekt,
    312,
    520
  )
  drawLabelValue(
    coverPage,
    fonts,
    'Vorgelegt von',
    deckblattDaten.vorgelegtVon,
    58,
    458
  )
  drawLabelValue(
    coverPage,
    fonts,
    'Matrikelnummer',
    deckblattDaten.matrikelnummer,
    312,
    458
  )
  drawLabelValue(
    coverPage,
    fonts,
    'Studiengang',
    deckblattDaten.studiengang,
    58,
    396
  )
  drawLabelValue(
    coverPage,
    fonts,
    'Hochschule',
    deckblattDaten.hochschule,
    312,
    396
  )
  drawLabelValue(
    coverPage,
    fonts,
    'Datum',
    deckblattDaten.datum,
    58,
    334
  )

  const contentPages = await finalDoc.copyPages(
    contentDoc,
    contentDoc.getPageIndices()
  )

  for (const [index, page] of contentPages.entries()) {
    const pageNumber = index + 2
    const footer = `Kleidungslager – Screenshot-Dokumentation | Seite ${pageNumber}`
    const footerSize = 8
    const footerWidth = regular.widthOfTextAtSize(footer, footerSize)
    page.drawText(footer, {
      x: page.getWidth() - footerWidth - 34,
      y: 18,
      size: footerSize,
      font: regular,
      color: rgb(0.42, 0.48, 0.46),
    })
    finalDoc.addPage(page)
  }

  await fs.writeFile(outputPath, await finalDoc.save())
}

async function main() {
  await assertExists(markdownPath, 'Markdown-Datei')
  await assertExists(screenshotsDir, 'Screenshot-Ordner')
  await assertExists(deckblattPath, 'HTW-Deckblattvorlage')

  const markdown = await fs.readFile(markdownPath, 'utf8')
  const contentMarkdown = extractContentMarkdown(markdown)
  await validateScreenshotReferences(contentMarkdown)

  const html = markdownToStyledHtml(contentMarkdown)
  const contentPdf = await createContentPdf(html)

  try {
    await createFinalPdf(contentPdf.pdfBytes)
  } finally {
    await contentPdf.cleanup()
  }

  console.log(`PDF erstellt: ${outputPath}`)
  console.log(`HTW-Logo aus Deckblattvorlage extrahiert: ${deckblattPath}`)
}

main().catch((error) => {
  console.error('PDF-Erstellung fehlgeschlagen:')
  console.error(error)
  process.exitCode = 1
})
