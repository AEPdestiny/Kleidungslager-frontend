const kleidungsgroessen = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

const schuhgroessen = Array.from({ length: 25 }, (_, index) => {
  const groesse = 36 + index * 0.5

  return String(groesse).replace('.', ',')
})

export function groessenFuerKategorie(kategorie: string): string[] {
  if (kategorie === 'SCHUHE') {
    return schuhgroessen
  }

  return kleidungsgroessen
}

export function standardgroesseFuerKategorie(kategorie: string): string {
  if (kategorie === 'SCHUHE') {
    return '36'
  }

  if (kategorie === 'ACCESSOIRES' || kategorie === 'SONSTIGES') {
    return ''
  }

  return 'M'
}

export function vergleicheGroessen(a: string, b: string): number {
  const groesseA = String(a ?? '').trim()
  const groesseB = String(b ?? '').trim()

  if (groesseA === '' && groesseB === '') {
    return 0
  }

  if (groesseA === '') {
    return 1
  }

  if (groesseB === '') {
    return -1
  }

  const rangA = kleidungsgroessen.indexOf(groesseA)
  const rangB = kleidungsgroessen.indexOf(groesseB)

  if (rangA !== -1 && rangB !== -1) {
    return rangA - rangB
  }

  if (rangA !== -1) {
    return -1
  }

  if (rangB !== -1) {
    return 1
  }

  const nummerA = Number(groesseA.replace(',', '.'))
  const nummerB = Number(groesseB.replace(',', '.'))

  if (Number.isFinite(nummerA) && Number.isFinite(nummerB)) {
    return nummerA - nummerB
  }

  return groesseA.localeCompare(groesseB, 'de', { numeric: true })
}
