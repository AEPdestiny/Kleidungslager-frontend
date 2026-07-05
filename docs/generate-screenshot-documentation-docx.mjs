import JSZip from 'jszip'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureHtwLogoAsset } from './htw-logo.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const docsDir = __dirname
const markdownPath = path.join(
  docsDir,
  'Kleidungslager-Screenshot-Dokumentation.md'
)
const outputPath = path.join(
  docsDir,
  'Kleidungslager-Screenshot-Dokumentation.docx'
)
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

const accentColor = '007A64'
const textColor = '18231F'
const mutedColor = '65746F'
const lineColor = 'D8E2DF'
const softFill = 'F4F8F6'

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
  return String(value).replace(/[\uFFFE\uFEFF\u00AD\u200B\u2060]/g, '')
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function cleanInline(text) {
  return sanitizeText(text)
    .replaceAll('**', '')
    .replaceAll('`', '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker)

  if (start === -1) {
    return ''
  }

  const contentStart = start + startMarker.length
  const end = endMarker === '' ? -1 : text.indexOf(endMarker, contentStart)

  if (end === -1) {
    return text.slice(contentStart).trim()
  }

  return text.slice(contentStart, end).trim()
}

function extractBullets(block) {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('* '))
    .map((line) => cleanInline(line.slice(2)))
}

function parseProjectDescription(markdown) {
  return cleanInline(
    extractBetween(markdown, '## Kurze Projektbeschreibung', '## Use-Case-Übersicht')
  )
}

function parseOverview(markdown) {
  const overviewBlock = extractBetween(
    markdown,
    '## Use-Case-Übersicht',
    '---'
  )

  return overviewBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .slice(1)
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cleanInline(cell))
    )
}

function parseUseCases(markdown) {
  const useCases = []
  const regex =
    /## Use-Case (\d+): ([^\n]+)\n\n([\s\S]*?)(?=\n---\n\n## Use-Case|\n---\n\n## Kurzes Fazit|$)/g

  for (const match of markdown.matchAll(regex)) {
    const [, number, title, body] = match
    const screenshotMatch = body.match(/!\[[^\]]*]\((screenshots\/[^)]+)\)/)
    const proofBlock = extractBetween(
      body,
      '**Sichtbarer Nachweis:**',
      '**Umsetzung:**'
    )
    const implementationBlock = body.includes('**Umsetzung:**')
      ? body.split('**Umsetzung:**').at(-1)
      : ''

    useCases.push({
      number,
      title: cleanInline(title),
      goal: cleanInline(extractBetween(body, '**Ziel:**', '**Screenshot:**')),
      screenshot: screenshotMatch?.[1] ?? '',
      proof: extractBullets(proofBlock),
      implementation: extractBullets(implementationBlock),
    })
  }

  return useCases
}

function readImageInfo(buffer) {
  const pngSignature = '89504e470d0a1a0a'

  if (buffer.subarray(0, 8).toString('hex') === pngSignature) {
    return {
      extension: 'png',
      contentType: 'image/png',
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2

    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1
        continue
      }

      const marker = buffer[offset + 1]
      const length = buffer.readUInt16BE(offset + 2)
      const isStartOfFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc

      if (isStartOfFrame) {
        return {
          extension: 'jpg',
          contentType: 'image/jpeg',
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        }
      }

      offset += 2 + length
    }
  }

  throw new Error('Bildformat konnte nicht gelesen werden.')
}

function fitImage(info, maxWidthInches = 6.75, maxHeightInches = 5.75) {
  const emuPerInch = 914400
  const pixelsPerInch = 96
  const maxCx = maxWidthInches * emuPerInch
  const maxCy = maxHeightInches * emuPerInch
  const baseCx = (info.width / pixelsPerInch) * emuPerInch
  const baseCy = (info.height / pixelsPerInch) * emuPerInch
  const scale = Math.min(maxCx / baseCx, maxCy / baseCy, 1)

  return {
    cx: Math.round(baseCx * scale),
    cy: Math.round(baseCy * scale),
  }
}

