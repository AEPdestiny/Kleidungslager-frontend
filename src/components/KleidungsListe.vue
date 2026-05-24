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

const kleidungsstuecke =
  ref<Kleidungsstueck[]>([])

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
        <strong>{{ teil.lagerbestand }} Stk.</strong>
      </article>
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
</style>
