// Стор для сохранённых игровых сессий (прогресс прохождения).
// Создаётся/обновляется когда мастер выходит из игры и нажимает «Сохранить».
// При следующем запуске GameView показывает список сессий (Продолжить).
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '../composables/useApi'

export const useGameSessionsStore = defineStore('gameSessions', () => {
  const api = useApi()
  const sessions = ref([])
  const loading = ref(false)

  async function fetchSessions() {
    loading.value = true
    try {
      sessions.value = await api.get('/api/game-sessions')
    } finally {
      loading.value = false
    }
  }

  // Создаёт или обновляет сессию по имени (upsert).
  async function saveSession({
    name,
    campaignId,
    campaignName,
    currentScenarioId,
    currentScenarioName,
  }) {
    const result = await api.post('/api/game-sessions', {
      name,
      campaignId,
      campaignName,
      currentScenarioId,
      currentScenarioName,
    })
    // Обновляем локальный кеш: заменяем если уже есть, иначе добавляем в начало
    const idx = sessions.value.findIndex((s) => s.name === name)
    if (idx !== -1) sessions.value[idx] = result
    else sessions.value.unshift(result)
    return result
  }

  async function deleteSession(id) {
    await api.delete(`/api/game-sessions/${id}`)
    const idx = sessions.value.findIndex((s) => String(s.id ?? s._id) === String(id))
    if (idx !== -1) sessions.value.splice(idx, 1)
  }

  // Восстанавливает снапшот токенов/тумана из сессии обратно в сценарий.
  // Вызывается перед запуском игры при «Продолжить».
  async function restoreSession(sessionId) {
    await api.post(`/api/game-sessions/${sessionId}/restore`)
  }

  return { sessions, loading, fetchSessions, saveSession, deleteSession, restoreSession }
})
