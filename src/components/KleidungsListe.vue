<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BarcodeScanner from './BarcodeScanner.vue'
import { validiereKleidungsFormular, type Feldfehler } from '../formularValidierung'
import {
  groessenFuerKategorie,
  standardgroesseFuerKategorie,
  vergleicheGroessen,
} from '../groessen'
import { settingsState } from '../settings'

type Kleidungsstueck = {
  id: number
  artikelnummer?: string
  bezeichnung: string
  size: string
  lager: number
  kategorie: string
  farbe: string
  lagerbestand: number
  bild: string
}

type NeuesKleidungsstueck = {
  artikelnummer: string
  bezeichnung: string
  size: string
  lager: number
  kategorie: string
  farbe: string
  lagerbestand: number
  bild: string
}

type VerlaufsEintrag = {
  id: number
  text: string
}

type ApiFehler = {
  meldung?: string
  feldfehler?: Feldfehler
}

type ScannerModus = 'formular' | 'suche'

const kleidungsstuecke =
  ref<Kleidungsstueck[]>([])
const router = useRouter()

const bestandBearbeitung =
  ref<Record<number, number>>({})

const lagerBearbeitung =
  ref<Record<number, number>>({})

const bildBearbeitung =
  ref<Record<number, string>>({})

const zuLoeschendeId =
  ref<number | null>(null)

const suchbegriff = ref('')
const kategorieFilter = ref('')
const groesseFilter = ref('')
const lagerFilter = ref('')
const sortierung = ref(settingsState.defaultSort)
const ansicht = ref(settingsState.compactList ? 'kompakt' : 'karten')
const erfolgsmeldung = ref('')
const geoeffneteKarteId =
  ref<number | null>(null)
const detailKleidungsstueck =
  ref<Kleidungsstueck | null>(null)
const bestandsverlauf =
  ref<VerlaufsEintrag[]>([])
const verlaufListe =
  ref<HTMLUListElement | null>(null)
const ladeFehler = ref('')
const bildInput =
  ref<HTMLInputElement | null>(null)
const bildDateiname = ref('')
const formularFehler = ref('')
const feldfehler = ref<Feldfehler>({})
const scannerModus = ref<ScannerModus | null>(null)
const scannerMeldung = ref('')
const barcodeSucheLaeuft = ref(false)

let erfolgsTimeout: number | undefined
let naechsteVerlaufId = 1
const verlaufStorageKey = 'kleidungslager-bestandsverlauf'

const neuesKleidungsstueck = ref<NeuesKleidungsstueck>({
  artikelnummer: '',
  bezeichnung: '',
  size: 'M',
  lager: 1,
  kategorie: 'HEMD',
  farbe: '',
  lagerbestand: 1,
  bild: '',
})

const neueGroessenOptionen = computed(() => {
  return groessenFuerKategorie(neuesKleidungsstueck.value.kategorie)
})

const anzahlKleidungsstuecke = computed(() => {
  return kleidungsstuecke.value.length
})

const gesamtbestand = computed(() => {
  return kleidungsstuecke.value.reduce((summe, teil) => {
    return summe + teil.lagerbestand
  }, 0)
})

const lagerAnzahl = computed(() => {
  const lager = kleidungsstuecke.value.map((teil) => {
    return teil.lager
  })

  return new Set(lager).size
})

const niedrigerBestandAnzahl = computed(() => {
  return kleidungsstuecke.value.filter((teil) => {
    return teil.lagerbestand <= settingsState.lowStockThreshold
  }).length
})

const nachbestellText = computed(() => {
  if (niedrigerBestandAnzahl.value === 0) {
    return ''
  }

  if (niedrigerBestandAnzahl.value === 1) {
    return '1 Artikel muss nachbestellt werden.'
  }

  return niedrigerBestandAnzahl.value + ' Artikel müssen nachbestellt werden.'
})

const kritischeArtikelListe = computed(() => {
  return kleidungsstuecke.value
    .filter((teil) => {
      return teil.lagerbestand <= settingsState.lowStockThreshold
    })
    .sort((a, b) => {
      return a.lagerbestand - b.lagerbestand
    })
    .map((teil) => {
      return teil.bezeichnung + ' (' + teil.lagerbestand + ')'
    })
})

const kritischeArtikel = computed(() => {
  if (kritischeArtikelListe.value.length === 0) {
    return 'Keine'
  }

  const angezeigteTeile = kritischeArtikelListe.value.slice(0, 3)
  const restlicheTeile = kritischeArtikelListe.value.length - angezeigteTeile.length

  if (restlicheTeile > 0) {
    return angezeigteTeile.join(', ') + ' + ' + restlicheTeile + ' weitere'
  }

  return angezeigteTeile.join(', ')
})

const kritischeArtikelAlle = computed(() => {
  return kritischeArtikelListe.value.join(', ')
})

const kleidungProLagerListe = computed(() => {
  const lagerZaehler: Record<number, number> = {}

  kleidungsstuecke.value.forEach((teil) => {
    lagerZaehler[teil.lager] = (lagerZaehler[teil.lager] ?? 0) + 1
  })

  return Object.entries(lagerZaehler)
    .sort((a, b) => {
      return Number(a[0]) - Number(b[0])
    })
    .map(([lager, anzahl]) => {
      return 'Lager ' + lager + ': ' + anzahl
    })
})

const kleidungProLager = computed(() => {
  if (kleidungProLagerListe.value.length === 0) {
    return '-'
  }

  const angezeigteLager = kleidungProLagerListe.value.slice(0, 3)
  const restlicheLager = kleidungProLagerListe.value.length - angezeigteLager.length

  if (restlicheLager > 0) {
    return angezeigteLager.join(', ') + ' + ' + restlicheLager + ' weitere'
  }

  return angezeigteLager.join(', ')
})

const kleidungProLagerAlle = computed(() => {
  return kleidungProLagerListe.value.join(', ')
})

const kategorien = computed(() => {
  return [...new Set(kleidungsstuecke.value.map((teil) => {
    return teil.kategorie
  }))].sort()
})

const groessen = computed(() => {
  return [...new Set(kleidungsstuecke.value.map((teil) => {
    return teil.size
  }))]
    .filter((groesse) => {
      return String(groesse ?? '').trim() !== ''
    })
    .sort(vergleicheGroessen)
})

const lagerPlaetze = computed(() => {
  return [...new Set(kleidungsstuecke.value.map((teil) => {
    return teil.lager
  }))].sort((a, b) => {
    return a - b
  })
})

const istTabellenAnsicht = computed(() => {
  return ansicht.value === 'tabelle'
})

const istKompaktAnsicht = computed(() => {
  return ansicht.value === 'kompakt'
})

function artikelnummer(teil: Kleidungsstueck): string {
  if (typeof teil.artikelnummer === 'string' && teil.artikelnummer.trim() !== '') {
    return teil.artikelnummer
  }

  return 'KL-' + String(teil.id).padStart(4, '0')
}

function kategorieClass(kategorie: string): string {
  return 'kategorie-' + String(kategorie ?? 'sonstiges').toLowerCase()
}

function oeffneDetailseite(id: number): void {
  router.push('/kleidung/' + id)
}

function istOhneFilter(wert: string | null | undefined): boolean {
  return wert === undefined
    || wert === null
    || wert === ''
    || wert === 'Alle'
}

