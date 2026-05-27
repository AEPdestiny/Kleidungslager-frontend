<script setup lang="ts">
import { authState } from '../auth'
</script>

<template>
  <main class="home-view">
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">Kleidungslager 2026</p>
        <h1>Bestände schneller sehen, sauber speichern, sicher steuern.</h1>
        <p class="hero-text">
          Eine moderne Lager-App für Kleidungsstücke mit Live-Daten aus dem
          Backend, PostgreSQL-Speicherung und einem geschützten Dashboard.
        </p>

        <div class="hero-actions">
          <RouterLink v-if="!authState.isLoggedIn" class="primary-link" to="/login">
            Zum Login
          </RouterLink>
          <RouterLink class="secondary-link" to="/dashboard">Dashboard öffnen</RouterLink>
        </div>
      </div>

      <aside class="hero-panel">
        <div class="panel-top">
          <span class="status-dot"></span>
          Render API vorbereitet
        </div>
        <div class="scan-card">
          <span>REST</span>
          <strong>GET · POST · DELETE</strong>
        </div>
        <div class="mini-grid">
          <div>
            <strong>PostgreSQL</strong>
            <span>Datenbank</span>
          </div>
          <div>
            <strong>Vue</strong>
            <span>Frontend</span>
          </div>
        </div>
      </aside>
    </section>

    <section class="feature-grid">
      <article>
        <span>01</span>
        <h2>Dashboard</h2>
        <p>Die Kleidungsliste ist erst nach dem Login sichtbar.</p>
      </article>

      <article>
        <span>02</span>
        <h2>Daten speichern</h2>
        <p>Neue Kleidungsstücke werden per POST an dein Backend gesendet.</p>
      </article>

      <article>
        <span>03</span>
        <h2>Lager prüfen</h2>
        <p>Bestand, Farbe, Größe, Kategorie und Lagerplatz bleiben übersichtlich.</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.home-view {
  width: 100%;
}

.hero {
  display: grid;
  align-items: center;
  gap: 1.5rem;
  min-height: calc(100vh - 9rem);
  padding: 1rem 0 2rem;
}

.hero-content {
  max-width: 48rem;
}

.eyebrow {
  margin-bottom: 0.75rem;
  color: var(--accent-dark);
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  color: var(--text);
  font-size: clamp(2.8rem, 8vw, 5.9rem);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 0.95;
}

.hero-text {
  max-width: 43rem;
  margin-top: 1.2rem;
  color: var(--muted);
  font-size: clamp(1rem, 2vw, 1.22rem);
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.6rem;
}

.primary-link,
.secondary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0 1.1rem;
  border-radius: 8px;
  font-weight: 900;
}

.primary-link {
  background: var(--surface-dark);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(16, 35, 29, 0.22);
}

.secondary-link {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
}

.hero-panel {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(16, 35, 29, 0.92), rgba(8, 116, 90, 0.88));
  color: #ffffff;
  box-shadow: var(--shadow);
}

.panel-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 800;
}

.status-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: #47f0aa;
  box-shadow: 0 0 0 0.45rem rgba(71, 240, 170, 0.14);
}

.scan-card {
  display: grid;
  gap: 0.3rem;
  padding: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 1.1rem 1.1rem;
}

.scan-card span,
.mini-grid span {
  color: rgba(255, 255, 255, 0.68);
  font-weight: 800;
}

.scan-card strong {
  font-size: 1.6rem;
  font-weight: 950;
}

.mini-grid,
.feature-grid {
  display: grid;
  gap: 1rem;
}

.mini-grid {
  grid-template-columns: repeat(2, 1fr);
}

.mini-grid div,
.feature-grid article {
  padding: 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
}

.mini-grid strong {
  display: block;
  font-weight: 950;
}

.feature-grid {
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  margin-bottom: 2rem;
}

.feature-grid article {
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: 0 16px 40px rgba(16, 35, 29, 0.08);
  backdrop-filter: blur(14px);
}

.feature-grid span {
  color: var(--accent-dark);
  font-weight: 950;
}

.feature-grid h2 {
  margin-top: 0.35rem;
  color: var(--text);
  font-size: 1.15rem;
  font-weight: 950;
}

.feature-grid p {
  margin-top: 0.4rem;
  color: var(--muted);
}

@media (min-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1.25fr) minmax(20rem, 0.75fr);
  }
}
</style>
