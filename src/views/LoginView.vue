<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../auth'

const router = useRouter()

const email = ref('')
const passwort = ref('')

function handleLogin(): void {
  login()
  router.push('/dashboard')
}
</script>

<template>
  <main class="login-view">
    <section class="login-panel">
      <div class="login-copy">
        <p class="eyebrow">Sicherer Bereich</p>
        <h1>Login</h1>
        <p>
          Demo-Anmeldung für dein Dashboard. Nach dem Einloggen wird die
          Lagerverwaltung freigeschaltet.
        </p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <label>
          E-Mail
          <input v-model="email" required type="email" />
        </label>

        <label>
          Passwort
          <input v-model="passwort" required type="password" />
        </label>

        <button type="submit">Einloggen</button>
      </form>

      <p class="demo-data">
        Demo: Ibrahim.Danisman@Student.HTW-Berlin.de · Passwort: demo
      </p>
    </section>
  </main>
</template>

<style scoped>
.login-view {
  display: grid;
  min-height: calc(100vh - 9rem);
  place-items: center;
}

.login-panel {
  width: min(100%, 30rem);
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.login-copy {
  margin-bottom: 1.1rem;
}

.eyebrow {
  margin-bottom: 0.25rem;
  color: var(--accent-dark);
  font-size: 0.8rem;
  font-weight: 900;
  text-transform: uppercase;
}

h1 {
  color: var(--text);
  font-size: 2.5rem;
  font-weight: 950;
  line-height: 1;
}

p {
  margin-top: 0.6rem;
  color: var(--muted);
}

.login-form {
  display: grid;
  gap: 0.9rem;
}

label {
  display: grid;
  gap: 0.35rem;
  color: var(--text);
  font-weight: 850;
}

input {
  width: 100%;
  min-height: 2.8rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--text);
}

button {
  min-height: 2.9rem;
  border: 0;
  border-radius: 8px;
  background: var(--surface-dark);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
}

.demo-data {
  padding-top: 0.9rem;
  font-size: 0.88rem;
  overflow-wrap: anywhere;
}
</style>