const gefilterteKleidungsstuecke = computed(() => {
  const suchWoerter = suchbegriff.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((wort) => {
      return wort !== ''
    })

  const gefiltert = kleidungsstuecke.value.filter((teil) => {
    const suchText = [
      artikelnummer(teil),
      teil.bezeichnung ?? '',
      teil.kategorie ?? '',
      teil.size ?? '',
      teil.farbe ?? '',
      'lager ' + teil.lager,
      String(teil.lager),
    ].join(' ').toLowerCase()

    const passtZurSuche =
      suchWoerter.length === 0 || suchWoerter.every((wort) => {
        return suchText.includes(wort)
      })

    const passtZurKategorie =
      istOhneFilter(kategorieFilter.value) || teil.kategorie === kategorieFilter.value

    const passtZurGroesse =
      istOhneFilter(groesseFilter.value) || teil.size === groesseFilter.value

    const passtZumLager =
      istOhneFilter(lagerFilter.value) || String(teil.lager) === lagerFilter.value

    return passtZurSuche
      && passtZurKategorie
      && passtZurGroesse
      && passtZumLager
  })

  return gefiltert.sort((a, b) => {
    if (sortierung.value === 'bestand') {
      return a.lagerbestand - b.lagerbestand
    }

    if (sortierung.value === 'lager') {
      return a.lager - b.lager
    }

    if (sortierung.value === 'kategorie') {
      return a.kategorie.localeCompare(b.kategorie)
    }

    if (sortierung.value === 'groesse') {
      return vergleicheGroessen(a.size, b.size)
    }

    return String(a.bezeichnung ?? '').localeCompare(String(b.bezeichnung ?? ''))
  })
})

function getKleidungEndpoint(): string {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL

  return baseUrl + '/api/kleidung'
}

function neueKategorieGeaendert(): void {
  neuesKleidungsstueck.value.size =
    standardgroesseFuerKategorie(neuesKleidungsstueck.value.kategorie)
}

function zeigeErfolg(text: string): void {
  erfolgsmeldung.value = text

  if (erfolgsTimeout !== undefined) {
    window.clearTimeout(erfolgsTimeout)
  }

  erfolgsTimeout = window.setTimeout(() => {
    erfolgsmeldung.value = ''
  }, 2500)
}

function ladeVerlauf(): void {
  const gespeicherterVerlauf = localStorage.getItem(verlaufStorageKey)

  if (gespeicherterVerlauf === null) {
    return
  }

  bestandsverlauf.value = JSON.parse(gespeicherterVerlauf)
  bestandsverlauf.value.sort((a, b) => a.id - b.id)
  naechsteVerlaufId =
    Math.max(0, ...bestandsverlauf.value.map((eintrag) => eintrag.id)) + 1

  void scrolleZumNeuestenEintrag()
}

async function scrolleZumNeuestenEintrag(): Promise<void> {
  await nextTick()

  if (verlaufListe.value !== null) {
    verlaufListe.value.scrollTop = verlaufListe.value.scrollHeight
  }
}

function fuegeVerlaufHinzu(text: string): void {
  const datum = new Date().toLocaleDateString('de-DE')

  bestandsverlauf.value.push({
    id: naechsteVerlaufId,
    text: datum + ': ' + text,
  })

  naechsteVerlaufId += 1
  bestandsverlauf.value = bestandsverlauf.value.slice(-100)
  localStorage.setItem(verlaufStorageKey, JSON.stringify(bestandsverlauf.value))
  void scrolleZumNeuestenEintrag()
}

function setzeBearbeitung(): void {
  const neueBestaende: Record<number, number> = {}
  const neueLager: Record<number, number> = {}
  const neueBilder: Record<number, string> = {}

  kleidungsstuecke.value.forEach((teil) => {
    neueBestaende[teil.id] = teil.lagerbestand
    neueLager[teil.id] = teil.lager
    neueBilder[teil.id] = teil.bild ?? ''
  })

  bestandBearbeitung.value = neueBestaende
  lagerBearbeitung.value = neueLager
  bildBearbeitung.value = neueBilder
}

function ersetzeOderFuegeHinzu(gespeichertesTeil: Kleidungsstueck): void {
  const index = kleidungsstuecke.value.findIndex((teil) => {
    return teil.id === gespeichertesTeil.id
  })

  if (index === -1) {
    kleidungsstuecke.value.push(gespeichertesTeil)
  } else {
    kleidungsstuecke.value[index] = gespeichertesTeil
  }

  bestandBearbeitung.value[gespeichertesTeil.id] =
    gespeichertesTeil.lagerbestand

  lagerBearbeitung.value[gespeichertesTeil.id] =
    gespeichertesTeil.lager

  bildBearbeitung.value[gespeichertesTeil.id] =
    gespeichertesTeil.bild ?? ''
}

function requestKleidung(): void {
  ladeFehler.value = ''

  axios
    .get<Kleidungsstueck[]>(getKleidungEndpoint())
    .then((response) => {
      kleidungsstuecke.value = response.data
      setzeBearbeitung()
    })
    .catch((error) => {
      console.log(error)
      ladeFehler.value = 'Backend konnte nicht erreicht werden.'
    })
}

function createKleidung(): void {
  formularFehler.value = ''
  feldfehler.value = validiereKleidungsFormular(neuesKleidungsstueck.value)

  if (Object.keys(feldfehler.value).length > 0) {
    formularFehler.value = 'Bitte korrigiere die markierten Eingaben.'
    return
  }

  axios
    .post<Kleidungsstueck>(
      getKleidungEndpoint(),
      neuesKleidungsstueck.value,
    )
    .then((response) => {
      ersetzeOderFuegeHinzu(response.data)
      zeigeErfolg('Kleidungsstück gespeichert.')
      fuegeVerlaufHinzu(
        'Artikel erstellt: '
          + response.data.bezeichnung
          + ' mit Bestand '
          + response.data.lagerbestand
          + ' gespeichert'
      )

      neuesKleidungsstueck.value = {
        artikelnummer: '',
        bezeichnung: '',
        size: 'M',
        lager: 1,
        kategorie: 'HEMD',
        farbe: '',
        lagerbestand: 1,
        bild: '',
      }

      if (bildInput.value !== null) {
        bildInput.value.value = ''
      }

      bildDateiname.value = ''
    })
    .catch((error) => {
      console.log(error)
      const apiFehler = axios.isAxiosError<ApiFehler>(error)
        ? error.response?.data
        : undefined

      feldfehler.value = apiFehler?.feldfehler ?? {}
      formularFehler.value =
        apiFehler?.meldung ?? 'Das Kleidungsstück konnte nicht gespeichert werden.'
    })
}

function oeffneBarcodeScanner(modus: ScannerModus): void {
  scannerMeldung.value = ''
  scannerModus.value = modus
}

function schliesseBarcodeScanner(): void {
  scannerModus.value = null
}

async function barcodeErkannt(barcode: string): Promise<void> {
  const modus = scannerModus.value
  scannerModus.value = null

  if (modus === 'formular') {
    neuesKleidungsstueck.value.artikelnummer = barcode
    delete feldfehler.value.artikelnummer
    zeigeErfolg('Barcode wurde in das Formular übernommen.')
    return
  }

  barcodeSucheLaeuft.value = true
  scannerMeldung.value = ''

  try {
    const endpoint =
      getKleidungEndpoint() + '/artikelnummer/' + encodeURIComponent(barcode)
    const response = await axios.get<Kleidungsstueck>(endpoint)
    await router.push('/kleidung/' + response.data.id)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      scannerMeldung.value =
        'Zu diesem Barcode wurde kein Produkt im Lager gefunden.'
    } else {
      scannerMeldung.value =
        'Die Barcode-Suche konnte das Backend nicht erreichen.'
    }
  } finally {
    barcodeSucheLaeuft.value = false
  }
}

