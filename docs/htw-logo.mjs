import fs from 'node:fs/promises'

const logoImageObject = 87
const logoWidth = 477
const logoHeight = 284

function extractObjectStream(pdfBytes, objectNumber) {
  const objectStart = pdfBytes.indexOf(Buffer.from(`${objectNumber} 0 obj`))

  if (objectStart === -1) {
    throw new Error(`PDF-Objekt ${objectNumber} wurde nicht gefunden.`)
  }

  const streamStart = pdfBytes.indexOf(Buffer.from('stream'), objectStart)

  if (streamStart === -1) {
    throw new Error(`PDF-Objekt ${objectNumber} enthaelt keinen Stream.`)
  }

  let dataStart = streamStart + 'stream'.length

  if (pdfBytes[dataStart] === 13 && pdfBytes[dataStart + 1] === 10) {
    dataStart += 2
  } else if (pdfBytes[dataStart] === 10) {
    dataStart += 1
  }

  const streamEnd = pdfBytes.indexOf(Buffer.from('endstream'), dataStart)

  if (streamEnd === -1) {
    throw new Error(`PDF-Stream ${objectNumber} ist unvollstaendig.`)
  }

  return pdfBytes.subarray(dataStart, streamEnd)
}

export async function ensureHtwLogoAsset(deckblattPath, logoPath) {
  const pdfBytes = await fs.readFile(deckblattPath)
  const logoBytes = extractObjectStream(pdfBytes, logoImageObject)

  await fs.writeFile(logoPath, logoBytes)

  return {
    width: logoWidth,
    height: logoHeight,
    path: logoPath,
  }
}
