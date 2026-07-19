<script setup lang="ts">
import KleidungsListe from '../components/KleidungsListe.vue'
</script>

<template>
  <main class="dashboard-view">
    <section class="dashboard-hero">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>Lagerzentrale</h1>
        <p>
          Hier werden Kleidungsstücke verwaltet, neue Einträge gespeichert
          und falsche Datensätze mit Bestätigung gelöscht.
        </p>
      </div>
    </section>

    <KleidungsListe />
  </main>
</template>

<style scoped>
.dashboard-view {
  width: 100%;
}

.dashboard-hero {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px);
}

.eyebrow {
  color: var(--accent-dark);
  font-size: 0.8rem;
  font-weight: 900;
  text-transform: uppercase;
}

h1 {
  color: var(--text);
  font-size: clamp(2.2rem, 6vw, 4.25rem);
  font-weight: 950;
  line-height: 1;
}

p {
  max-width: 42rem;
  margin-top: 0.65rem;
  color: var(--muted);
}

@media (max-width: 720px) {
  .dashboard-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