function aendereBestand(id: number, veraenderung: number): void {
  const aktuellerBestand = bestandBearbeitung.value[id] ?? 0
  const neuerBestand = aktuellerBestand + veraenderung

  bestandBearbeitung.value[id] = Math.max(0, neuerBestand)
}

function aendereLager(id: number, veraenderung: number): void {
  const aktuellesLager = lagerBearbeitung.value[id] ?? 1
  const neuesLager = aktuellesLager + veraenderung

  lagerBearbeitung.value[id] = Math.max(1, neuesLager)
}

function aendereNeuesLager(veraenderung: number): void {
  const neuesLager = neuesKleidungsstueck.value.lager + veraenderung

  neuesKleidungsstueck.value.lager = Math.max(1, neuesLager)
}

function aendereNeuenBestand(veraenderung: number): void {
  const neuerBestand = neuesKleidungsstueck.value.lagerbestand + veraenderung

  neuesKleidungsstueck.value.lagerbestand = Math.max(0, neuerBestand)
}

function blockiereUngueltigeZahl(event: KeyboardEvent): void {
  if (['e', 'E', '+', '-', '.', ','].includes(event.key)) {
    event.preventDefault()
  }
}

function korrigierePositiveGanzzahl(
  wert: number,
  minimum: number,
): number {
  if (!Number.isFinite(wert)) {
    return minimum
  }

  return Math.max(minimum, Math.floor(wert))
}

function korrigiereNeuesLager(): void {
  neuesKleidungsstueck.value.lager =
    korrigierePositiveGanzzahl(neuesKleidungsstueck.value.lager, 1)
}

function korrigiereNeuenBestand(): void {
  neuesKleidungsstueck.value.lagerbestand =
    korrigierePositiveGanzzahl(neuesKleidungsstueck.value.lagerbestand, 0)
}

function korrigiereBearbeitung(id: number): void {
  bestandBearbeitung.value[id] =
    korrigierePositiveGanzzahl(bestandBearbeitung.value[id] ?? 0, 0)

  lagerBearbeitung.value[id] =
    korrigierePositiveGanzzahl(lagerBearbeitung.value[id] ?? 1, 1)
}

function bildAuswaehlen(event: Event): void {
  const input = event.target as HTMLInputElement
  const bildDatei = input.files?.[0]

  if (bildDatei === undefined) {
    return
  }

  bildDateiname.value = bildDatei.name

  const reader = new FileReader()

  reader.addEventListener('load', () => {
    neuesKleidungsstueck.value.bild = String(reader.result)
  })

  reader.readAsDataURL(bildDatei)
}

function oeffneBildAuswahl(): void {
  bildInput.value?.click()
}

function bildBearbeiten(event: Event, id: number): void {
  const input = event.target as HTMLInputElement
  const bildDatei = input.files?.[0]

  if (bildDatei === undefined) {
    return
  }

  const reader = new FileReader()

  reader.addEventListener('load', () => {
    const altesTeil = kleidungsstuecke.value.find((teil) => {
      return teil.id === id
    })

    bildBearbeitung.value[id] = String(reader.result)
    updateKleidung(id)
    if (altesTeil !== undefined) {
      fuegeVerlaufHinzu('Bild geändert: ' + altesTeil.bezeichnung)
    }
    input.value = ''
  })

  reader.readAsDataURL(bildDatei)
}

function bildEntfernen(id: number): void {
  const altesTeil = kleidungsstuecke.value.find((teil) => {
    return teil.id === id
  })

  bildBearbeitung.value[id] = ''
  updateKleidung(id)

  if (altesTeil !== undefined) {
    fuegeVerlaufHinzu('Bild entfernt: ' + altesTeil.bezeichnung)
  }
}

function karteUmschalten(id: number): void {
  if (!istKompaktAnsicht.value) {
    return
  }

  if (geoeffneteKarteId.value === id) {
    geoeffneteKarteId.value = null
  } else {
    geoeffneteKarteId.value = id
  }
}

function karteAnklicken(teil: Kleidungsstueck): void {
  if (istKompaktAnsicht.value) {
    karteUmschalten(teil.id)
  } else {
    oeffneDetailseite(teil.id)
  }
}

function updateKleidung(id: number): void {
  const endpoint = getKleidungEndpoint() + '/' + id + '/bestand'
  const altesTeil = kleidungsstuecke.value.find((teil) => {
    return teil.id === id
  })

  axios
    .put<Kleidungsstueck>(endpoint, {
      lagerbestand: bestandBearbeitung.value[id],
      lager: lagerBearbeitung.value[id],
      bild: bildBearbeitung.value[id],
    })
    .then((response) => {
      ersetzeOderFuegeHinzu(response.data)
      zeigeErfolg('Kleidungsstück aktualisiert.')

      if (altesTeil !== undefined && altesTeil.lagerbestand !== response.data.lagerbestand) {
        fuegeVerlaufHinzu(
          'Bestand geändert: '
            + response.data.bezeichnung
            + ' von '
            + altesTeil.lagerbestand
            + ' auf '
            + response.data.lagerbestand
            + ' geändert'
        )
      }

      if (altesTeil !== undefined && altesTeil.lager !== response.data.lager) {
        fuegeVerlaufHinzu(
          'Lager geändert: '
            + response.data.bezeichnung
            + ' von Lager '
            + altesTeil.lager
            + ' auf Lager '
            + response.data.lager
        )
      }
    })
    .catch((error) => {
      console.log(error)
    })
}

function deleteKleidung(): void {
  if (zuLoeschendeId.value === null) {
    return
  }

  const id = zuLoeschendeId.value
  const endpoint = getKleidungEndpoint() + '/' + id
  const geloeschtesTeil = kleidungsstuecke.value.find((teil) => {
    return teil.id === id
  })

  axios
    .delete(endpoint)
    .then(() => {
      kleidungsstuecke.value =
        kleidungsstuecke.value.filter((teil) => {
          return teil.id !== id
        })
      delete bestandBearbeitung.value[id]
      delete lagerBearbeitung.value[id]
      delete bildBearbeitung.value[id]
      zuLoeschendeId.value = null
      zeigeErfolg('Kleidungsstück gelöscht.')

      if (geloeschtesTeil !== undefined) {
        fuegeVerlaufHinzu('Artikel gelöscht: ' + geloeschtesTeil.bezeichnung)
      }
    })
    .catch((error) => {
      console.log(error)
    })
}

function abbrechenLoeschen(): void {
  zuLoeschendeId.value = null
}

function frageLoeschen(id: number): void {
  zuLoeschendeId.value = id
}

function detailSchliessen(): void {
  detailKleidungsstueck.value = null
}

function csvExportieren(): void {
  const kopf = [
    'id',
    'artikelnummer',
    'bezeichnung',
    'kategorie',
    'groesse',
    'farbe',
    'lager',
    'bestand',
  ]

  const zeilen = kleidungsstuecke.value.map((teil) => {
    return [
      teil.id,
      artikelnummer(teil),
      teil.bezeichnung,
      teil.kategorie,
      teil.size,
      teil.farbe,
      teil.lager,
      teil.lagerbestand,
    ].map((wert) => {
      return '"' + String(wert).replace(/"/g, '""') + '"'
    }).join(';')
  })

  const csv = [kopf.join(';'), ...zeilen].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'kleidungslager-export.csv'
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  ladeVerlauf()
  requestKleidung()
})
</script>

