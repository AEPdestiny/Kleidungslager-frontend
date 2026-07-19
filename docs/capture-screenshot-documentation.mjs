import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const screenshotsDir = path.join(__dirname, 'screenshots')

const frontendUrl = process.env.DOCS_FRONTEND_URL ?? 'http://127.0.0.1:5174'
const backendUrl = process.env.DOCS_BACKEND_URL ?? 'http://127.0.0.1:8090'
let useMockData = process.env.DOCS_USE_MOCK_DATA === 'true'

const demoSettings = {
  accountName: 'Ibrahim Danisman',
  accountEmail: 'Ibrahim.Danisman@Student.HTW-Berlin.de',
  lowStockThreshold: 5,
  defaultSort: 'bezeichnung',
  showApiBadge: true,
  compactList: false,
  darkMode: false,
}

const seedItems = [
  {
    artikelnummer: 'KL-1011',
    bezeichnung: 'Business-Hemd',
    size: 'M',
    kategorie: 'HEMD',
    farbe: 'Weiß',
    lager: 1,
    lagerbestand: 18,
  },
  {
    artikelnummer: 'KL-1012',
    bezeichnung: 'Sommerkleid',
    size: 'S',
    kategorie: 'KLEID',
    farbe: 'Grün',
    lager: 2,
    lagerbestand: 3,
  },
  {
    artikelnummer: 'KL-1013',
    bezeichnung: 'Ledergürtel',
    size: null,
    kategorie: 'ACCESSOIRES',
    farbe: 'Braun',
    lager: 4,
    lagerbestand: 24,
  },
  {
    artikelnummer: '4006381333931',
    bezeichnung: 'Sneaker',
    size: 'L',
    kategorie: 'SCHUHE',
    farbe: 'Weiß',
    lager: 1,
    lagerbestand: 7,
  },
]

const mockItems = seedItems.map((item, index) => ({
  id: index + 1,
  bild: '',
  ...item,
}))

async function ensureScreenshotsDir() {
  await fs.mkdir(screenshotsDir, { recursive: true })
}

async function ensureSeedData() {
  if (useMockData) {
    return
  }

  let response

  try {
    response = await fetch(`${backendUrl}/api/kleidung`)
  } catch {
    useMockData = true
    return
  }

  if (!response.ok) {
    useMockData = true
    return
  }

  const currentItems = await response.json()
  const existingNumbers = new Set(
    currentItems.map((item) => item.artikelnummer).filter(Boolean)
  )

  for (const item of seedItems) {
    if (existingNumbers.has(item.artikelnummer)) {
      continue
    }

    const postResponse = await fetch(`${backendUrl}/api/kleidung`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(item),
    })

    if (!postResponse.ok) {
      const body = await postResponse.text()
      throw new Error(
        `Seed-Datensatz konnte nicht gespeichert werden: ${item.bezeichnung} (${postResponse.status}) ${body}`
      )
    }
  }
}

async function createPage() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1100 },
    deviceScaleFactor: 1,
  })

  await context.addInitScript((settings) => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.localStorage.setItem('kleidungslager-demo-login', 'true')
    window.localStorage.setItem(
      'kleidungslager-demo-settings',
      JSON.stringify(settings)
    )
  }, demoSettings)

  const page = await context.newPage()

  if (useMockData) {
    await setupMockApi(page)
  }

  return { browser, page }
}

async function setupMockApi(page) {
  await page.route('**/api/kleidung**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const artikelnummerPrefix = '/api/kleidung/artikelnummer/'

    if (request.method() === 'GET' && url.pathname.includes(artikelnummerPrefix)) {
      const gesuchteArtikelnummer =
        decodeURIComponent(url.pathname.split(artikelnummerPrefix).at(-1) ?? '')
      const gefundenesTeil = mockItems.find((teil) => {
        return teil.artikelnummer === gesuchteArtikelnummer
      })

      if (gefundenesTeil === undefined) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ meldung: 'Nicht gefunden' }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(gefundenesTeil),
      })
      return
    }

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockItems),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockItems[0]),
    })
  })
}

