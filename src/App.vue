<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <div class="wrapper">
      <RouterLink class="brand" to="/">Kleidungslager</RouterLink>

      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  padding: 1.5rem 0 2rem;
}

nav {
  display: flex;
  gap: 0.75rem;
  font-size: 0.95rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0.35rem 0;
}

.brand {
  color: #102a43;
  font-size: 1.35rem;
  font-weight: 800;
}

.wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

@media (max-width: 520px) {
  .wrapper {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
