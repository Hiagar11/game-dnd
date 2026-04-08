// Хранилище шаблонов токенов — CRUD через API.
// Отделено от game.js (игровое состояние) по принципу единственной ответственности:
// здесь только "библиотека токенов", а не "что на карте сейчас расставлено".
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '../composables/useApi'

export const useTokensStore = defineStore('tokens', () => {
  const api = useApi()

  // Список шаблонов токенов, загруженных с сервера.
  // Элемент: { id, name, src, strength, agility, intellect, charisma }
  const tokens = ref([])

  // Выбранный шаблон — подсвечивается в меню и используется для размещения кликом по карте
  const selectedToken = ref(null)

  // Тоггл: повторный клик на уже выбранный токен снимает выбор
  function selectToken(id) {
    selectedToken.value =
      selectedToken.value?.id === id ? null : (tokens.value.find((t) => t.id === id) ?? null)
  }

  // Сервер возвращает { id, name, tokenType, imageUrl, stats: { strength, agility, intellect, charisma }, attitude }
  // Компоненты ожидают плоский объект { id, name, tokenType, attitude, src, strength, ... }
  function normalizeToken({ id, name, tokenType, imageUrl, stats, attitude }) {
    return {
      id,
      name,
      tokenType: tokenType ?? 'npc',
      attitude: attitude ?? 'neutral',
      src: imageUrl,
      ...stats,
    }
  }

  async function fetchTokens() {
    const data = await api.get('/api/tokens')
    tokens.value = data.map(normalizeToken)
  }

  // formData — FormData с полями image, name, strength, agility, intellect, charisma
  async function addToken(formData) {
    const data = await api.post('/api/tokens', formData)
    const token = normalizeToken(data)
    tokens.value.unshift(token)
    return token
  }

  async function editToken(id, fields) {
    const data = await api.put(`/api/tokens/${id}`, fields)
    const updated = normalizeToken(data)
    const idx = tokens.value.findIndex((t) => t.id === id)
    if (idx !== -1) tokens.value[idx] = updated
    return updated
  }

  async function deleteToken(id) {
    await api.delete(`/api/tokens/${id}`)
    const idx = tokens.value.findIndex((t) => t.id === id)
    if (idx !== -1) tokens.value.splice(idx, 1)
    if (selectedToken.value?.id === id) selectedToken.value = null

    // Если сейчас открыт сценарий — убираем все размещённые экземпляры этого шаблона.
    // Сервер уже удалил их из БД; здесь синхронизируем локальное состояние.
    const { useGameStore } = await import('./game')
    const gameStore = useGameStore()
    gameStore.placedTokens = gameStore.placedTokens.filter((t) => t.tokenId !== id)
  }

  return { tokens, selectedToken, selectToken, fetchTokens, addToken, editToken, deleteToken }
})
