// useApi — тонкая обёртка над fetch, которая автоматически добавляет
// заголовок Authorization из auth store. Это избавляет от дублирования
// { headers: { Authorization: `Bearer ${token}` } } в каждом запросе.
//
// Использование:
//   const api = useApi()
//   const data = await api.get('/api/tokens')
//   const data = await api.post('/api/tokens', formData)
//   const data = await api.put('/api/tokens/id', { name: 'new' })
//   await api.delete('/api/tokens/id')

import { useAuthStore } from '../stores/auth'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function useApi() {
  const auth = useAuthStore()

  function headers(isFormData = false) {
    const h = { Authorization: `Bearer ${auth.token}` }
    // Если передаём FormData — Content-Type не ставим:
    // браузер сам добавит 'multipart/form-data' с нужным boundary.
    if (!isFormData) h['Content-Type'] = 'application/json'
    return h
  }

  async function request(method, path, body) {
    const isFormData = body instanceof FormData
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: headers(isFormData),
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    })

    // 204 No Content — нечего парсить
    if (res.status === 204) return null

    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return data
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
  }
}
