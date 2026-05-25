<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

type Kleidungsstueck = {
  id: number
  bezeichnung: string
  size: string
  lager: number
  kategorie: string
  farbe: string
  lagerbestand: number
}

type NeuesKleidungsstueck = {
  bezeichnung: string
  size: string
  lager: number
  kategorie: string
  farbe: string
  lagerbestand: number
}

const kleidungsstuecke =
  ref<Kleidungsstueck[]>([])

const zuLoeschendeId =
  ref<number | null>(null)



const neuesKleidungsstueck = ref<NeuesKleidungsstueck>({
  bezeichnung: '',
  size: 'M',
  lager: 1,
  kategorie: 'HEMD',
  farbe: '',
  lagerbestand: 1,
})

function requestKleidung(): void {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL

  const endpoint =
    baseUrl + '/api/kleidung'

  axios
    .get<Kleidungsstueck[]>(endpoint)
    .then((response) => {
      kleidungsstuecke.value = response.data
    })
    .catch((error) => {
      console.log(error)
    })
}

function createKleidung(): void {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL

  const endpoint =
    baseUrl + '/api/kleidung'

  axios
    .post<Kleidungsstueck>(
      endpoint,
      neuesKleidungsstueck.value
    )
    .then((response) => {
      kleidungsstuecke.value.push(response.data)

      neuesKleidungsstueck.value = {
        bezeichnung: '',
        size: 'M',
        lager: 1,
        kategorie: 'HEMD',
        farbe: '',
        lagerbestand: 1,
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

  const baseUrl =
    import.meta.env.VITE_API_BASE_URL

  const endpoint =
    baseUrl + '/api/kleidung/' + zuLoeschendeId.value

  axios
    .delete(endpoint)
    .then(() => {
      kleidungsstuecke.value =
        kleidungsstuecke.value.filter((teil) => {
          return teil.id !==  zuLoeschendeId.value
        })
      zuLoeschendeId.value = null
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
    <div class="intro">
      <p class="eyebrow">Lagerbestand</p>
      <h2>Kleidungsstücke im Lager</h2>
      <p>Eine erste Vue-Komponente für die Übersicht meiner vorhandenen Kleidung.</p>
    </div>

    <form class="formular" @submit.prevent="createKleidung">
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

      <button type="submit">Speichern</button>
    </form>

    <div class="liste">
      <article v-for="teil in kleidungsstuecke" :key="teil.id" class="kleidungsstueck">
        <div>
          <h3>{{ teil.bezeichnung }}</h3>
          <p class="details">
            <span>{{ teil.kategorie }}</span>
            <span>Größe {{ teil.size }}</span>
            <span>{{ teil.farbe }}</span>
            <span>Lager {{ teil.lager }}</span>
          </p>
        </div>

        <div class="aktionen">
          <strong>{{ teil.lagerbestand }} Stk.</strong>
          <button
            class="delete-button"
            type="button"
            @click="frageLoeschen(teil.id)"
          >
            Löschen
          </button>
        </div>
      </article>
    </div>

    <div v-if="zuLoeschendeId !== null" class="modal-backdrop">
      <div class="modal">
        <h3>Löschen bestätigen</h3>
        <p>Möchtest du dieses Kleidungsstück wirklich löschen?</p>

        <div class="modal-actions">
          <button type="button" @click="abbrechenLoeschen">
            Abbrechen
          </button>

          <button
            class="delete-button"
            type="button"
            @click="deleteKleidung"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kleidungs-liste {
  width: 100%;
}

.intro {
  margin-bottom: 1.5rem;
}

.eyebrow {
  margin-bottom: 0.25rem;
  color: #23614f;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h2 {
  color: #1f2933;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.05;
}

.intro p:last-child {
  max-width: 42rem;
  margin-top: 0.75rem;
  color: #52606d;
  font-size: 1rem;
}

.formular {
  display: grid;
  gap: 0.9rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #f8fafc;
}

label {
  display: grid;
  gap: 0.35rem;
  color: #334e68;
  font-weight: 700;
}

input,
select {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #bcccdc;
  border-radius: 6px;
  background: #ffffff;
  color: #102a43;
  font: inherit;
}

button {
  min-height: 2.7rem;
  border: 0;
  border-radius: 6px;
  background: #23614f;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.liste {
  display: grid;
  gap: 0.75rem;
}

.kleidungsstueck {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 5.25rem;
  padding: 1rem;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #ffffff;
}

.kleidungsstueck h3 {
  color: #102a43;
  font-size: 1.05rem;
  font-weight: 700;
}

.details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.25rem;
  color: #627d98;
}

.details span:not(:last-child)::after {
  content: '·';
  margin-left: 0.4rem;
}

.kleidungsstueck strong {
  flex: 0 0 auto;
  color: #1f513f;
  font-weight: 800;
}

@media (min-width: 720px) {
  .formular {
    grid-template-columns: repeat(3, 1fr);
  }

  button {
    align-self: end;
  }
}

.aktionen {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.delete-button {
  min-height: 2.4rem;
  padding: 0 0.8rem;
  background: #b42318;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
  z-index: 20;
}

.modal {
  width: min(100%, 24rem);
  padding: 1.25rem;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22);
}

.modal h3 {
  margin-bottom: 0.5rem;
  color: #102a43;
  font-weight: 800;
}

.modal p {
  color: #52606d;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

</style>
