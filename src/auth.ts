import { reactive } from 'vue'

const STORAGE_KEY = 'kleidungslager-demo-login'

export const authState = reactive({
  isLoggedIn: localStorage.getItem(STORAGE_KEY) === 'true',
})

export function login(): void {
  localStorage.setItem(STORAGE_KEY, 'true')
  authState.isLoggedIn = true
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY)
  authState.isLoggedIn = false
}
