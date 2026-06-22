<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  groessenFuerKategorie,
  standardgroesseFuerKategorie,
} from '../groessen'
import { settingsState } from '../settings'
import { validiereKleidungsFormular, type Feldfehler } from '../formularValidierung'

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

type VerlaufsEintrag = {
  id: number
  text: string
}

type ApiFehler = {
  meldung?: string
  feldfehler?: Feldfehler
}

const route = useRoute()
const router = useRouter()

const kleidungsstueck = ref<Kleidungsstueck | null>(null)
const artikelnummerBearbeitung = ref('')
const bezeichnung = ref('')
const size = ref('M')
const kategorie = ref('HEMD')
const farbe = ref('')
const bestand = ref(0)
const lager = ref(1)
const bild = ref('')
const ausgewaehlterBildname = ref('')
const ladeFehler = ref('')
const erfolgsmeldung = ref('')
const bearbeitungsmodus = ref(false)
const bestandsverlauf = ref<VerlaufsEintrag[]>([])
const verlaufListe = ref<HTMLUListElement | null>(null)
const bearbeitungsFehler = ref('')
const feldfehler = ref<Feldfehler>({})
const verlaufStorageKey = 'kleidungslager-bestandsverlauf'

const groessenOptionen = computed(() => {
  return groessenFuerKategorie(kategorie.value)
})

const angezeigteArtikelnummer = computed(() => {
  if (kleidungsstueck.value === null) {
    return ''
  }

  if (
    typeof kleidungsstueck.value.artikelnummer === 'string'
    && kleidungsstueck.value.artikelnummer.trim() !== ''
  ) {
    return kleidungsstueck.value.artikelnummer
  }

  return 'KL-' + String(kleidungsstueck.value.id).padStart(4, '0')
})

const aktivitaetenZumArtikel = computed(() => {
  if (kleidungsstueck.value === null) {
    return []
  }

  return bestandsverlauf.value.filter((eintrag) => {
    return eintrag.text.includes(kleidungsstueck.value?.bezeichnung ?? '')
  })
})

function getKleidungEndpoint(): string {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL

  return baseUrl + '/api/kleidung'
}

function ladeVerlauf(): void {
  const gespeicherterVerlauf = localStorage.getItem(verlaufStorageKey)

  if (gespeicherterVerlauf !== null) {
    bestandsverlauf.value = JSON.parse(gespeicherterVerlauf)
    bestandsverlauf.value.sort((a, b) => a.id - b.id)
    void scrolleZumNeuestenEintrag()
  }
}

async function scrolleZumNeuestenEintrag(): Promise<void> {
  await nextTick()

  if (verlaufListe.value !== null) {
    verlaufListe.value.scrollTop = verlaufListe.value.scrollHeight
  }
}

function setzeBearbeitungsfelder(teil: Kleidungsstueck): void {
  artikelnummerBearbeitung.value = teil.artikelnummer ?? ''
  bezeichnung.value = teil.bezeichnung
  size.value = teil.size
  kategorie.value = teil.kategorie
  farbe.value = teil.farbe
  bestand.value = teil.lagerbestand
  lager.value = teil.lager
  bild.value = teil.bild ?? ''
}

function fuegeVerlaufHinzu(text: string): void {
  const datum = new Date().toLocaleDateString('de-DE')
  const naechsteId =
    Math.max(0, ...bestandsverlauf.value.map((eintrag) => eintrag.id)) + 1

  bestandsverlauf.value.push({
    id: naechsteId,
    text: datum + ': ' + text,
  })

  bestandsverlauf.value = bestandsverlauf.value.slice(-100)
  localStorage.setItem(verlaufStorageKey, JSON.stringify(bestandsverlauf.value))
  void scrolleZumNeuestenEintrag()
}

function bildnameInKlammern(dateiname: string): string {
  if (dateiname.trim() === '') {
    return ''
  }

  return ' (' + dateiname + ')'
}

