// Store для глобальных карт (GlobalMap).
// Глобальная карта — обзорная карта мира с остановками и маршрутами.
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '../composables/useApi'

export const useGlobalMapsStore = defineStore('globalMaps', () => {
  const api = useApi()

  const maps = ref([])
  const loading = ref(false)

  async function fetchMaps() {
    loading.value = true
    try {
      maps.value = await api.get('/api/global-maps')
    } finally {
      loading.value = false
    }
  }

  async function fetchMap(id) {
    return api.get(`/api/global-maps/${id}`)
  }

  async function uploadMap(file, name) {
    const fd = new FormData()
    fd.append('image', file)
    fd.append('name', name)
    const data = await api.post('/api/global-maps', fd)
    maps.value.unshift(data)
    return data
  }

  async function updateMap(id, fields) {
    const data = await api.put(`/api/global-maps/${id}`, fields)
    const idx = maps.value.findIndex((m) => m.id === id)
    if (idx !== -1) maps.value[idx] = data
    return data
  }

  async function replaceMapImage(id, file) {
    const fd = new FormData()
    fd.append('image', file)
    const data = await api.patch(`/api/global-maps/${id}/image`, fd)
    const idx = maps.value.findIndex((m) => m.id === id)
    if (idx !== -1) maps.value[idx] = data
    return data
  }

  async function deleteMap(id) {
    await api.delete(`/api/global-maps/${id}`)
    const idx = maps.value.findIndex((m) => m.id === id)
    if (idx !== -1) maps.value.splice(idx, 1)
  }

  return {
    maps,
    loading,
    fetchMaps,
    fetchMap,
    uploadMap,
    updateMap,
    replaceMapImage,
    deleteMap,
  }
})
