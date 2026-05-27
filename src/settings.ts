import { reactive } from 'vue'

const STORAGE_KEY = 'kleidungslager-demo-settings'

type SettingsState = {
  accountName: string
  accountEmail: string
  lowStockThreshold: number
  defaultSort: string
  showApiBadge: boolean
  compactList: boolean
}

const defaultSettings: SettingsState = {
  accountName: 'Ibrahim Danisman',
  accountEmail: 'Ibrahim.Danisman@Student.HTW-Berlin.de',
  lowStockThreshold: 5,
  defaultSort: 'bezeichnung',
  showApiBadge: true,
  compactList: false,
}

function loadSettings(): SettingsState {
  const savedSettings = localStorage.getItem(STORAGE_KEY)

  if (savedSettings === null) {
    return defaultSettings
  }

  return {
    ...defaultSettings,
    ...JSON.parse(savedSettings),
  }
}

export const settingsState = reactive<SettingsState>(loadSettings())

export function saveSettings(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsState))
}

export function resetSettings(): void {
  Object.assign(settingsState, defaultSettings)
  saveSettings()
}