function ladeKleidungsstueck(): void {
  const id = Number(route.params.id)

  axios
    .get<Kleidungsstueck[]>(getKleidungEndpoint())
    .then((response) => {
      if (!Array.isArray(response.data)) {
        ladeFehler.value = 'Kleidungsdaten konnten nicht gelesen werden.'
        return
      }

      const gefundenesTeil = response.data.find((teil) => {
        return teil.id === id
      })

      if (gefundenesTeil === undefined) {
        ladeFehler.value = 'Kleidungsstück wurde nicht gefunden.'
        return
      }

      kleidungsstueck.value = gefundenesTeil
      setzeBearbeitungsfelder(gefundenesTeil)
    })
    .catch((error) => {
      console.log(error)
      ladeFehler.value = 'Backend konnte nicht erreicht werden.'
    })
}

function aktualisieren(): void {
  if (kleidungsstueck.value === null) {
    return
  }

  bearbeitungsFehler.value = ''
  feldfehler.value = validiereKleidungsFormular({
    artikelnummer: artikelnummerBearbeitung.value,
    bezeichnung: bezeichnung.value,
    size: size.value,
    lager: lager.value,
    kategorie: kategorie.value,
    farbe: farbe.value,
    lagerbestand: bestand.value,
  })

  if (Object.keys(feldfehler.value).length > 0) {
    bearbeitungsFehler.value = 'Bitte korrigiere die markierten Eingaben.'
    return
  }

  const altesTeil = kleidungsstueck.value
  const bildname = ausgewaehlterBildname.value
  const endpoint =
    getKleidungEndpoint() + '/' + altesTeil.id + '/bestand'

  axios
    .put<Kleidungsstueck>(endpoint, {
      bezeichnung: bezeichnung.value,
      size: size.value,
      kategorie: kategorie.value,
      farbe: farbe.value,
      lagerbestand: bestand.value,
      lager: lager.value,
      bild: bild.value,
      artikelnummer: artikelnummerBearbeitung.value,
    })
    .then((response) => {
      kleidungsstueck.value = response.data
      setzeBearbeitungsfelder(response.data)
      bearbeitungsmodus.value = false
      erfolgsmeldung.value = 'Kleidungsstück aktualisiert.'

      if (altesTeil.lagerbestand !== response.data.lagerbestand) {
        fuegeVerlaufHinzu(
          'Bestand geändert: '
            + response.data.bezeichnung
            + ' von '
            + altesTeil.lagerbestand
            + ' auf '
            + response.data.lagerbestand
        )
      }

      if (altesTeil.lager !== response.data.lager) {
        fuegeVerlaufHinzu(
          'Lager geändert: '
            + response.data.bezeichnung
            + ' von Lager '
            + altesTeil.lager
            + ' auf Lager '
            + response.data.lager
        )
      }

      if ((altesTeil.bild ?? '') !== (response.data.bild ?? '')) {
        if ((altesTeil.bild ?? '') === '') {
          fuegeVerlaufHinzu(
            'Bild eingefügt: '
              + response.data.bezeichnung
              + bildnameInKlammern(bildname)
          )
        } else if ((response.data.bild ?? '') === '') {
          fuegeVerlaufHinzu('Bild entfernt: ' + response.data.bezeichnung)
        } else {
          fuegeVerlaufHinzu(
            'Bild geändert: '
              + response.data.bezeichnung
              + bildnameInKlammern(bildname)
          )
        }
      }
      ausgewaehlterBildname.value = ''
    })
    .catch((error) => {
      console.log(error)
      const apiFehler = axios.isAxiosError<ApiFehler>(error)
        ? error.response?.data
        : undefined

      feldfehler.value = apiFehler?.feldfehler ?? {}
      bearbeitungsFehler.value =
        apiFehler?.meldung ?? 'Die Änderungen konnten nicht gespeichert werden.'
    })
}

function bearbeitenStarten(): void {
  if (kleidungsstueck.value === null) {
    return
  }

  setzeBearbeitungsfelder(kleidungsstueck.value)
  ausgewaehlterBildname.value = ''
  erfolgsmeldung.value = ''
  bearbeitungsFehler.value = ''
  feldfehler.value = {}
  bearbeitungsmodus.value = true
}