<template>
  <section class="kleidungs-liste">
    <div v-if="erfolgsmeldung !== ''" class="toast">
      {{ erfolgsmeldung }}
    </div>

    <div v-if="ladeFehler !== ''" class="error-message">
      {{ ladeFehler }}
    </div>

    <section v-if="nachbestellText !== ''" class="dashboard-warning">
      <span>Nachbestellung</span>
      <strong>{{ nachbestellText }}</strong>
    </section>

    <div class="stats-grid">
      <article>
        <span>Artikel</span>
        <strong>{{ anzahlKleidungsstuecke }}</strong>
      </article>

      <article>
        <span>Gesamtbestand</span>
        <strong>{{ gesamtbestand }}</strong>
      </article>

      <article>
        <span>Lagerplätze</span>
        <strong>{{ lagerAnzahl }}</strong>
      </article>

      <article>
        <span>Niedrig</span>
        <strong>{{ niedrigerBestandAnzahl }}</strong>
      </article>
    </div>

    <div class="insights-grid">
      <article
        :class="[
          'insight-card',
          { 'dunkelmodus-insight': settingsState.darkMode },
        ]"
      >
        <span>Kritische Artikel</span>
        <strong>{{ kritischeArtikel }}</strong>
        <p v-if="kritischeArtikelAlle !== ''" class="insight-tooltip">
          {{ kritischeArtikelAlle }}
        </p>
      </article>

      <article
        :class="[
          'insight-card',
          { 'dunkelmodus-insight': settingsState.darkMode },
        ]"
      >
        <span>Kleidung pro Lager</span>
        <strong>{{ kleidungProLager }}</strong>
        <p v-if="kleidungProLagerAlle !== ''" class="insight-tooltip">
          {{ kleidungProLagerAlle }}
        </p>
      </article>

      <button type="button" @click="csvExportieren">
        CSV exportieren
      </button>
    </div>

    <section class="verlauf-panel">
      <div class="list-head">
        <div>
          <p class="eyebrow">Aktivitätsprotokoll</p>
          <h2>Letzte Aktivitäten</h2>
        </div>
      </div>

      <ul
        v-if="bestandsverlauf.length > 0"
        ref="verlaufListe"
        class="verlauf-liste"
      >
        <li v-for="eintrag in bestandsverlauf" :key="eintrag.id">
          {{ eintrag.text }}
        </li>
      </ul>

      <p v-else class="empty-state">
        Noch keine Aktivitäten gespeichert.
      </p>
    </section>

    <div class="workspace-grid">
      <form class="formular" novalidate @submit.prevent="createKleidung">
        <div class="form-head">
          <p class="eyebrow">Neuer Eintrag</p>
          <h2>Kleidungsstück speichern</h2>
        </div>

        <p v-if="formularFehler !== ''" class="formular-fehler">
          {{ formularFehler }}
        </p>

        <label>
          Artikelnummer / Barcode
          <span class="barcode-input-group">
            <input
              v-model="neuesKleidungsstueck.artikelnummer"
              :aria-invalid="feldfehler.artikelnummer !== undefined"
              maxlength="100"
              placeholder="z.B. KL-0001 oder Barcode"
              title="Optional: Du kannst hier eine eigene Artikelnummer oder einen Barcode eingeben. Wenn du nichts eingibst, wird automatisch KL-0001 usw. angezeigt."
            />
            <button type="button" @click="oeffneBarcodeScanner('formular')">
              Scannen
            </button>
          </span>
          <span v-if="feldfehler.artikelnummer" class="feld-fehler">
            {{ feldfehler.artikelnummer }}
          </span>
        </label>

        <label>
          Bezeichnung
          <input
            v-model="neuesKleidungsstueck.bezeichnung"
            :aria-invalid="feldfehler.bezeichnung !== undefined"
            maxlength="100"
            required
            title="Bezeichnung: Der Name des Kleidungsstücks, z.B. Pullover oder Jeans."
          />
          <span v-if="feldfehler.bezeichnung" class="feld-fehler">
            {{ feldfehler.bezeichnung }}
          </span>
        </label>

        <label>
          Größe
          <select v-model="neuesKleidungsstueck.size">
            <option value="">Keine Größe</option>
            <option
              v-for="groesse in neueGroessenOptionen"
              :key="groesse"
              :value="groesse"
            >
              {{ groesse }}
            </option>
          </select>
        </label>

        <label>
          Kategorie
          <select
            v-model="neuesKleidungsstueck.kategorie"
            @change="neueKategorieGeaendert"
          >
            <option value="HEMD">HEMD</option>
            <option value="HOSE">HOSE</option>
            <option value="KLEID">KLEID</option>
            <option value="JACKE">JACKE</option>
            <option value="SCHUHE">SCHUHE</option>
            <option value="ACCESSOIRES">ACCESSOIRES</option>
            <option value="SONSTIGES">SONSTIGES</option>
          </select>
        </label>

        <label>
          Farbe
          <input
            v-model="neuesKleidungsstueck.farbe"
            :aria-invalid="feldfehler.farbe !== undefined"
            maxlength="50"
            required
          />
          <span v-if="feldfehler.farbe" class="feld-fehler">
            {{ feldfehler.farbe }}
          </span>
        </label>

        <label>
          Lager
          <span class="number-field">
            <input
              v-model.number="neuesKleidungsstueck.lager"
              :aria-invalid="feldfehler.lager !== undefined"
              min="1"
              required
              type="number"
              @blur="korrigiereNeuesLager"
              @keydown="blockiereUngueltigeZahl"
            />
            <span class="number-buttons">
              <button type="button" @click="aendereNeuesLager(1)">▲</button>
              <button type="button" @click="aendereNeuesLager(-1)">▼</button>
            </span>
          </span>
          <span v-if="feldfehler.lager" class="feld-fehler">
            {{ feldfehler.lager }}
          </span>
        </label>

        <label>
          Bestand
          <span class="number-field">
            <input
              v-model.number="neuesKleidungsstueck.lagerbestand"
              :aria-invalid="feldfehler.lagerbestand !== undefined"
              min="0"
              required
              type="number"
              @blur="korrigiereNeuenBestand"
              @keydown="blockiereUngueltigeZahl"
            />
            <span class="number-buttons">
              <button type="button" @click="aendereNeuenBestand(1)">▲</button>
              <button type="button" @click="aendereNeuenBestand(-1)">▼</button>
            </span>
          </span>
          <span v-if="feldfehler.lagerbestand" class="feld-fehler">
            {{ feldfehler.lagerbestand }}
          </span>
        </label>

        <div class="bild-bereich">
          <img
            v-if="neuesKleidungsstueck.bild !== ''"
            :src="neuesKleidungsstueck.bild"
            alt="Vorschau des Kleidungsstücks"
            class="bild-vorschau"
          />
          <div v-else class="bild-platzhalter">
            Bildvorschau
          </div>

          <div class="bild-upload">
            <span class="bild-label">Bild</span>
            <input
              ref="bildInput"
              accept="image/*"
              class="bild-input"
              type="file"
              @change="bildAuswaehlen"
            />
            <button
              class="bild-button"
              type="button"
              @click="oeffneBildAuswahl"
            >
              Bild auswählen
            </button>
            <span class="bild-dateiname">
              {{ bildDateiname || 'Keine Datei ausgewählt' }}
            </span>
          </div>
        </div>

        <button type="submit">Speichern</button>
      </form>

      <div class="listen-panel">
        <div class="list-head">
          <div>
            <p class="eyebrow">Live-Bestand</p>
            <h2>Kleidungsstücke im Lager</h2>
          </div>
          <div class="list-head-actions">
            <span v-if="settingsState.showApiBadge" class="sync-badge">API</span>
            <button
              class="barcode-suche-button"
              :disabled="barcodeSucheLaeuft"
              type="button"
              @click="oeffneBarcodeScanner('suche')"
            >
              {{ barcodeSucheLaeuft ? 'Suche läuft' : 'Barcode suchen' }}
            </button>
          </div>
        </div>

        <p v-if="scannerMeldung !== ''" class="error-message scanner-meldung">
          {{ scannerMeldung }}
        </p>

        <div class="tools-panel">
          <label>
            Suche
            <input
              v-model="suchbegriff"
              placeholder="Suche nach Kleidung"
              type="search"
            />
          </label>

          <label>
            Kategorie
            <select v-model="kategorieFilter">
              <option value="">Alle</option>
              <option
                v-for="kategorie in kategorien"
                :key="kategorie"
                :value="kategorie"
              >
                {{ kategorie }}
              </option>
            </select>
          </label>

          <label>
            Größe
            <select v-model="groesseFilter">
              <option value="">Alle</option>
              <option
                v-for="groesse in groessen"
                :key="groesse"
                :value="groesse"
              >
                {{ groesse }}
              </option>
            </select>
          </label>

          <label>
            Lager
            <select v-model="lagerFilter">
              <option value="">Alle</option>
              <option
                v-for="lager in lagerPlaetze"
                :key="lager"
                :value="String(lager)"
              >
                Lager {{ lager }}
              </option>
            </select>
          </label>

          <label>
            Sortierung
            <select v-model="sortierung">
              <option value="bezeichnung">Bezeichnung</option>
              <option value="bestand">Bestand</option>
              <option value="lager">Lager</option>
              <option value="kategorie">Kategorie</option>
              <option value="groesse">Größe</option>
            </select>
          </label>

          <label>
            Ansicht
            <select v-model="ansicht">
              <option value="karten">Kartenansicht</option>
              <option value="tabelle">Tabellenansicht</option>
              <option value="kompakt">Kompaktansicht</option>
            </select>
          </label>
        </div>

        <div v-if="istTabellenAnsicht" class="tabellen-ansicht">
          <table>
            <thead>
              <tr>
                <th>Artikelnummer</th>
                <th>Bezeichnung</th>
                <th>Kategorie</th>
                <th>Größe</th>
                <th>Farbe</th>
                <th>Lager</th>
                <th>Bestand</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="teil in gefilterteKleidungsstuecke"
                :key="teil.id"
                :class="{
                  'niedriger-bestand-zeile':
                    teil.lagerbestand <= settingsState.lowStockThreshold,
                }"
              >
                <td>
                  <span
                    class="info-target"
                    title="Artikelnummer oder Barcode: Damit kann ein Kleidungsstück eindeutig erkannt werden."
                  >
                    {{ artikelnummer(teil) }}
                  </span>
                </td>
                <td>
                  <span
                    class="info-target"
                    title="Bezeichnung: Der Name des Kleidungsstücks."
                  >
                    {{ teil.bezeichnung }}
                  </span>
                </td>
                <td>
                  <span
                    :class="['kategorie-badge', kategorieClass(teil.kategorie)]"
                    title="Kategorie: Die Art des Kleidungsstücks."
                  >
                    {{ teil.kategorie }}
                  </span>
                </td>
                <td title="Größe: Die gespeicherte Kleidungsgröße.">{{ teil.size || '—' }}</td>
                <td title="Farbe: Die Farbe des Kleidungsstücks.">{{ teil.farbe }}</td>
                <td title="Lager: Der Lagerplatz dieses Artikels.">Lager {{ teil.lager }}</td>
                <td title="Bestand: So viele Stück sind aktuell vorhanden.">{{ teil.lagerbestand }} Stk.</td>
                <td>
                  <button type="button" @click="oeffneDetailseite(teil.id)">
                    Öffnen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <p v-if="gefilterteKleidungsstuecke.length === 0" class="empty-state">
            Keine passenden Kleidungsstücke gefunden.
          </p>
        </div>

        <div v-else class="liste">
          <article
            v-for="teil in gefilterteKleidungsstuecke"
            :key="teil.id"
            :class="[
              'kleidungsstueck',
              { 'niedriger-bestand': teil.lagerbestand <= settingsState.lowStockThreshold },
              { 'dunkelmodus-karte': settingsState.darkMode },
              {
                'dunkelmodus-niedriger-bestand':
                  settingsState.darkMode && teil.lagerbestand <= settingsState.lowStockThreshold,
              },
              { 'kompakt': istKompaktAnsicht },
              { 'geoeffnet': geoeffneteKarteId === teil.id },
            ]"
            @click="karteAnklicken(teil)"
          >
            <div class="item-main">
              <img
                v-if="teil.bild"
                :src="teil.bild"
                alt=""
                class="item-bild"
              />
              <span v-else class="item-icon">{{ teil.kategorie.charAt(0) }}</span>
              <div class="item-info">
                <div class="item-title">
                  <span
                    class="artikelnummer info-target"
                    title="Artikelnummer oder Barcode: Damit kann ein Kleidungsstück eindeutig erkannt werden."
                  >
                    {{ artikelnummer(teil) }}
                  </span>
                  <h3
                    class="info-target"
                    title="Bezeichnung: Der Name des Kleidungsstücks."
                  >
                    {{ teil.bezeichnung }}
                  </h3>
                  <span class="compact-stock">{{ teil.lagerbestand }} Stk.</span>
                  <span
                    v-if="teil.lagerbestand <= settingsState.lowStockThreshold"
                    class="warning-badge"
                  >
                    Niedriger Bestand
                  </span>
                </div>
                <p class="details">
                  <span
                    :class="['kategorie-badge', kategorieClass(teil.kategorie)]"
                    title="Kategorie: Die Art des Kleidungsstücks."
                  >
                    {{ teil.kategorie }}
                  </span>
                  <template v-if="teil.size">
                    <span class="detail-separator">·</span>
                    <span title="Größe: Die gespeicherte Kleidungsgröße.">Größe {{ teil.size }}</span>
                  </template>
                  <span class="detail-separator">·</span>
                  <span title="Farbe: Die Farbe des Kleidungsstücks.">{{ teil.farbe }}</span>
                  <span class="detail-separator">·</span>
                  <span title="Lager: Der Lagerplatz dieses Artikels.">Lager {{ teil.lager }}</span>
                </p>
              </div>
            </div>

            <span
              v-if="istKompaktAnsicht && geoeffneteKarteId !== teil.id"
              class="compact-hint"
            >
              Bearbeiten
            </span>

            <div
              v-if="!istKompaktAnsicht || geoeffneteKarteId === teil.id"
              class="aktionen"
              @click.stop
            >
              <div class="bestand-anzeige">
                <span>Aktuell</span>
                <strong>{{ teil.lagerbestand }} Stk.</strong>
              </div>

              <div class="stepper hover-control">
                <button type="button" @click="aendereBestand(teil.id, -10)">
                  -10
                </button>
                <button type="button" @click="aendereBestand(teil.id, -1)">
                  -1
                </button>
                <button type="button" @click="aendereBestand(teil.id, 1)">
                  +1
                </button>
                <button type="button" @click="aendereBestand(teil.id, 10)">
                  +10
                </button>
              </div>

              <label class="bestand-editor">
                Bestand
                <span class="number-field">
                  <input
                    v-model.number="bestandBearbeitung[teil.id]"
                    min="0"
                    type="number"
                    @blur="korrigiereBearbeitung(teil.id)"
                    @keydown="blockiereUngueltigeZahl"
                  />
                  <span class="number-buttons">
                    <button type="button" @click="aendereBestand(teil.id, 1)">▲</button>
                    <button type="button" @click="aendereBestand(teil.id, -1)">▼</button>
                  </span>
                </span>
              </label>

              <label class="lager-editor">
                Lager
                <span class="number-field">
                  <input
                    v-model.number="lagerBearbeitung[teil.id]"
                    min="1"
                    type="number"
                    @blur="korrigiereBearbeitung(teil.id)"
                    @keydown="blockiereUngueltigeZahl"
                  />
                  <span class="number-buttons">
                    <button type="button" @click="aendereLager(teil.id, 1)">▲</button>
                    <button type="button" @click="aendereLager(teil.id, -1)">▼</button>
                  </span>
                </span>
              </label>

              <button
                v-if="
                  bestandBearbeitung[teil.id] !== teil.lagerbestand
                    || lagerBearbeitung[teil.id] !== teil.lager
                "
                class="update-button hover-control"
                type="button"
                @click="updateKleidung(teil.id)"
              >
                Aktualisieren
              </button>

              <input
                :id="'bild-edit-' + teil.id"
                accept="image/*"
                class="bild-input"
                type="file"
                @change="bildBearbeiten($event, teil.id)"
              />

              <label class="small-upload-button hover-control" :for="'bild-edit-' + teil.id">
                Bild ändern
              </label>

              <button
                v-if="teil.bild"
                class="remove-image-button hover-control"
                type="button"
                @click="bildEntfernen(teil.id)"
              >
                Bild entfernen
              </button>

              <button
                class="detail-button hover-control"
                type="button"
                @click="oeffneDetailseite(teil.id)"
              >
                Details
              </button>

              <button
                class="delete-button"
                type="button"
                @click="frageLoeschen(teil.id)"
              >
                Löschen
              </button>
            </div>
          </article>

          <p v-if="gefilterteKleidungsstuecke.length === 0" class="empty-state">
            Keine passenden Kleidungsstücke gefunden.
          </p>
        </div>
      </div>
    </div>

    <div v-if="zuLoeschendeId !== null" class="modal-backdrop">
      <div class="modal">
        <h3>Löschen bestätigen</h3>
        <p>Möchtest du dieses Kleidungsstück wirklich löschen?</p>

        <div class="modal-actions">
          <button
            class="delete-button"
            type="button"
            @click="deleteKleidung"
          >
            Löschen
          </button>

          <button type="button" @click="abbrechenLoeschen">
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="detailKleidungsstueck !== null"
      :class="[
        'modal-backdrop',
        { 'dunkelmodus-backdrop': settingsState.darkMode },
      ]"
      @click="detailSchliessen"
    >
      <div
        :class="[
          'modal',
          'detail-modal',
          { 'dunkelmodus-modal': settingsState.darkMode },
        ]"
        @click.stop
      >
        <img
          v-if="detailKleidungsstueck.bild"
          :src="detailKleidungsstueck.bild"
          alt=""
          class="detail-bild"
        />
        <div v-else class="detail-bild detail-bild-placeholder">
          Kein Bild
        </div>

        <h3>{{ detailKleidungsstueck.bezeichnung }}</h3>

        <dl>
          <div>
            <dt>Kategorie</dt>
            <dd>{{ detailKleidungsstueck.kategorie }}</dd>
          </div>
          <div>
            <dt>Größe</dt>
            <dd>{{ detailKleidungsstueck.size }}</dd>
          </div>
          <div>
            <dt>Farbe</dt>
            <dd>{{ detailKleidungsstueck.farbe }}</dd>
          </div>
          <div>
            <dt>Lager</dt>
            <dd>{{ detailKleidungsstueck.lager }}</dd>
          </div>
          <div>
            <dt>Bestand</dt>
            <dd>{{ detailKleidungsstueck.lagerbestand }} Stk.</dd>
          </div>
        </dl>

        <div class="modal-actions">
          <button type="button" @click="detailSchliessen">
            Schließen
          </button>
        </div>
      </div>
    </div>

    <BarcodeScanner
      v-if="scannerModus !== null"
      @close="schliesseBarcodeScanner"
      @scan="barcodeErkannt"
    />
  </section>
