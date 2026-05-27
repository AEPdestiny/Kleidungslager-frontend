<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { settingsState } from '../settings'

type Kleidungsstueck = {
  id: number
  bezeichnung: string
  size: string
  lager: number
  kategorie: string
  farbe: string
  lagerbestand: number
  bild: string
}

type NeuesKleidungsstueck = {
  bezeichnung: string
  size: string
  lager: number
  kategorie: string
  farbe: string
  lagerbestand: number
  bild: string
}

const kleidungsstuecke =
  ref<Kleidungsstueck[]>([])

const bestandBearbeitung =
  ref<Record<number, number>>({})

const lagerBearbeitung =
  ref<Record<number, number>>({})

const zuLoeschendeId =
  ref<number | null>(null)

const suchbegriff = ref('')
const kategorieFilter = ref('')
const groesseFilter = ref('')
const lagerFilter = ref('')
const sortierung = ref(settingsState.defaultSort)
const erfolgsmeldung = ref('')
const geoeffneteKarteId =
  ref<number | null>(null)
const bildInput =
  ref<HTMLInputElement | null>(null)
const bildDateiname = ref('')

let erfolgsTimeout: number | undefined

const neuesKleidungsstueck = ref<NeuesKleidungsstueck>({
  bezeichnung: '',
  size: 'M',
  lager: 1,
  kategorie: 'HEMD',
  farbe: '',
  lagerbestand: 1,
  bild: '',
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

const kategorien = computed(() => {
  return [...new Set(kleidungsstuecke.value.map((teil) => {
    return teil.kategorie
  }))].sort()
})

const groessen = computed(() => {
  return [...new Set(kleidungsstuecke.value.map((teil) => {
    return teil.size
  }))].sort()
})

const lagerPlaetze = computed(() => {
  return [...new Set(kleidungsstuecke.value.map((teil) => {
    return teil.lager
  }))].sort((a, b) => {
    return a - b
  })
})

const gefilterteKleidungsstuecke = computed(() => {
  const suche = suchbegriff.value.trim().toLowerCase()

  const gefiltert = kleidungsstuecke.value.filter((teil) => {
    const suchText = [
      teil.bezeichnung,
      teil.kategorie,
      teil.size,
      teil.farbe,
      'lager ' + teil.lager,
      String(teil.lager),
    ].join(' ').toLowerCase()

    const passtZurSuche =
      suche === '' || suchText.includes(suche)

    const passtZurKategorie =
      kategorieFilter.value === '' || teil.kategorie === kategorieFilter.value

    const passtZurGroesse =
      groesseFilter.value === '' || teil.size === groesseFilter.value

    const passtZumLager =
      lagerFilter.value === '' || String(teil.lager) === lagerFilter.value

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

    return a.bezeichnung.localeCompare(b.bezeichnung)
  })
})

function getKleidungEndpoint(): string {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL

  return baseUrl + '/api/kleidung'
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

function setzeBearbeitung(): void {
  const neueBestaende: Record<number, number> = {}
  const neueLager: Record<number, number> = {}

  kleidungsstuecke.value.forEach((teil) => {
    neueBestaende[teil.id] = teil.lagerbestand
    neueLager[teil.id] = teil.lager
  })

  bestandBearbeitung.value = neueBestaende
  lagerBearbeitung.value = neueLager
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
}

function requestKleidung(): void {
  axios
    .get<Kleidungsstueck[]>(getKleidungEndpoint())
    .then((response) => {
      kleidungsstuecke.value = response.data
      setzeBearbeitung()
    })
    .catch((error) => {
      console.log(error)
    })
}

function createKleidung(): void {
  axios
    .post<Kleidungsstueck>(
      getKleidungEndpoint(),
      neuesKleidungsstueck.value,
    )
    .then((response) => {
      ersetzeOderFuegeHinzu(response.data)
      zeigeErfolg('Kleidungsstück gespeichert.')

      neuesKleidungsstueck.value = {
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
    })
}

function aendereBestand(id: number, veraenderung: number): void {
  const aktuellerBestand = bestandBearbeitung.value[id] ?? 0
  const neuerBestand = aktuellerBestand + veraenderung

  bestandBearbeitung.value[id] = Math.max(0, neuerBestand)
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

function karteUmschalten(id: number): void {
  if (!settingsState.compactList) {
    return
  }

  if (geoeffneteKarteId.value === id) {
    geoeffneteKarteId.value = null
  } else {
    geoeffneteKarteId.value = id
  }
}

function updateKleidung(id: number): void {
  const endpoint = getKleidungEndpoint() + '/' + id + '/bestand'

  axios
    .put<Kleidungsstueck>(endpoint, {
      lagerbestand: bestandBearbeitung.value[id],
      lager: lagerBearbeitung.value[id],
    })
    .then((response) => {
      ersetzeOderFuegeHinzu(response.data)
      zeigeErfolg('Kleidungsstück aktualisiert.')
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

  axios
    .delete(endpoint)
    .then(() => {
      kleidungsstuecke.value =
        kleidungsstuecke.value.filter((teil) => {
          return teil.id !== id
        })
      delete bestandBearbeitung.value[id]
      delete lagerBearbeitung.value[id]
      zuLoeschendeId.value = null
      zeigeErfolg('Kleidungsstück gelöscht.')
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

onMounted(() => {
  requestKleidung()
})
</script>

<template>
  <section class="kleidungs-liste">
    <div v-if="erfolgsmeldung !== ''" class="toast">
      {{ erfolgsmeldung }}
    </div>

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
    </div>

    <div class="workspace-grid">
      <form class="formular" @submit.prevent="createKleidung">
        <div class="form-head">
          <p class="eyebrow">Neuer Eintrag</p>
          <h2>Kleidungsstück speichern</h2>
        </div>

        <label>
          Bezeichnung
          <input v-model="neuesKleidungsstueck.bezeichnung" required />
        </label>

        <label>
          Größe
          <select v-model="neuesKleidungsstueck.size">
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="XXL">XXL</option>
            <option value="XXXL">XXXL</option>
          </select>
        </label>

        <label>
          Kategorie
          <select v-model="neuesKleidungsstueck.kategorie">
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
          <input v-model="neuesKleidungsstueck.farbe" required />
        </label>

        <label>
          Lager
          <input
            v-model.number="neuesKleidungsstueck.lager"
            min="1"
            required
            type="number"
          />
        </label>

        <label>
          Bestand
          <input
            v-model.number="neuesKleidungsstueck.lagerbestand"
            min="0"
            required
            type="number"
          />
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
          <span v-if="settingsState.showApiBadge" class="sync-badge">API</span>
        </div>

        <div class="tools-panel">
          <label>
            Suche
            <input
              v-model="suchbegriff"
              placeholder="Pullover, Schwarz oder Lager 1"
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
            </select>
          </label>
        </div>

        <div class="liste">
          <article
            v-for="teil in gefilterteKleidungsstuecke"
            :key="teil.id"
            :class="[
              'kleidungsstueck',
              { 'niedriger-bestand': teil.lagerbestand <= settingsState.lowStockThreshold },
              { 'kompakt': settingsState.compactList },
              { 'geoeffnet': geoeffneteKarteId === teil.id },
            ]"
            @click="karteUmschalten(teil.id)"
          >
            <div class="item-main">
              <img
                v-if="teil.bild"
                :src="teil.bild"
                alt=""
                class="item-bild"
              />
              <span v-else class="item-icon">{{ teil.kategorie.charAt(0) }}</span>
              <div>
                <div class="item-title">
                  <h3>{{ teil.bezeichnung }}</h3>
                  <span class="compact-stock">{{ teil.lagerbestand }} Stk.</span>
                  <span
                    v-if="teil.lagerbestand <= settingsState.lowStockThreshold"
                    class="warning-badge"
                  >
                    Niedriger Bestand
                  </span>
                </div>
                <p class="details">
                  <span>{{ teil.kategorie }}</span>
                  <span>Größe {{ teil.size }}</span>
                  <span>{{ teil.farbe }}</span>
                  <span>Lager {{ teil.lager }}</span>
                </p>
              </div>
            </div>

            <span
              v-if="settingsState.compactList && geoeffneteKarteId !== teil.id"
              class="compact-hint"
            >
              Bearbeiten
            </span>

            <div
              v-if="!settingsState.compactList || geoeffneteKarteId === teil.id"
              class="aktionen"
              @click.stop
            >
              <div class="bestand-anzeige">
                <span>Aktuell</span>
                <strong>{{ teil.lagerbestand }} Stk.</strong>
              </div>

              <div class="stepper">
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
                <input
                  v-model.number="bestandBearbeitung[teil.id]"
                  min="0"
                  type="number"
                />
              </label>

              <label class="lager-editor">
                Lager
                <input
                  v-model.number="lagerBearbeitung[teil.id]"
                  min="1"
                  type="number"
                />
              </label>

              <button
                v-if="
                  bestandBearbeitung[teil.id] !== teil.lagerbestand
                    || lagerBearbeitung[teil.id] !== teil.lager
                "
                class="update-button"
                type="button"
                @click="updateKleidung(teil.id)"
              >
                Aktualisieren
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

.stats-grid,
.workspace-grid,
.tools-panel {
  display: grid;
  gap: 1rem;
}

.stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

.stats-grid article,
.formular,
.listen-panel {
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

input[type='file'] {
  padding: 0.5rem;
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

.kleidungsstueck.kompakt {
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  min-height: auto;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
}

.kleidungsstueck.kompakt .item-main {
  align-items: center;
  gap: 0.45rem;
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
  line-height: 1.1;
}

.kleidungsstueck.kompakt .details {
  gap: 0.18rem;
  margin-top: 0;
  font-size: 0.76rem;
  line-height: 1.25;
}

.kleidungsstueck.kompakt .aktionen {
  flex: 0 0 min(100%, 22rem);
  grid-template-columns: 3.8rem 1fr 4.5rem 4.5rem;
  gap: 0.25rem;
}

.kleidungsstueck.kompakt .compact-stock {
  display: inline-flex;
  padding: 0.12rem 0.35rem;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-size: 0.68rem;
  font-weight: 950;
}

.compact-hint {
  flex: 0 0 auto;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--accent-dark);
  font-size: 0.72rem;
  font-weight: 950;
  opacity: 0;
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
  gap: 0.5rem;
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

.details span:not(:last-child)::after {
  content: '·';
  margin-left: 0.4rem;
}

.aktionen {
  display: grid;
  flex: 0 0 min(100%, 25rem);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
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
.delete-button {
  min-height: 2.7rem;
  padding: 0 0.85rem;
}

.update-button {
  background: var(--accent-dark);
}

.delete-button {
  background: var(--danger);
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