async function gotoDashboard(page) {
  await page.goto(`${frontendUrl}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.listen-panel')
  await page.waitForSelector('.kleidungsstueck, .tabellen-ansicht tbody tr')
  await page.waitForTimeout(500)
}

async function screenshotLocator(page, selector, fileName) {
  const locator = page.locator(selector).first()
  await locator.scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  await locator.screenshot({
    path: path.join(screenshotsDir, fileName),
    animations: 'disabled',
  })
}

async function screenshotVisiblePanel(page, selector, fileName, maxHeight = 820) {
  const locator = page.locator(selector).first()
  await locator.evaluate((element) => {
    const absoluteTop =
      element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: Math.max(0, absoluteTop - 120),
      behavior: 'instant',
    })
  })
  await page.waitForTimeout(250)
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error(`Element nicht sichtbar: ${selector}`)
  }

  await page.screenshot({
    path: path.join(screenshotsDir, fileName),
    animations: 'disabled',
    clip: {
      x: Math.max(0, box.x - 6),
      y: Math.max(0, box.y - 6),
      width: Math.min(box.width + 12, 1460),
      height: Math.min(box.height + 12, maxHeight),
    },
  })
}

async function captureForm(page) {
  await page.setViewportSize({ width: 1500, height: 1200 })
  await gotoDashboard(page)
  await screenshotLocator(
    page,
    '.formular',
    'usecase-03-neues-kleidungsstueck-erstellen.png'
  )
}

async function captureValidation(page) {
  await page.setViewportSize({ width: 1500, height: 1200 })
  await gotoDashboard(page)
  await page.locator('.formular').evaluate((form) => {
    form.requestSubmit()
  })
  await page.waitForSelector('.formular-fehler')
  await screenshotLocator(
    page,
    '.formular',
    'usecase-04-eingaben-validieren.png'
  )
}

async function resetAfterValidation(page) {
  await page.evaluate(() => {
    if (window.localStorage) {
      window.localStorage.setItem('kleidungslager-demo-login', 'true')
      window.localStorage.setItem(
        'kleidungslager-demo-settings',
        JSON.stringify({
          accountName: 'Ibrahim Danisman',
          accountEmail: 'Ibrahim.Danisman@Student.HTW-Berlin.de',
          lowStockThreshold: 5,
          defaultSort: 'bezeichnung',
          showApiBadge: true,
          compactList: false,
          darkMode: false,
        })
      )
    }

    if (window.sessionStorage) {
      window.sessionStorage.clear()
    }
  })
  await gotoDashboard(page)
}

async function captureLiveBestand(page) {
  await page.setViewportSize({ width: 960, height: 1100 })
  await resetAfterValidation(page)
  await screenshotVisiblePanel(
    page,
    '.listen-panel',
    'usecase-05-live-bestand.png',
    860
  )
}

async function captureSearchFilterSort(page) {
  await page.setViewportSize({ width: 960, height: 1100 })
  await gotoDashboard(page)
  const tools = page.locator('.tools-panel')
  await tools.locator('input[type="search"]').fill('hemd lager 1')
  await tools.locator('select').nth(0).selectOption('HEMD')
  await tools.locator('select').nth(1).selectOption('M')
  await tools.locator('select').nth(2).selectOption('1')
  await tools.locator('select').nth(3).selectOption('bestand')
  await page.waitForTimeout(450)
  await screenshotVisiblePanel(
    page,
    '.listen-panel',
    'usecase-06-suchen-filtern-sortieren.png',
    760
  )
}

async function captureTableView(page) {
  await page.setViewportSize({ width: 960, height: 1100 })
  await gotoDashboard(page)
  const tools = page.locator('.tools-panel')
  await tools.locator('input[type="search"]').fill('')
  await tools.locator('select').nth(0).selectOption('')
  await tools.locator('select').nth(1).selectOption('')
  await tools.locator('select').nth(2).selectOption('')
  await tools.locator('select').nth(3).selectOption('bezeichnung')
  await tools.locator('select').nth(4).selectOption('tabelle')
  await page.waitForSelector('.tabellen-ansicht')
  await page.waitForTimeout(450)
  await screenshotVisiblePanel(
    page,
    '.listen-panel',
    'usecase-07-ansicht-wechseln.png',
    760
  )
}

async function captureBarcodeDialog(page) {
  await page.setViewportSize({ width: 960, height: 1100 })
  await gotoDashboard(page)
  await page.locator('.barcode-suche-button').click()
  await page.waitForSelector('.scanner-dialog')
  await page
    .locator('.scanner-dialog input')
    .fill('4006381333931')
  await page.waitForTimeout(500)
  await screenshotLocator(
    page,
    '.scanner-dialog',
    'usecase-08-barcode-scannen-suchen.png'
  )
}

async function captureEditDetail(page) {
  await page.setViewportSize({ width: 1500, height: 950 })
  await page.goto(`${frontendUrl}/kleidung/1`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.detail-page')
  await page.getByRole('button', { name: 'Bearbeiten' }).click()
  await page.getByRole('button', { name: 'Aktualisieren' }).waitFor()
  await page.waitForTimeout(500)
  await screenshotVisiblePanel(
    page,
    '.detail-page',
    'usecase-10-kleidungsstueck-bearbeiten.png',
    760
  )
}

async function main() {
  await ensureScreenshotsDir()
  await ensureSeedData()

  const { browser, page } = await createPage()

  try {
    await captureForm(page)
    await captureValidation(page)
    await captureLiveBestand(page)
    await captureSearchFilterSort(page)
    await captureTableView(page)
    await captureBarcodeDialog(page)
    await captureEditDetail(page)
  } finally {
    await browser.close()
  }

  console.log('Screenshots neu aufgenommen:')
  console.log('- usecase-03-neues-kleidungsstueck-erstellen.png')
  console.log('- usecase-04-eingaben-validieren.png')
  console.log('- usecase-05-live-bestand.png')
  console.log('- usecase-06-suchen-filtern-sortieren.png')
  console.log('- usecase-07-ansicht-wechseln.png')
  console.log('- usecase-08-barcode-scannen-suchen.png')
  console.log('- usecase-10-kleidungsstueck-bearbeiten.png')
}

main().catch((error) => {
  console.error('Screenshot-Erstellung fehlgeschlagen:')
  console.error(error)
  process.exitCode = 1
})