</template>

<style scoped>
.kleidungs-liste {
  position: relative;
  display: grid;
  gap: 1rem;
  width: 100%;
}

.toast {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 30;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  box-shadow: var(--shadow);
  font-weight: 900;
}

.error-message {
  padding: 1rem;
  border: 1px solid rgba(195, 49, 38, 0.35);
  border-radius: 8px;
  background: rgba(195, 49, 38, 0.1);
  color: var(--danger);
  font-weight: 900;
}

.formular-fehler,
.feld-fehler {
  color: var(--danger);
  font-weight: 850;
}

.formular-fehler {
  padding: 0.75rem;
  border: 1px solid rgba(195, 49, 38, 0.35);
  border-radius: 8px;
  background: rgba(195, 49, 38, 0.08);
}

.feld-fehler {
  font-size: 0.78rem;
}

input[aria-invalid='true'],
select[aria-invalid='true'] {
  border-color: var(--danger);
  box-shadow: 0 0 0 2px rgba(195, 49, 38, 0.12);
}

.dashboard-warning {
  padding: 1rem;
  border: 1px solid rgba(217, 144, 47, 0.58);
  border-radius: 8px;
  background: rgba(255, 246, 229, 0.88);
  box-shadow: var(--shadow);
}

.dashboard-warning span {
  display: block;
  color: #8a5200;
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

.dashboard-warning strong {
  display: block;
  margin-top: 0.25rem;
  color: #10231d;
  font-size: 1.1rem;
  font-weight: 950;
}

.stats-grid,
.insights-grid,
.workspace-grid,
.tools-panel {
  display: grid;
  gap: 1rem;
}

.stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

.stats-grid article,
.insights-grid article,
.formular,
.listen-panel,
.verlauf-panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 16px 40px rgba(16, 35, 29, 0.08);
  backdrop-filter: blur(16px);
}