function run(text, options = {}) {
  const bold = options.bold ? '<w:b/><w:bCs/>' : ''
  const color = `<w:color w:val="${options.color ?? textColor}"/>`
  const size = `<w:sz w:val="${options.size ?? 21}"/><w:szCs w:val="${options.size ?? 21}"/>`
  const font =
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/>'

  return `<w:r><w:rPr>${font}${bold}${color}${size}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
}

function paragraph(children, options = {}) {
  const spacing = `<w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 120}" w:line="260" w:lineRule="auto"/>`
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : ''
  const keepNext = options.keepNext ? '<w:keepNext/>' : ''
  const border = options.borderBottom
    ? `<w:pBdr><w:bottom w:val="single" w:color="${accentColor}" w:sz="8" w:space="2"/></w:pBdr>`
    : ''

  return `<w:p><w:pPr>${keepNext}${spacing}${align}${border}</w:pPr>${children}</w:p>`
}

function heading(text) {
  return paragraph(run(text, { bold: true, size: 34 }), {
    before: 220,
    after: 180,
    keepNext: true,
    borderBottom: true,
  })
}

function sectionLabel(text) {
  return paragraph(run(text, { bold: true, color: accentColor, size: 22 }), {
    before: 150,
    after: 80,
    keepNext: true,
  })
}

function textParagraph(text) {
  return paragraph(run(text), { after: 140 })
}

function bullet(text) {
  return paragraph(run(`• ${text}`), { before: 0, after: 80 })
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
}

function labelValue(label, value) {
  return paragraph(
    run(`${label}: `, { bold: true, size: 22 }) + run(value, { size: 22 }),
    { before: 80, after: 150 }
  )
}

