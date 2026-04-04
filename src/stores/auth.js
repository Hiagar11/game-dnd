import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'auth_token'

export const useAuthStore = defineStore('auth', () => {
  // Токен храним в localStorage ("Запомнить меня") или sessionStorage (только сессия).
  // При старте читаем в порядке приоритета: localStorage → sessionStorage.
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY) ?? null)
  const user = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  // Роль текущего пользователя — доступна через user.role после restoreSession/login.
  const role = computed(() => user.value?.role ?? null)

  // ─── Восстановление сессии ────────────────────────────────────────────────
  // Вызывается при первом переходе в router guard.
  async function restoreSession() {
    if (!token.value) return false

    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (!res.ok) {
        logout()
        return false
      }
      const data = await res.json()
      user.value = data.user
      return true
    } catch {
      logout()
      return false
    }
  }

  // ─── Вход ─────────────────────────────────────────────────────────────────
  // remember=true  → localStorage  (токен живёт после закрытия браузера)
  // remember=false → sessionStorage (токен живёт только в текущей вкладке)
  async function login(username, password, remember = false) {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await res.json()
    if (!res.ok) return data.error ?? 'Ошибка авторизации'

    token.value = data.token
    user.value = data.user

    const storage = remember ? localStorage : sessionStorage
    storage.setItem(TOKEN_KEY, data.token)

    return null
  }

  // ─── Выход ────────────────────────────────────────────────────────────────
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  }

  return { token, user, role, isAuthenticated, login, logout, restoreSession }
})