.stats-grid article {
  padding: 1rem;
}

.stats-grid span,
.insights-grid span,
.eyebrow {
  color: var(--accent-dark);
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

.stats-grid strong {
  display: block;
  margin-top: 0.2rem;
  color: var(--text);
  font-size: 2rem;
  font-weight: 950;
}

.insights-grid {
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  align-items: stretch;
}

.insights-grid article,
.verlauf-panel {
  padding: 1rem;
}

.insight-card {
  position: relative;
}

.insights-grid strong {
  display: block;
  margin-top: 0.25rem;
  color: var(--text);
  font-weight: 950;
}

.insight-tooltip {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: calc(100% + 0.55rem);
  z-index: 12;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-strong);
  color: var(--text);
  box-shadow: var(--shadow);
  font-size: 0.85rem;
  font-weight: 850;
  line-height: 1.45;
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.25rem);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.insight-card:hover .insight-tooltip,
.insight-card:focus-within .insight-tooltip {
  opacity: 1;
  transform: translateY(0);
}

.insights-grid button {
  align-self: stretch;
}

.tabellen-ansicht {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text);
}

th,
td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--line);
  text-align: left;
  white-space: nowrap;
}

th {
  color: var(--accent-dark);
  font-size: 0.76rem;
  font-weight: 950;
  text-transform: uppercase;
}

td {
  color: var(--text);
  font-weight: 800;
}

td button {
  min-height: 2.2rem;
  padding: 0 0.75rem;
}

.niedriger-bestand-zeile {
  background: rgba(217, 144, 47, 0.1);
}

