import { describe, expect, it } from 'vitest'
import { findeArtikelNachBarcode, normalisiereBarcode } from '../../barcode'

describe('Barcode-Suche', () => {
  // Prüft, dass Barcodes vor dem Vergleich vereinheitlicht werden.
  it('entfernt Leerzeichen und ignoriert Groß- und Kleinschreibung', () => {
    expect(normalisiereBarcode('  KL-0042 ')).toBe('kl-0042')
  })

  // Prüft, dass nur die vollständig passende Artikelnummer gefunden wird.
  it('findet nur einen exakten Barcode', () => {
    const artikel = [
      { id: 1, artikelnummer: '4006381333931' },
      { id: 2, artikelnummer: 'KL-0042' },
    ]

    expect(findeArtikelNachBarcode(artikel, ' kl-0042 ')?.id).toBe(2)
    expect(findeArtikelNachBarcode(artikel, '0042')).toBeUndefined()
  })

  // Prüft, dass Artikel ohne gespeicherten Barcode keinen falschen Treffer erzeugen.
  it('ignoriert Artikel ohne Barcode', () => {
    const artikel: Array<{ id: number; artikelnummer?: string }> = [{ id: 1 }]

    expect(findeArtikelNachBarcode(artikel, 'KL-0001')).toBeUndefined()
  })
})
