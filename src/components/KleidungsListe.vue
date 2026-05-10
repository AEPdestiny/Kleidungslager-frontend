<script setup lang="ts">
type Kleidungsstueck = {
  id: number
  name: string
  groesse: string
  kategorie: string
  bestand: number
}

const kleidungsstuecke: Kleidungsstueck[] = [
  {
    id: 1,
    name: 'T-Shirt Basic',
    groesse: 'M',
    kategorie: 'Oberteil',
    bestand: 24,
  },
  {
    id: 2,
    name: 'Jeans Regular',
    groesse: 'L',
    kategorie: 'Hose',
    bestand: 12,
  },
  {
    id: 3,
    name: 'Winterjacke',
    groesse: 'XL',
    kategorie: 'Jacke',
    bestand: 7,
  },
  {
    id: 4,
    name: 'Pullover',
    groesse: 'S',
    kategorie: 'Oberteil',
    bestand: 18,
  },
]
</script>

<template>
  <section class="kleidungs-liste" aria-labelledby="kleidungs-liste-title">
    <div class="intro">
      <p class="eyebrow">Lagerbestand</p>
      <h2 id="kleidungs-liste-title">Kleidungsstuecke im Lager</h2>
      <p>Eine erste Vue-Komponente fuer die Uebersicht deiner vorhandenen Kleidung.</p>
    </div>

    <div class="liste">
      <article v-for="teil in kleidungsstuecke" :key="teil.id" class="kleidungsstueck">
        <div>
          <h3>{{ teil.name }}</h3>
          <p>{{ teil.kategorie }} · Groesse {{ teil.groesse }}</p>
        </div>
        <strong>{{ teil.bestand }} Stk.</strong>
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

.kleidungsstueck p {
  color: #627d98;
}

.kleidungsstueck strong {
  flex: 0 0 auto;
  color: #1f513f;
  font-weight: 800;
}
</style>