.verlauf-liste {
  display: grid;
  gap: 0.45rem;
  max-height: 12rem;
  margin: 0;
  padding-left: 1.2rem;
  padding-right: 0.6rem;
  color: var(--muted);
  font-weight: 800;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.formular,
.listen-panel {
  padding: 1rem;
}

.form-head,
.list-head,
.tools-panel {
  margin-bottom: 1rem;
}

.list-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.list-head-actions,
.barcode-input-group {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.list-head-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.barcode-input-group input {
  min-width: 0;
  flex: 1 1 auto;
}

.barcode-input-group button,
.barcode-suche-button {
  min-height: 2.65rem;
  padding: 0 0.8rem;
  white-space: nowrap;
}

.barcode-suche-button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.scanner-meldung {
  margin-bottom: 1rem;
}

h2 {
  color: var(--text);
  font-size: clamp(1.45rem, 4vw, 2rem);
  font-weight: 950;
  line-height: 1.1;
}

.sync-badge,
.warning-badge {
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 950;
}

.sync-badge {
  background: var(--accent-soft);
  color: var(--accent-dark);
}

.warning-badge {
  background: rgba(217, 144, 47, 0.16);
  color: #8a5200;
}

.formular {
  display: grid;
  gap: 0.9rem;
}

.tools-panel {
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
}

label {
  display: grid;
  gap: 0.35rem;
  color: var(--text);
  font-weight: 850;
}

input,
select {
  width: 100%;
  min-height: 2.65rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text);
}

input[type='number'] {
  appearance: textfield;
  padding-right: 3rem;
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

input[type='file'] {
  padding: 0.5rem;
}

.number-field {
  position: relative;
  display: block;
}

.number-buttons {
  position: absolute;
  top: 50%;
  right: 0.45rem;
  display: grid;
  gap: 0.12rem;
  opacity: 0;
  transform: translateY(-50%) translateX(0.2rem);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.number-field:hover .number-buttons,
.number-field:focus-within .number-buttons {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.number-buttons button {
  display: grid;
  width: 1.45rem;
  height: 1rem;
  min-height: 0;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(71, 240, 170, 0.32);
  border-radius: 999px;
  background: rgba(71, 240, 170, 0.14);
  color: var(--accent-dark);
  font-size: 0.55rem;
  line-height: 1;
  box-shadow: none;
}

.number-buttons button:hover {
  background: var(--accent);
  color: #062019;
}

.bild-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.bild-bereich {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: end;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
}

.bild-vorschau {
  width: 7rem;
  height: 7rem;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
}

.bild-platzhalter {
  display: grid;
  width: 7rem;
  height: 7rem;
  place-items: center;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 900;
  text-align: center;
}

.bild-upload {
  position: relative;
  display: grid;
  gap: 0.35rem;
  align-self: stretch;
  align-content: start;
  padding-top: 0.35rem;
}

.bild-label {
  color: var(--text);
  font-weight: 850;
}

.bild-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.65rem;
  padding: 0 0.85rem;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  text-align: center;
}

.bild-dateiname {
  max-width: 100%;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

button {
  min-height: 2.8rem;
  border: 0;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
}

.liste {
  display: grid;
  gap: 0.75rem;
}

.empty-state {
  padding: 1rem;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.48);
  color: var(--muted);
  font-weight: 800;
}

.kleidungsstueck {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  min-height: 5.6rem;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.kleidungsstueck.niedriger-bestand {
  border-color: rgba(217, 144, 47, 0.55);
  background: rgba(255, 246, 229, 0.86);
}

.kleidungsstueck.dunkelmodus-karte {
  border-color: rgba(238, 248, 244, 0.2) !important;
  background: rgba(9, 28, 22, 0.96) !important;
}

.kleidungsstueck.dunkelmodus-niedriger-bestand {
  border-color: rgba(217, 144, 47, 0.62) !important;
  background: rgba(42, 32, 15, 0.96) !important;
}

.kleidungsstueck.dunkelmodus-niedriger-bestand .warning-badge {
  background: rgba(217, 144, 47, 0.18);
  color: #f6c46d;
}

.kleidungsstueck.kompakt {
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  min-height: auto;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
}

.kleidungsstueck.kompakt .item-main {
  align-items: center;
  flex: 1 1 auto;
  gap: 0.65rem;
}

.kleidungsstueck.kompakt .item-info {
  min-width: 0;
  flex: 1 1 auto;
}

.kleidungsstueck.kompakt .item-title {
  display: grid;
  grid-template-columns: auto minmax(7rem, 1fr) 5.25rem auto;
  width: 100%;
}

.kleidungsstueck.kompakt .item-icon {
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 6px;
  font-size: 0.78rem;
}

.kleidungsstueck.kompakt .item-bild {
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 6px;
}

.kleidungsstueck.kompakt h3 {
  font-size: 0.9rem;
  line-height: 1.2;
}

.kleidungsstueck.kompakt .details {
  gap: 0.32rem;
  margin-top: 0.18rem;
  font-size: 0.76rem;
  line-height: 1.45;
}

.kleidungsstueck.kompakt .aktionen {
  flex: 0 0 min(100%, 22rem);
  grid-template-columns: 3.8rem 1fr 4.5rem 4.5rem;
  gap: 0.25rem;
}

.kleidungsstueck.kompakt .compact-stock {
  display: inline-flex;
  justify-self: center;
  justify-content: center;
  min-width: 4.4rem;
  padding: 0.12rem 0.35rem;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-size: 0.68rem;
  font-weight: 950;
}

.compact-hint {
  flex: 0 0 auto;
  min-height: 2rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--accent);
  color: #062019;
  font-size: 0.72rem;
  font-weight: 950;
  opacity: 0;
  display: inline-flex;
  align-items: center;
  transition: opacity 0.18s ease;
}

.kleidungsstueck.kompakt:hover .compact-hint,
.kleidungsstueck.kompakt:focus-within .compact-hint {
  opacity: 1;
}

.kleidungsstueck.kompakt.geoeffnet {
  align-items: flex-start;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
  cursor: default;
}

.kleidungsstueck.kompakt.geoeffnet .aktionen {
  width: 100%;
  flex-basis: auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.kleidungsstueck.kompakt.geoeffnet .stepper {
  grid-column: span 2;
}

.kleidungsstueck.kompakt.geoeffnet .bestand-anzeige span {
  display: block;
}

.kleidungsstueck.kompakt .bestand-anzeige,
.kleidungsstueck.kompakt .stepper button,
.kleidungsstueck.kompakt .update-button,
.kleidungsstueck.kompakt .delete-button {
  min-height: 1.9rem;
  border-radius: 6px;
  font-size: 0.76rem;
}

.kleidungsstueck.kompakt .bestand-editor input,
.kleidungsstueck.kompakt .lager-editor input {
  min-height: 1.9rem;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
}

.kleidungsstueck.kompakt .bestand-editor,
.kleidungsstueck.kompakt .lager-editor {
  font-size: 0.68rem;
  gap: 0.12rem;
}

.kleidungsstueck.kompakt .bestand-anzeige {
  min-height: 1.9rem;
}

.kleidungsstueck.kompakt .bestand-anzeige span {
  display: none;
}

.kleidungsstueck.kompakt .bestand-anzeige strong {
  font-size: 0.82rem;
}

.kleidungsstueck.kompakt .stepper {
  grid-column: auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.2rem;
}

.kleidungsstueck.kompakt .stepper button {
  padding: 0 0.25rem;
}

.kleidungsstueck.kompakt .warning-badge {
  padding: 0.18rem 0.35rem;
  border-radius: 6px;
  font-size: 0.65rem;
}

.kleidungsstueck.kompakt .update-button,
.kleidungsstueck.kompakt .delete-button {
  padding: 0 0.45rem;
}

.item-main {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  min-width: 0;
}

.item-info {
  min-width: 0;
}

.item-icon {
  display: grid;
  flex: 0 0 auto;
  width: 2.4rem;
  height: 2.4rem;
  place-items: center;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  font-weight: 950;
}

.item-bild {
  flex: 0 0 auto;
  width: 3.2rem;
  height: 3.2rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
  object-fit: cover;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
  transform-origin: left center;
  z-index: 1;
}

.item-bild:hover {
  box-shadow: var(--shadow);
  transform: scale(3.2);
  z-index: 5;
}

.item-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 0.55rem;
  row-gap: 0.32rem;
}

.artikelnummer {
  padding: 0.12rem 0.42rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--accent-dark);
  font-size: 0.64rem;
  line-height: 1.2;
  font-weight: 950;
}

.info-target {
  cursor: help;
}

.kategorie-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 1.25rem;
  padding: 0.12rem 0.44rem;
  border-radius: 999px;
  color: #10231d;
  font-size: 0.68rem;
  line-height: 1.2;
  font-weight: 950;
}

.kategorie-hemd {
  background: #9ee7ff;
}

.kategorie-hose {
  background: #b8cdf8;
}

.kategorie-kleid {
  background: #ffc1dc;
}

.kategorie-jacke {
  background: #ffd89e;
}

.kategorie-schuhe {
  background: #c7f2a4;
}

.kategorie-accessoires {
  background: #d8c5ff;
}

.kategorie-sonstiges {
  background: #d8dedb;
}

.compact-stock {
  display: none;
}

.kleidungsstueck h3 {
  color: var(--text);
  font-size: 1.05rem;
  font-weight: 950;
}

.details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.25rem;
  color: var(--muted);
}

