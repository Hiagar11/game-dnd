// Store для работы со сценариями (списки, создание, редактирование, удаление).
// Отделён от game.js — разные зоны ответственности:
//   scenarios.js — менеджмент (редактор, список)
//   game.js      — игровое состояние (токены на карте, сетка и т.д.)
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '../composables/useApi'

export const useScenariosStore = defineStore('scenarios', () => {
  const api = useApi()

  // Список сценариев текущего пользователя
  const scenarios = ref([])
  const loading = ref(false)

  // ─── Загрузка списка ──────────────────────────────────────────────────────
  async function fetchScenarios() {
    loading.value = true
    try {
      scenarios.value = await api.get('/api/scenarios')
    } finally {
      loading.value = false
    }
  }

  // ─── Создание ─────────────────────────────────────────────────────────────
  // fields: { name, mapImagePath, cellSize }
  async function createScenario(fields) {
    const data = await api.post('/api/scenarios', fields)
    scenarios.value.unshift(data)
    return data
  }

  // ─── Редактирование ───────────────────────────────────────────────────────
  async function updateScenario(id, fields) {
    const data = await api.put(`/api/scenarios/${id}`, fields)
    const idx = scenarios.value.findIndex((s) => s.id === id)
    if (idx !== -1) scenarios.value[idx] = data
    return data
  }

  // ─── Удаление ─────────────────────────────────────────────────────────────
  async function deleteScenario(id) {
    await api.delete(`/api/scenarios/${id}`)
    const idx = scenarios.value.findIndex((s) => s.id === id)
    if (idx !== -1) scenarios.value.splice(idx, 1)
  }

  // ─── Загрузка изображения карты ───────────────────────────────────────────
  // Отдельный шаг перед созданием/обновлением сценария.
  // Возвращает { mapImageUrl, mapImagePath } — путь нужен для сохранения в БД,
  // URL — для предпросмотра прямо в браузере.
  async function uploadMapImage(file) {
    const fd = new FormData()
    fd.append('map', file)
    return api.post('/api/scenarios/upload-map', fd)
  }

  // ─── Получение одного сценария с полными данными ───────────────────────────
  // Возвращает сценарий со всеми полями, включая placedTokens.
  async function fetchScenario(id) {
    return api.get(`/api/scenarios/${id}`)
  }

  // ─── Сохранение расстановки токенов уровня ──────────────────────────────
  // placedTokens — массив { uid, tokenId, col, row } из game store.
  // name — опциональное новое имя сценария.
  async function saveLevelTokens(id, placedTokens, name) {
    const body = { placedTokens }
    if (name) body.name = name
    const result = await api.patch(`/api/scenarios/${id}/placed-tokens`, body)
    // Синхронизируем локальный список: имя + актуальный tokensCount
    const idx = scenarios.value.findIndex((s) => String(s.id) === String(id))
    if (idx !== -1) {
      scenarios.value[idx] = {
        ...scenarios.value[idx],
        ...(result.name ? { name: result.name } : {}),
        tokensCount: result.count ?? scenarios.value[idx].tokensCount,
      }
    }
    return result
  }

  // Сбрасывает placedTokens и revealedCells к эталону редактора (перед новой игрой).
  async function resetScenario(id) {
    await api.post(`/api/scenarios/${id}/reset`)
  }

  return {
    scenarios,
    loading,
    fetchScenarios,
    createScenario,
    updateScenario,
    deleteScenario,
    uploadMapImage,
    fetchScenario,
    saveLevelTokens,
    resetScenario,
  }
})