function table(rows) {
  const widths = ['650', '1850', '2500']
  const header = ['Nr.', 'Use-Case', 'Sichtbarer Nachweis']
  const allRows = [header, ...rows]

  const tableRows = allRows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const isHeader = rowIndex === 0
          const shading = isHeader ? `<w:shd w:fill="${accentColor}"/>` : ''
          const cellRun = run(cell, {
            bold: isHeader,
            color: isHeader ? 'FFFFFF' : textColor,
            size: 18,
          })

          return `<w:tc><w:tcPr><w:tcW w:w="${widths[cellIndex]}" w:type="dxa"/>${shading}<w:vAlign w:val="center"/></w:tcPr>${paragraph(cellRun, { after: 0 })}</w:tc>`
        })
        .join('')

      return `<w:tr>${cells}</w:tr>`
    })
    .join('')

  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="${lineColor}"/><w:left w:val="single" w:sz="4" w:color="${lineColor}"/><w:bottom w:val="single" w:sz="4" w:color="${lineColor}"/><w:right w:val="single" w:sz="4" w:color="${lineColor}"/><w:insideH w:val="single" w:sz="4" w:color="${lineColor}"/><w:insideV w:val="single" w:sz="4" w:color="${lineColor}"/></w:tblBorders></w:tblPr>${tableRows}</w:tbl>`
}

function imageDrawing({ relationshipId, name, cx, cy, id }) {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="${escapeXml(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${escapeXml(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
}

async function prepareImages(useCases) {
  const images = []
  const relationshipMap = new Map()

  for (const useCase of useCases) {
    if (useCase.screenshot === '') {
      continue
    }

    const sourcePath = path.join(
      docsDir,
      useCase.screenshot.replaceAll('/', path.sep)
    )
    const data = await fs.readFile(sourcePath)
    const info = readImageInfo(data)
    const relationshipId = `rId${images.length + 1}`
    const fileName = `image${images.length + 1}.${info.extension}`

    const isTallForm =
      useCase.screenshot.includes('usecase-03') ||
      useCase.screenshot.includes('usecase-04')

    relationshipMap.set(useCase.screenshot, {
      relationshipId,
      fileName,
      ...fitImage(info, 6.75, isTallForm ? 4.85 : 5.75),
      displayName: path.basename(useCase.screenshot),
      data,
      contentType: info.contentType,
    })

    images.push(relationshipMap.get(useCase.screenshot))
  }

  return { images, relationshipMap }
}

function coverXml(logoImage) {
  return [
    paragraph(
      imageDrawing({
        relationshipId: logoImage.relationshipId,
        name: logoImage.displayName,
        cx: logoImage.cx,
        cy: logoImage.cy,
        id: 900,
      }),
      { before: 280, after: 560 }
    ),
    paragraph(run(deckblattDaten.titel, { bold: true, size: 42 }), {
      after: 280,
      keepNext: true,
    }),
    labelValue('Art der Arbeit', deckblattDaten.artDerArbeit),
    labelValue('Projekt', deckblattDaten.projekt),
    labelValue('Vorgelegt von', deckblattDaten.vorgelegtVon),
    labelValue('Matrikelnummer', deckblattDaten.matrikelnummer),
    labelValue('Studiengang', deckblattDaten.studiengang),
    labelValue('Hochschule', deckblattDaten.hochschule),
    labelValue('Datum', deckblattDaten.datum),
    pageBreak(),
  ].join('')
}

function useCaseXml(useCase, relationshipMap, imageId) {
  const image = relationshipMap.get(useCase.screenshot)
  const imageXml = image
    ? paragraph(
        imageDrawing({
          relationshipId: image.relationshipId,
          name: image.displayName,
          cx: image.cx,
          cy: image.cy,
          id: imageId,
        }),
        { align: 'center', before: 120, after: 180 }
      )
    : ''

  return [
    pageBreak(),
    heading(`Use-Case ${useCase.number}: ${useCase.title}`),
    sectionLabel('Ziel'),
    textParagraph(useCase.goal),
    sectionLabel('Screenshot'),
    imageXml,
    sectionLabel('Sichtbarer Nachweis'),
    ...useCase.proof.map(bullet),
    sectionLabel('Umsetzung'),
    ...useCase.implementation.map(bullet),
  ].join('')
}

function documentXml(body) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

function documentRelsXml(images) {
  const relationships = images
    .map(
      (image) =>
        `<Relationship Id="${image.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.fileName}"/>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`
}

function coreXml() {
  const now = new Date().toISOString()

  return `<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(deckblattDaten.titel)}</dc:title>
  <dc:creator>${escapeXml(deckblattDaten.vorgelegtVon)}</dc:creator>
  <cp:lastModifiedBy>${escapeXml(deckblattDaten.vorgelegtVon)}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>HTW Berlin</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`
}

async function main() {
  await ensureHtwLogoAsset(deckblattPath, htwLogoPath)

  const markdown = sanitizeText(await fs.readFile(markdownPath, 'utf8'))
  const projectDescription = parseProjectDescription(markdown)
  const overviewRows = parseOverview(markdown)
  const useCases = parseUseCases(markdown)
  const conclusion = cleanInline(
    extractBetween(markdown, '## Kurzes Fazit', '')
  )
  const { images, relationshipMap } = await prepareImages(useCases)
  const logoData = await fs.readFile(htwLogoPath)
  const logoInfo = readImageInfo(logoData)
  const logoImage = {
    relationshipId: 'rIdLogo',
    fileName: 'pdf-image-87.jpg',
    ...fitImage(logoInfo, 2.85, 1.7),
    displayName: 'HTW Berlin Logo',
    data: logoData,
    contentType: logoInfo.contentType,
  }
  const allImages = [logoImage, ...images]

  const body = [
    coverXml(logoImage),
    heading('Kurze Projektbeschreibung'),
    textParagraph(projectDescription),
    heading('Use-Case-Übersicht'),
    table(overviewRows),
    ...useCases.map((useCase, index) =>
      useCaseXml(useCase, relationshipMap, index + 1)
    ),
    pageBreak(),
    heading('Kurzes Fazit'),
    textParagraph(conclusion),
  ].join('')

  const zip = new JSZip()
  zip.file('[Content_Types].xml', contentTypesXml())
  zip.folder('_rels').file('.rels', rootRelsXml())
  zip.folder('docProps').file('core.xml', coreXml())
  zip.folder('docProps').file('app.xml', appXml())

  const word = zip.folder('word')
  word.file('document.xml', documentXml(body))
  word.folder('_rels').file('document.xml.rels', documentRelsXml(allImages))

  const media = word.folder('media')
  for (const image of allImages) {
    media.file(image.fileName, image.data)
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  })

  await fs.writeFile(outputPath, buffer)

  console.log(`Word-Datei erstellt: ${outputPath}`)
  console.log(`Use-Cases übernommen: ${useCases.length}`)
  console.log(`Screenshots eingebettet: ${images.length}`)
}

main().catch((error) => {
  console.error('Word-Erstellung fehlgeschlagen:')
  console.error(error)
  process.exitCode = 1
})
