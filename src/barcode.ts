export type ArtikelMitBarcode = {
  artikelnummer?: string
}

export function normalisiereBarcode(barcode: string): string {
  return barcode.trim().toLocaleLowerCase('de-DE')
}

export function findeArtikelNachBarcode<T extends ArtikelMitBarcode>(
  artikel: T[],
  barcode: string,
): T | undefined {
  const gesucht = normalisiereBarcode(barcode)

  if (gesucht === '') {
    return undefined
  }

  return artikel.find((eintrag) => {
    return normalisiereBarcode(eintrag.artikelnummer ?? '') === gesucht
  })
}
