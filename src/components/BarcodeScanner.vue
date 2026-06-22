<script setup lang="ts">
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{
  scan: [barcode: string]
  close: []
}>()

const video = ref<HTMLVideoElement | null>(null)
const manuellerBarcode = ref('')
const scannerFehler = ref('')

let controls: IScannerControls | null = null
let wurdeErkannt = false

function scannerStoppen(): void {
  controls?.stop()
  controls = null
}

function schliessen(): void {
  scannerStoppen()
  emit('close')
}

function barcodeUebernehmen(barcode: string): void {
  const bereinigt = barcode.trim()

  if (bereinigt === '') {
    scannerFehler.value = 'Bitte gib einen Barcode ein.'
    return
  }

  scannerStoppen()
  emit('scan', bereinigt)
}

async function scannerStarten(): Promise<void> {
  await nextTick()

  if (video.value === null) {
    return
  }

  try {
    const reader = new BrowserMultiFormatReader()
    controls = await reader.decodeFromVideoDevice(
      undefined,
      video.value,
      (result) => {
        if (result !== undefined && !wurdeErkannt) {
          wurdeErkannt = true
          barcodeUebernehmen(result.getText())
        }
      },
    )
  } catch {
    scannerFehler.value =
      'Die Kamera konnte nicht geöffnet werden. Du kannst den Barcode unten eingeben.'
  }
}

onMounted(() => {
  void scannerStarten()
})

onBeforeUnmount(() => {
  scannerStoppen()
})
</script>

<template>
  <div class="scanner-backdrop" @click.self="schliessen">
    <section class="scanner-dialog">
      <div class="scanner-head">
        <div>
          <p>Barcode</p>
          <h2>Code scannen</h2>
        </div>
        <button type="button" title="Scanner schließen" @click="schliessen">
          Schließen
        </button>
      </div>

      <video ref="video" autoplay muted playsinline />

      <p class="scanner-hinweis">
        Halte den Barcode ruhig und vollständig vor die Kamera.
      </p>
      <p v-if="scannerFehler !== ''" class="scanner-fehler">
        {{ scannerFehler }}
      </p>

      <form class="manueller-barcode" @submit.prevent="barcodeUebernehmen(manuellerBarcode)">
        <label>
          Barcode manuell eingeben
          <input
            v-model="manuellerBarcode"
            autocomplete="off"
            placeholder="z.B. 4006381333931"
          />
        </label>
        <button type="submit">Übernehmen</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.scanner-backdrop {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(3, 18, 14, 0.72);
  backdrop-filter: blur(7px);
}

.scanner-dialog {
  width: min(100%, 34rem);
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.scanner-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.scanner-head p {
  color: var(--accent-dark);
  font-size: 0.75rem;
  font-weight: 900;
  text-transform: uppercase;
}

.scanner-head h2 {
  color: var(--text);
  font-size: 1.65rem;
}

button {
  min-height: 2.5rem;
  padding: 0 0.9rem;
  border: 0;
  border-radius: 6px;
  background: var(--surface-dark);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}

video {
  width: 100%;
  aspect-ratio: 16 / 10;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #071711;
  object-fit: cover;
}

.scanner-hinweis,
.scanner-fehler {
  margin-top: 0.65rem;
  color: var(--muted);
  font-weight: 750;
}

.scanner-fehler {
  color: #c83227;
}

.manueller-barcode {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: end;
  margin-top: 1rem;
}

label {
  display: grid;
  gap: 0.35rem;
  color: var(--text);
  font-weight: 850;
}

input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--input-bg, #ffffff);
  color: var(--text);
  font: inherit;
}

@media (max-width: 520px) {
  .manueller-barcode {
    grid-template-columns: 1fr;
  }
}
</style>