function bearbeitenAbbrechen(): void {
  if (kleidungsstueck.value !== null) {
    setzeBearbeitungsfelder(kleidungsstueck.value)
  }

  ausgewaehlterBildname.value = ''
  bearbeitungsmodus.value = false
  bearbeitungsFehler.value = ''
  feldfehler.value = {}
}

function detailKategorieGeaendert(): void {
  size.value = standardgroesseFuerKategorie(kategorie.value)
}

function bildBearbeiten(event: Event): void {
  const input = event.target as HTMLInputElement
  const bildDatei = input.files?.[0]

  if (bildDatei === undefined || kleidungsstueck.value === null) {
    return
  }

  const reader = new FileReader()
  ausgewaehlterBildname.value = bildDatei.name

  reader.addEventListener('load', () => {
    bild.value = String(reader.result)
    input.value = ''
  })

  reader.readAsDataURL(bildDatei)
}

function bildEntfernen(): void {
  if (kleidungsstueck.value === null) {
    return
  }

  bild.value = ''
  fuegeVerlaufHinzu('Bild entfernt: ' + kleidungsstueck.value.bezeichnung)
  aktualisieren()
}

function loeschen(): void {
  if (kleidungsstueck.value === null) {
    return
  }

  const geloeschterName = kleidungsstueck.value.bezeichnung

  axios
    .delete(getKleidungEndpoint() + '/' + kleidungsstueck.value.id)
    .then(() => {
      fuegeVerlaufHinzu('Artikel gelöscht: ' + geloeschterName)
      router.push('/dashboard')
    })
    .catch((error) => {
      console.log(error)
    })
}

function zurueck(): void {
  router.push('/dashboard')
}

onMounted(() => {
  ladeVerlauf()
  ladeKleidungsstueck()
})
</script>

