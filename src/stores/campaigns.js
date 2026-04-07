// Стор для управления сценариями (кампаниями) — именованными наборами связей между картами.
// Отделён от scenarios.js — разные зоны ответственности:
//   scenarios.js   — карты и их расстановка токенов
//   campaigns.js   — связи между картами (граф переходов)
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '../composables/useApi'

export const useCampaignsStore = defineStore('campaigns', () => {
  const api = useApi()
  const campaigns = ref([])
  const loading = ref(false)

  // ─── Загрузка ─────────────────────────────────────────────────────────────
  async function fetchCampaigns() {
    loading.value = true
    try {
      campaigns.value = await api.get('/api/campaigns')
    } finally {
      loading.value = false
    }
  }

  // ─── Создание ─────────────────────────────────────────────────────────────
  async function createCampaign(data) {
    const result = await api.post('/api/campaigns', data)
    campaigns.value.unshift(result)
    return result
  }

  // ─── Обновление ───────────────────────────────────────────────────────────
  async function updateCampaign(id, data) {
    const result = await api.put(`/api/campaigns/${id}`, data)
    const idx = campaigns.value.findIndex((c) => String(c.id) === String(id))
    if (idx !== -1) campaigns.value[idx] = result
    return result
  }

  // ─── Удаление ─────────────────────────────────────────────────────────────
  async function deleteCampaign(id) {
    await api.delete(`/api/campaigns/${id}`)
    const idx = campaigns.value.findIndex((c) => String(c.id) === String(id))
    if (idx !== -1) campaigns.value.splice(idx, 1)
  }

  // ─── Получение смежных scenarioId ─────────────────────────────────────────
  // Возвращает массив строковых id карт, соединённых с данной в рамках кампании.
  // Связи двунаправленные: дверь из A в B и из B в A — одно ребро.
  function getConnectedIds(campaign, scenarioId) {
    if (!campaign) return []
    const sid = String(scenarioId)
    return campaign.edges
      .filter((e) => String(e.from) === sid || String(e.to) === sid)
      .map((e) => (String(e.from) === sid ? String(e.to) : String(e.from)))
  }

  return {
    campaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getConnectedIds,
  }
})
