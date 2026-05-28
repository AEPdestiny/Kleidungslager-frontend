<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

type VerlaufsEintrag = {
  id: number
  text: string
}

const route = useRoute()
const router = useRouter()

const kleidungsstueck = ref<Kleidungsstueck | null>(null)
const bestand = ref(0)
const lager = ref(1)
const bild = ref('')
const ladeFehler = ref('')
const erfolgsmeldung = ref('')
const bestandsverlauf = ref<VerlaufsEintrag[]>([])
const verlaufStorageKey = 'kleidungslager-bestandsverlauf'

const artikelnummer = computed(() => {
  if (kleidungsstueck.value === null) {
    return ''
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
  }
}

function fuegeVerlaufHinzu(text: string): void {
  const datum = new Date().toLocaleDateString('de-DE')
  const naechsteId =
    Math.max(0, ...bestandsverlauf.value.map((eintrag) => eintrag.id)) + 1

  bestandsverlauf.value.unshift({
    id: naechsteId,
    text: datum + ': ' + text,
  })

  bestandsverlauf.value = bestandsverlauf.value.slice(0, 8)
  localStorage.setItem(verlaufStorageKey, JSON.stringify(bestandsverlauf.value))
}

function ladeKleidungsstueck(): void {
  const id = Number(route.params.id)

  axios
    .get<Kleidungsstueck[]>(getKleidungEndpoint())
    .then((response) => {
      const gefundenesTeil = response.data.find((teil) => {
        return teil.id === id
      })

      if (gefundenesTeil === undefined) {
        ladeFehler.value = 'Kleidungsstück wurde nicht gefunden.'
        return
      }

      kleidungsstueck.value = gefundenesTeil
      bestand.value = gefundenesTeil.lagerbestand
      lager.value = gefundenesTeil.lager
      bild.value = gefundenesTeil.bild ?? ''
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

  const altesTeil = kleidungsstueck.value
  const endpoint =
    getKleidungEndpoint() + '/' + altesTeil.id + '/bestand'

  axios
    .put<Kleidungsstueck>(endpoint, {
      lagerbestand: bestand.value,
      lager: lager.value,
      bild: bild.value,
    })
    .then((response) => {
      kleidungsstueck.value = response.data
      bestand.value = response.data.lagerbestand
      lager.value = response.data.lager
      bild.value = response.data.bild ?? ''
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
    })
    .catch((error) => {
      console.log(error)
    })
}

function bildBearbeiten(event: Event): void {
  const input = event.target as HTMLInputElement
  const bildDatei = input.files?.[0]

  if (bildDatei === undefined || kleidungsstueck.value === null) {
    return
  }

  const reader = new FileReader()

  reader.addEventListener('load', () => {
    bild.value = String(reader.result)
    fuegeVerlaufHinzu('Bild geändert: ' + kleidungsstueck.value?.bezeichnung)
    aktualisieren()
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
        <p class="eyebrow">{{ artikelnummer }}</p>
        <h1>{{ kleidungsstueck.bezeichnung }}</h1>

        <div class="meta-grid">
          <span>{{ kleidungsstueck.kategorie }}</span>
          <span>Größe {{ kleidungsstueck.size }}</span>
          <span>{{ kleidungsstueck.farbe }}</span>
          <span>Lager {{ kleidungsstueck.lager }}</span>
        </div>

        <div class="edit-grid">
          <label>
            Bestand
            <input v-model.number="bestand" min="0" type="number" />
          </label>

          <label>
            Lager
            <input v-model.number="lager" min="1" type="number" />
          </label>
        </div>

        <div class="action-grid">
          <button type="button" @click="aktualisieren">
            Aktualisieren
          </button>

          <label class="upload-button">
            Bild ändern
            <input accept="image/*" type="file" @change="bildBearbeiten" />
          </label>

          <button class="remove-button" type="button" @click="bildEntfernen">
            Bild entfernen
          </button>

          <button class="delete-button" type="button" @click="loeschen">
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

      <ul v-if="aktivitaetenZumArtikel.length > 0">
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

.meta-grid,
.edit-grid,
.action-grid {
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
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

label {
  display: grid;
  gap: 0.35rem;
  color: var(--text);
  font-weight: 850;
}

input {
  min-height: 2.65rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text);
  font: inherit;
}

.action-grid {
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
}

.action-grid button,
.upload-button {
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

.activity-panel ul {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.75rem;
  padding-left: 1.2rem;
  color: var(--muted);
  font-weight: 800;
}

.activity-panel p:last-child {
  margin-top: 0.75rem;
  color: var(--muted);
  font-weight: 800;
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

.detail-page.dunkelmodus-detail input {
  border-color: rgba(238, 248, 244, 0.28);
  background: #10231d;
  color: #eef8f4;
}

@media (min-width: 860px) {
  .detail-page {
    grid-template-columns: minmax(18rem, 0.8fr) minmax(0, 1fr);
  }
}
</style>
