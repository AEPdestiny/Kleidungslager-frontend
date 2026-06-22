import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import KleidungsListe from '../KleidungsListe.vue'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  push: vi.fn(),
  isAxiosError: vi.fn(() => false),
}))

vi.mock('axios', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    delete: mocks.delete,
    isAxiosError: mocks.isAxiosError,
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}))

type TestArtikel = {
  id: number
  artikelnummer: string
  bezeichnung: string
  size: string
  lager: number
  kategorie: string
  farbe: string
  lagerbestand: number
  bild: string
}

const hemd: TestArtikel = {
  id: 7,
  artikelnummer: '4006381333931',
  bezeichnung: 'Blaues Hemd',
  size: 'M',
  lager: 1,
  kategorie: 'HEMD',
  farbe: 'Blau',
  lagerbestand: 4,
  bild: '',
}

let wrapper: VueWrapper | undefined

function buttonMitText(text: string) {
  const button = wrapper?.findAll('button').find((eintrag) => {
    return eintrag.text().trim() === text
  })

  if (button === undefined) {
    throw new Error('Button nicht gefunden: ' + text)
  }

  return button
}

function eingabeMitLabel(text: string) {
  const label = wrapper?.findAll('label').find((eintrag) => {
    return eintrag.text().includes(text)
  })

  if (label === undefined) {
    throw new Error('Eingabefeld nicht gefunden: ' + text)
  }

  return label.find('input')
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.get.mockResolvedValue({ data: [] })
  mocks.post.mockResolvedValue({ data: hemd })
  mocks.put.mockResolvedValue({ data: hemd })
  mocks.delete.mockResolvedValue({})
  mocks.push.mockResolvedValue(undefined)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('KleidungsListe Integration', () => {
  // Prüft das Zusammenspiel von GET-Anfrage, Vue-Komponente und sichtbarer Liste.
  it('lädt Kleidungsstücke über GET und zeigt sie an', async () => {
    mocks.get.mockResolvedValueOnce({ data: [hemd] })

    wrapper = mount(KleidungsListe)
    await flushPromises()

    expect(mocks.get).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Blaues Hemd')
    expect(wrapper.text()).toContain('4 Stk.')
  })

  // Prüft, dass ungültige Eingaben Feldfehler zeigen und keinen POST auslösen.
  it('verhindert POST bei ungültigen Formulardaten', async () => {
    wrapper = mount(KleidungsListe)
    await flushPromises()

    await wrapper.find('form.formular').trigger('submit')

    expect(wrapper.text()).toContain('Bitte korrigiere die markierten Eingaben.')
    expect(wrapper.text()).toContain('Bitte gib eine Bezeichnung ein.')
    expect(wrapper.text()).toContain('Bitte gib eine Farbe ein.')
    expect(mocks.post).not.toHaveBeenCalled()
  })

  // Prüft, dass gültige Formulardaten per POST gespeichert und sofort angezeigt werden.
  it('speichert gültige Eingaben über POST und ergänzt die Liste', async () => {
    wrapper = mount(KleidungsListe)
    await flushPromises()

    await eingabeMitLabel('Artikelnummer / Barcode').setValue('4006381333931')
    await eingabeMitLabel('Bezeichnung').setValue('Blaues Hemd')
    await eingabeMitLabel('Farbe').setValue('Blau')
    await wrapper.find('form.formular').trigger('submit')
    await flushPromises()

    expect(mocks.post).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Blaues Hemd')
  })

  // Prüft Scanner-Eingabe, Barcode-GET und Navigation zur gefundenen Detailseite.
  it('findet einen gescannten Barcode und öffnet die Detailseite', async () => {
    mocks.get
      .mockResolvedValueOnce({ data: [hemd] })
      .mockResolvedValueOnce({ data: hemd })

    wrapper = mount(KleidungsListe, { attachTo: document.body })
    await flushPromises()

    await buttonMitText('Barcode suchen').trigger('click')
    await flushPromises()

    const barcodeInput = wrapper.find('input[placeholder="z.B. 4006381333931"]')
    await barcodeInput.setValue('4006381333931')
    await wrapper.find('form.manueller-barcode').trigger('submit')
    await flushPromises()

    expect(mocks.get).toHaveBeenLastCalledWith(
      expect.stringContaining('/artikelnummer/4006381333931'),
    )
    expect(mocks.push).toHaveBeenCalledWith('/kleidung/7')
  })
})