<template>
  <main class="detail-view">
    <button class="back-button" type="button" @click="zurueck">
      Zurück
    </button>

    <p v-if="ladeFehler !== ''" class="error-message">
      {{ ladeFehler }}
    </p>

    <section
      v-if="kleidungsstueck !== null"
      :class="[
        'detail-page',
        { 'dunkelmodus-detail': settingsState.darkMode },
      ]"
    >
      <div class="detail-media">
        <img
          v-if="bild !== ''"
          :src="bild"
          alt=""
        />
        <div v-else>
          Kein Bild
        </div>
      </div>

      <div class="detail-content">
        <p
          class="eyebrow info-target"
          title="Artikelnummer oder Barcode: Damit kann ein Kleidungsstück eindeutig erkannt werden."
        >
          {{ angezeigteArtikelnummer }}
        </p>
        <h1
          class="info-target"
          title="Bezeichnung: Der Name des Kleidungsstücks."
        >
          {{ bezeichnung }}
        </h1>

        <div class="meta-grid">
          <span title="Kategorie: Die Art des Kleidungsstücks.">{{ kategorie }}</span>
          <span v-if="size" title="Größe: Die gespeicherte Kleidungsgröße.">Größe {{ size }}</span>
          <span title="Farbe: Die Farbe des Kleidungsstücks.">{{ farbe }}</span>
          <span title="Lager: Der Lagerplatz dieses Artikels.">Lager {{ lager }}</span>
          <span title="Bestand: So viele Stück sind aktuell vorhanden.">{{ bestand }} Stk.</span>
        </div>

        <div v-if="!bearbeitungsmodus" class="view-actions">
          <button type="button" @click="bearbeitenStarten">
            Bearbeiten
          </button>

          <button class="delete-button" type="button" @click="loeschen">
            Löschen
          </button>
        </div>

        <p v-if="bearbeitungsFehler !== ''" class="error-message edit-error">
          {{ bearbeitungsFehler }}
        </p>

        <div v-if="bearbeitungsmodus" class="edit-grid">
          <label>
            Artikelnummer / Barcode
            <input
              v-model="artikelnummerBearbeitung"
              :aria-invalid="feldfehler.artikelnummer !== undefined"
              maxlength="100"
              placeholder="Optional"
              title="Optional: Eigene Artikelnummer oder Barcode. Leer lassen ist erlaubt."
            />
            <span v-if="feldfehler.artikelnummer" class="feld-fehler">
              {{ feldfehler.artikelnummer }}
            </span>
          </label>

          <label>
            Bezeichnung
            <input
              v-model="bezeichnung"
              :aria-invalid="feldfehler.bezeichnung !== undefined"
              maxlength="100"
              required
              title="Bezeichnung: Der Name des Kleidungsstücks."
            />
            <span v-if="feldfehler.bezeichnung" class="feld-fehler">
              {{ feldfehler.bezeichnung }}
            </span>
          </label>

          <label>
            Größe
            <select
              v-model="size"
              title="Größe: Die gespeicherte Kleidungsgröße."
            >
              <option value="">Keine Größe</option>
              <option
                v-for="groesse in groessenOptionen"
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
              v-model="kategorie"
              title="Kategorie: Die Art des Kleidungsstücks."
              @change="detailKategorieGeaendert"
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
              v-model="farbe"
              :aria-invalid="feldfehler.farbe !== undefined"
              maxlength="50"
              required
              title="Farbe: Die Farbe des Kleidungsstücks."
            />
            <span v-if="feldfehler.farbe" class="feld-fehler">
              {{ feldfehler.farbe }}
            </span>
          </label>

          <label>
            Bestand
            <input
              v-model.number="bestand"
              :aria-invalid="feldfehler.lagerbestand !== undefined"
              min="0"
              title="Bestand: So viele Stück sind aktuell vorhanden."
              type="number"
            />
            <span v-if="feldfehler.lagerbestand" class="feld-fehler">
              {{ feldfehler.lagerbestand }}
            </span>
          </label>

          <label>
            Lager
            <input
              v-model.number="lager"
              :aria-invalid="feldfehler.lager !== undefined"
              min="1"
              title="Lager: Der Lagerplatz dieses Artikels."
              type="number"
            />
            <span v-if="feldfehler.lager" class="feld-fehler">
              {{ feldfehler.lager }}
            </span>
          </label>
        </div>

        <div v-if="bearbeitungsmodus" class="action-grid">
          <button class="update-action" type="button" @click="aktualisieren">
            Aktualisieren
          </button>

          <button
            class="remove-button cancel-action"
            type="button"
            @click="bearbeitenAbbrechen"
          >
            Abbrechen
          </button>

          <label class="upload-button image-action">
            {{ bild === '' ? 'Bild einfügen' : 'Bild ändern' }}
            <input accept="image/*" type="file" @change="bildBearbeiten" />
          </label>

          <button
            v-if="bild !== ''"
            class="remove-button remove-image-action"
            type="button"
            @click="bildEntfernen"
          >
            Bild entfernen
          </button>

          <button
            class="delete-button delete-action"
            type="button"
            @click="loeschen"
          >
            Löschen
          </button>
        </div>

        <p v-if="erfolgsmeldung !== ''" class="success-message">
          {{ erfolgsmeldung }}
        </p>
      </div>
    </section>

    <section
      :class="[
        'activity-panel',
        { 'dunkelmodus-activity': settingsState.darkMode },
      ]"
    >
      <p class="eyebrow">Aktivitätsprotokoll</p>
      <h2>Dieser Artikel</h2>
      <p class="activity-help">
        Hier werden Änderungen zu diesem Kleidungsstück gesammelt, zum Beispiel
        wenn Bestand, Lager oder Bild geändert werden.
      </p>

      <ul
        v-if="aktivitaetenZumArtikel.length > 0"
        ref="verlaufListe"
        class="activity-list"
      >
        <li v-for="eintrag in aktivitaetenZumArtikel" :key="eintrag.id">
          {{ eintrag.text }}
        </li>
      </ul>

      <p v-else>
        Noch keine Aktivitäten zu diesem Artikel gespeichert.
      </p>
    </section>
  </main>
</template>

<style scoped>
.detail-view {
  display: grid;
  gap: 1rem;
}

.back-button {
  width: fit-content;
  min-height: 2.6rem;
  padding: 0 1rem;
  border: 0;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
}

