export type KleidungsFormular = {
  artikelnummer?: string
  bezeichnung: string
  size?: string
  lager: number
  kategorie: string
  farbe: string
  lagerbestand: number
}

export type Feldfehler = Record<string, string>

export function validiereKleidungsFormular(
  formular: KleidungsFormular,
): Feldfehler {
  const fehler: Feldfehler = {}

  if (formular.bezeichnung.trim() === '') {
    fehler.bezeichnung = 'Bitte gib eine Bezeichnung ein.'
  } else if (formular.bezeichnung.trim().length > 100) {
    fehler.bezeichnung = 'Die Bezeichnung darf höchstens 100 Zeichen enthalten.'
  }

  if ((formular.artikelnummer ?? '').trim().length > 100) {
    fehler.artikelnummer = 'Die Artikelnummer darf höchstens 100 Zeichen enthalten.'
  }

  if ((formular.size ?? '').trim().length > 10) {
    fehler.size = 'Die Größe darf höchstens 10 Zeichen enthalten.'
  }

  if (formular.farbe.trim() === '') {
    fehler.farbe = 'Bitte gib eine Farbe ein.'
  } else if (formular.farbe.trim().length > 50) {
    fehler.farbe = 'Die Farbe darf höchstens 50 Zeichen enthalten.'
  }

  if (formular.kategorie.trim() === '') {
    fehler.kategorie = 'Bitte wähle eine Kategorie aus.'
  }

  if (!Number.isInteger(formular.lager) || formular.lager < 1) {
    fehler.lager = 'Das Lager muss eine ganze Zahl ab 1 sein.'
  }

  if (!Number.isInteger(formular.lagerbestand) || formular.lagerbestand < 0) {
    fehler.lagerbestand = 'Der Bestand muss eine ganze Zahl ab 0 sein.'
  }

  return fehler
}