.detail-separator {
  color: var(--muted);
  font-weight: 850;
}

.aktionen {
  display: grid;
  flex: 0 0 min(100%, 25rem);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.hover-control {
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.25rem);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.kleidungsstueck:hover .hover-control,
.kleidungsstueck:focus-within .hover-control {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.bestand-anzeige {
  display: grid;
  align-content: center;
  min-height: 2.7rem;
}

.bestand-anzeige span {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 850;
}

.bestand-anzeige strong {
  color: var(--accent-dark);
  font-weight: 950;
  white-space: nowrap;
}

.stepper {
  display: grid;
  grid-column: span 2;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.35rem;
}

.stepper button {
  min-height: 2.7rem;
  padding: 0 0.45rem;
  background: rgba(16, 35, 29, 0.88);
}

.bestand-editor,
.lager-editor {
  font-size: 0.82rem;
}

.bestand-editor input,
.lager-editor input {
  min-height: 2.7rem;
}

.update-button,
.delete-button,
.detail-button,
.remove-image-button,
.small-upload-button {
  min-height: 2.7rem;
  padding: 0 0.85rem;
}

.update-button {
  background: var(--accent-dark);
}

.delete-button {
  background: var(--danger);
}

.detail-button,
.small-upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
}

.remove-image-button {
  background: #e5e7eb;
  color: #10231d;
}

:global(body.dark-mode) .kleidungsstueck,
:global(body.dark-mode) .bild-bereich,
:global(body.dark-mode) .tools-panel,
:global(body.dark-mode) .empty-state {
  border-color: rgba(238, 248, 244, 0.2);
  background: rgba(9, 28, 22, 0.96) !important;
}

:global(body.dark-mode) .bild-platzhalter {
  background: rgba(16, 35, 29, 0.88);
  color: #c4d4ce;
}

:global(body.dark-mode) .kleidungsstueck.niedriger-bestand {
  border-color: rgba(217, 144, 47, 0.62);
  background: rgba(42, 32, 15, 0.96) !important;
}

:global(body.dark-mode) .kleidungsstueck.niedriger-bestand .warning-badge {
  background: rgba(217, 144, 47, 0.18);
  color: #f6c46d;
}

:global(body.dark-mode) .compact-hint {
  border-color: rgba(94, 224, 178, 0.55);
  background: #5ee0b2;
  color: #062019;
}

:global(body.dark-mode) .remove-image-button {
  background: #d7dedb;
  color: #10231d;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(16, 35, 29, 0.48);
  backdrop-filter: blur(6px);
}

.modal {
  width: min(100%, 24rem);
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--shadow);
}

.modal h3 {
  margin-bottom: 0.5rem;
  color: var(--text);
  font-weight: 950;
}

.modal p {
  color: var(--muted);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.modal-actions button {
  width: 7rem;
  min-height: 2.8rem;
}

.detail-modal {
  display: grid;
  gap: 1rem;
}

.detail-bild {
  width: 100%;
  max-height: 18rem;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.detail-bild-placeholder {
  display: grid;
  min-height: 10rem;
  place-items: center;
  background: rgba(255, 255, 255, 0.52);
  color: var(--muted);
  font-weight: 900;
}

.detail-modal dl {
  display: grid;
  gap: 0.6rem;
}

.detail-modal dl div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid var(--line);
}

.detail-modal dt {
  color: var(--muted);
  font-weight: 850;
}

.detail-modal dd {
  color: var(--text);
  font-weight: 950;
}

.modal.dunkelmodus-modal {
  border-color: rgba(238, 248, 244, 0.22);
  background: rgba(9, 28, 22, 0.98);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
}

.modal.dunkelmodus-modal h3 {
  color: #eef8f4;
}

.modal.dunkelmodus-modal .detail-bild {
  border-color: rgba(238, 248, 244, 0.18);
}

.modal.dunkelmodus-modal .detail-bild-placeholder {
  background: rgba(5, 18, 14, 0.92);
  color: #9fb3ac;
}

.modal.dunkelmodus-modal dl div {
  border-bottom-color: rgba(238, 248, 244, 0.16);
}

.modal.dunkelmodus-modal dt {
  color: #9fb3ac;
}

.modal.dunkelmodus-modal dd {
  color: #eef8f4;
}

.modal-backdrop.dunkelmodus-backdrop {
  background: rgba(0, 8, 6, 0.68);
}

.insight-card.dunkelmodus-insight .insight-tooltip {
  border-color: rgba(238, 248, 244, 0.22);
  background: rgba(5, 18, 14, 0.98);
  color: #eef8f4;
}

:global(body.dark-mode) .dashboard-warning {
  border-color: rgba(217, 144, 47, 0.62);
  background: rgba(42, 32, 15, 0.96);
}

:global(body.dark-mode) .dashboard-warning span {
  color: #f6c46d;
}

:global(body.dark-mode) .dashboard-warning strong {
  color: #eef8f4;
}

:global(body.dark-mode) table {
  color: #eef8f4;
}

:global(body.dark-mode) th,
:global(body.dark-mode) td {
  border-bottom-color: rgba(238, 248, 244, 0.16);
}

:global(body.dark-mode) td {
  color: #eef8f4;
}

:global(body.dark-mode) .artikelnummer {
  border-color: rgba(238, 248, 244, 0.22);
  color: #5ee0b2;
}

@media (min-width: 980px) {
  .workspace-grid {
    grid-template-columns: minmax(17rem, 0.8fr) minmax(0, 1.35fr);
    align-items: start;
  }
}

@media (min-width: 1120px) {
  .kleidungsstueck {
    align-items: center;
  }
}

@media (max-width: 860px) {
  .kleidungsstueck {
    flex-direction: column;
  }

  .aktionen {
    width: 100%;
    flex-basis: auto;
  }
}

@media (max-width: 520px) {
  .aktionen {
    grid-template-columns: 1fr;
  }

  .stepper {
    grid-column: span 1;
  }

  .bild-bereich {
    grid-template-columns: 1fr;
  }

  .bild-vorschau,
  .bild-platzhalter {
    width: 100%;
  }
}
</style>
