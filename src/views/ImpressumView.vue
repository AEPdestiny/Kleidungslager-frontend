<template>
  <main class="impressum-view">
    <section class="impressum">
      <p class="eyebrow">Rechtliches</p>
      <h1>Impressum</h1>

      <dl>
        <div>
          <dt>Name</dt>
          <dd>Ibrahim Danisman</dd>
        </div>

        <div>
          <dt>Matrikelnummer</dt>
          <dd>578949</dd>
        </div>

        <div>
          <dt>E-Mail</dt>
          <dd>Ibrahim.Danisman@Student.HTW-Berlin.de</dd>
        </div>

        <div>
          <dt>Hochschule</dt>
          <dd>HTW-Berlin</dd>
        </div>
      </dl>
    </section>
  </main>
</template>

<style scoped>
.impressum-view {
  width: 100%;
}

.impressum {
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.eyebrow {
  margin-bottom: 0.25rem;
  color: var(--accent-dark);
  font-size: 0.8rem;
  font-weight: 900;
  text-transform: uppercase;
}

h1 {
  margin-bottom: 1rem;
  color: var(--text);
  font-size: 2.5rem;
  font-weight: 950;
}

dl {
  display: grid;
  gap: 0.85rem;
}

dl div {
  padding: 0.9rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.55);
}

dt {
  color: var(--muted);
  font-weight: 850;
}

dd {
  color: var(--text);
  font-weight: 900;
  overflow-wrap: anywhere;
}
</style>