.detail-page,
.activity-panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px);
}

.detail-page {
  display: grid;
  gap: 1.25rem;
  padding: 1rem;
}

.detail-media img,
.detail-media div {
  width: 100%;
  min-height: 18rem;
  max-height: 28rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  object-fit: cover;
}

.detail-media img {
  background: #ffffff;
}

.detail-media div {
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 900;
}

.detail-content {
  display: grid;
  align-content: start;
  gap: 1rem;
  min-width: 0;
}

.eyebrow {
  color: var(--accent-dark);
  font-size: 0.8rem;
  font-weight: 900;
  text-transform: uppercase;
}

h1,
h2 {
  color: var(--text);
  font-weight: 950;
  line-height: 1.05;
}

h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
}

.info-target {
  cursor: help;
}

.meta-grid,
.edit-grid,
.action-grid,
.view-actions {
  display: grid;
  gap: 0.75rem;
}

.meta-grid {
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
}

.meta-grid span {
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  font-weight: 850;
}

.edit-grid {
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
}

label {
  display: grid;
  gap: 0.35rem;
  color: var(--text);
  font-weight: 850;
  min-width: 0;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  min-height: 2.65rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text);
  font: inherit;
}

.action-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-areas:
    "update image remove"
    ". cancel delete";
}

.update-action {
  grid-area: update;
}

.image-action {
  grid-area: image;
}

.remove-image-action {
  grid-area: remove;
}

.cancel-action {
  grid-area: cancel;
}

.delete-action {
  grid-area: delete;
}

.action-grid button,
.upload-button,
.view-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  border: 0;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
}

.view-actions {
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  max-width: 22rem;
}

.upload-button input {
  display: none;
}

.remove-button {
  background: #e5e7eb !important;
  color: #10231d !important;
}

.delete-button {
  background: var(--danger) !important;
}

.success-message,
.error-message {
  padding: 1rem;
  border-radius: 8px;
  font-weight: 900;
}

.edit-error {
  margin-top: 1rem;
}

.feld-fehler {
  color: var(--danger);
  font-size: 0.78rem;
  font-weight: 850;
}

input[aria-invalid='true'],
select[aria-invalid='true'] {
  border-color: var(--danger);
  box-shadow: 0 0 0 2px rgba(195, 49, 38, 0.12);
}

.success-message {
  background: var(--accent-soft);
  color: var(--accent-dark);
}

.error-message {
  border: 1px solid rgba(195, 49, 38, 0.35);
  background: rgba(195, 49, 38, 0.1);
  color: var(--danger);
}

.activity-panel {
  padding: 1rem;
}

.activity-list {
  display: grid;
  gap: 0.45rem;
  max-height: 12rem;
  margin-top: 0.75rem;
  padding-left: 1.2rem;
  padding-right: 0.6rem;
  color: var(--muted);
  font-weight: 800;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.activity-panel p:last-child {
  margin-top: 0.75rem;
  color: var(--muted);
  font-weight: 800;
}

.activity-help {
  margin-top: 0.45rem;
  color: var(--muted);
  font-weight: 800;
  line-height: 1.45;
}

.detail-page.dunkelmodus-detail,
.activity-panel.dunkelmodus-activity {
  border-color: rgba(238, 248, 244, 0.22);
  background: rgba(9, 28, 22, 0.96);
}

.detail-page.dunkelmodus-detail .detail-media div,
.detail-page.dunkelmodus-detail .meta-grid span {
  border-color: rgba(238, 248, 244, 0.18);
  background: rgba(5, 18, 14, 0.92);
}

.detail-page.dunkelmodus-detail input,
.detail-page.dunkelmodus-detail select {
  border-color: rgba(238, 248, 244, 0.28);
  background: #10231d;
  color: #eef8f4;
}

@media (min-width: 860px) {
  .detail-page {
    grid-template-columns: minmax(18rem, 0.9fr) minmax(24rem, 1.1fr);
  }
}

@media (max-width: 700px) {
  .action-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "update"
      "image"
      "remove"
      "cancel"
      "delete";
  }
}
</style>
