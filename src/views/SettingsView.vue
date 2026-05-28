<script setup lang="ts">
import { ref } from 'vue'
import { resetSettings, saveSettings, settingsState } from '../settings'

const erfolgsmeldung = ref('')

function speichern(): void {
  if (settingsState.lowStockThreshold < 0) {
    settingsState.lowStockThreshold = 0
  }

  saveSettings()
  erfolgsmeldung.value = 'Einstellungen gespeichert.'
}

function zuruecksetzen(): void {
  resetSettings()
  erfolgsmeldung.value = 'Einstellungen zurückgesetzt.'
}
</script>

<template>
  <main class="settings-view">
    <section class="settings-hero">
      <p class="eyebrow">Einstellungen</p>
      <h1>Kontrolle über dein Lager</h1>
      <p>
        Hier passt du dein Demo-Konto und das Verhalten des Dashboards an.
      </p>
    </section>

    <section class="settings-grid">
      <form class="settings-card" @submit.prevent="speichern">
        <div class="card-head">
          <p class="eyebrow">Konto</p>
          <h2>Profil bearbeiten</h2>
        </div>

        <label>
          Name
          <input v-model="settingsState.accountName" required />
        </label>

        <label>
          E-Mail
          <input v-model="settingsState.accountEmail" required type="email" />
        </label>

        <button type="submit">Speichern</button>
      </form>

      <form class="settings-card" @submit.prevent="speichern">
        <div class="card-head">
          <p class="eyebrow">Dashboard</p>
          <h2>Lagerregeln</h2>
        </div>

        <label>
          Niedriger Bestand ab
          <input
            v-model.number="settingsState.lowStockThreshold"
            min="0"
            required
            type="number"
          />
        </label>

        <label>
          Standardsortierung
          <select v-model="settingsState.defaultSort">
            <option value="bezeichnung">Bezeichnung</option>
            <option value="bestand">Bestand</option>
            <option value="lager">Lager</option>
            <option value="kategorie">Kategorie</option>
          </select>
        </label>

        <label class="switch-row">
          <input v-model="settingsState.showApiBadge" type="checkbox" />
          API-Hinweis im Dashboard anzeigen
        </label>

        <label class="switch-row">
          <input v-model="settingsState.compactList" type="checkbox" />
          Kompaktere Kleidungskarten verwenden
        </label>

        <label class="switch-row">
          <input v-model="settingsState.darkMode" type="checkbox" />
          Dunkelmodus verwenden
        </label>

        <button type="submit">Speichern</button>
      </form>

      <section class="settings-card">
        <div class="card-head">
          <p class="eyebrow">System</p>
          <h2>Weitere Optionen</h2>
        </div>

        <ul>
          <li>Bestandswarnung wird direkt im Dashboard angewendet.</li>
          <li>Profilwerte bleiben im Browser gespeichert.</li>
          <li>Die Einstellungen sind eine Frontend-Demo ohne Backend-Login.</li>
        </ul>

        <button class="secondary-button" type="button" @click="zuruecksetzen">
          Zurücksetzen
        </button>
      </section>
    </section>

    <p v-if="erfolgsmeldung !== ''" class="toast">
      {{ erfolgsmeldung }}
    </p>
  </main>
</template>

<style scoped>
.settings-view {
  display: grid;
  gap: 1rem;
}

.settings-hero,
.settings-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px);
}

.settings-hero {
  padding: 1.25rem;
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

h2 {
  color: var(--text);
  font-size: 1.45rem;
  font-weight: 950;
}

p,
li {
  color: var(--muted);
}

.settings-grid {
  display: grid;
  gap: 1rem;
}

.settings-card {
  display: grid;
  gap: 0.9rem;
  padding: 1rem;
}

.card-head {
  margin-bottom: 0.25rem;
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

button {
  min-height: 2.8rem;
  border: 0;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
}

.secondary-button {
  background: var(--danger);
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.switch-row input {
  width: 1.1rem;
  min-height: auto;
}

ul {
  display: grid;
  gap: 0.5rem;
  padding-left: 1.2rem;
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

@media (min-width: 860px) {
  .settings-grid {
    grid-template-columns: repeat(3, 1fr);
    align-items: start;
  }
}
</style>
