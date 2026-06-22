import { describe, expect, it } from 'vitest'
import { validiereKleidungsFormular } from '../../formularValidierung'

describe('Kleidungsformular-Validierung', () => {
  // Prüft einen gültigen Artikel, bei dem die optionale Größe leer bleibt.
  it('akzeptiert gültige Eingaben ohne Größe', () => {
    const fehler = validiereKleidungsFormular({
      artikelnummer: '4006381333931',
      bezeichnung: 'Handtasche',
      size: '',
      lager: 1,
      kategorie: 'ACCESSOIRES',
      farbe: 'Schwarz',
      lagerbestand: 3,
    })

    expect(fehler).toEqual({})
  })

  // Prüft, dass leere Pflichtfelder und negative Zahlen gemeldet werden.
  it('meldet leere Pflichtfelder und ungültige Zahlen', () => {
    const fehler = validiereKleidungsFormular({
      bezeichnung: ' ',
      lager: 0,
      kategorie: '',
      farbe: '',
      lagerbestand: -2,
    })

    expect(fehler.bezeichnung).toBeDefined()
    expect(fehler.farbe).toBeDefined()
    expect(fehler.kategorie).toBeDefined()
    expect(fehler.lager).toBeDefined()
    expect(fehler.lagerbestand).toBeDefined()
  })
})
