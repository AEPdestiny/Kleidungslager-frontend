<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { authState, logout } from './auth'

const router = useRouter()

function handleLogout(): void {
  logout()
  router.push('/')
}
</script>

<template>
  <header class="app-header">
    <div class="brand-area">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">
          <svg viewBox="0 0 48 48" role="img" aria-label="Kleidungslager Logo">
            <path
              class="logo-frame"
              d="M24 4 39.6 13v18L24 44 8.4 31V13L24 4Z"
            />
            <path
              class="logo-hanger"
              d="M24 13c0-2.2 1.7-4 3.9-4 1.7 0 3.1 1 3.7 2.4"
            />
            <path
              class="logo-shirt"
              d="M17 20.4 22.1 17h3.8L31 20.4l4 3.1-3.2 5-2.6-1.8V36H18.8v-9.3l-2.6 1.8-3.2-5 4-3.1Z"
            />
            <path class="logo-line" d="M20.5 23.5h7" />
            <path class="logo-line" d="M20.5 27.5h5" />
          </svg>
        </span>
        <span>
          Kleidungslager
          <small>Smart Inventory</small>
        </span>
      </RouterLink>
    </div>

    <nav class="main-nav">
      <RouterLink to="/">Start</RouterLink>
      <RouterLink v-if="authState.isLoggedIn" to="/dashboard">Dashboard</RouterLink>
      <RouterLink v-if="authState.isLoggedIn" to="/einstellungen">Einstellungen</RouterLink>
      <RouterLink to="/impressum">Impressum</RouterLink>
      <RouterLink v-if="!authState.isLoggedIn" class="login-link" to="/login">Login</RouterLink>
      <button v-else type="button" @click="handleLogout">Logout</button>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 1rem;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 0.8rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 14px 35px rgba(16, 35, 29, 0.08);
  backdrop-filter: blur(18px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text);
  font-weight: 900;
}

.brand-mark {
  display: grid;
  width: 2.4rem;
  height: 2.4rem;
  place-items: center;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  font-weight: 900;
}

.brand-mark svg {
  width: 1.85rem;
  height: 1.85rem;
}

.logo-frame {
  fill: rgba(71, 240, 170, 0.12);
  stroke: #47f0aa;
  stroke-width: 2;
}

.logo-hanger,
.logo-shirt,
.logo-line {
  fill: none;
  stroke: #ffffff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.4;
}

.logo-line {
  stroke: #47f0aa;
  stroke-width: 1.8;
}

.brand small {
  display: block;
  margin-top: -0.15rem;
  color: var(--accent-dark);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.main-nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;
}

.main-nav a,
.main-nav button {
  min-height: 2.45rem;
  padding: 0 0.85rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.main-nav a {
  display: inline-flex;
  align-items: center;
}

.main-nav a.router-link-exact-active {
  background: var(--accent-soft);
  color: var(--accent-dark);
}

.main-nav .login-link,
.main-nav button {
  background: var(--surface-dark);
  color: #ffffff;
}

@media (max-width: 680px) {
  .app-header {
    position: static;
    align-items: flex-start;
    flex-direction: column;
  }

  .main-nav {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
