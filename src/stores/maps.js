// Store для библиотеки карт (Map) — отдельная от сценариев сущность.
// Карта хранит изображение + cellSize, может переиспользоваться в нескольких сценариях.
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '../composables/useApi'

export const useMapsStore = defineStore('maps', () => {
  const api = useApi()

  const maps = ref([])
  const loading = ref(false)

  async function fetchMaps() {
    loading.value = true
    try {
      maps.value = await api.get('/api/maps')
    } finally {
      loading.value = false
    }
  }

  // Загрузка нового изображения + создание записи Map.
  // file — File, name — строка, cellSize — число.
  async function uploadMap(file, name, cellSize = 60, gridOffsetX = 0, gridOffsetY = 0) {
    const fd = new FormData()
    fd.append('image', file)
    fd.append('name', name)
    fd.append('cellSize', String(cellSize))
    fd.append('gridOffsetX', String(gridOffsetX))
    fd.append('gridOffsetY', String(gridOffsetY))
    const data = await api.post('/api/maps', fd)
    maps.value.unshift(data)
    return data
  }

  // Обновление мета-данных (имя, cellSize)
  async function updateMap(id, fields) {
    const data = await api.put(`/api/maps/${id}`, fields)
    const idx = maps.value.findIndex((m) => m.id === id)
    if (idx !== -1) maps.value[idx] = data
    return data
  }

  // Замена изображения у существующей карты
  async function replaceMapImage(id, file) {
    const fd = new FormData()
    fd.append('image', file)
    const data = await api.patch(`/api/maps/${id}/image`, fd)
    const idx = maps.value.findIndex((m) => m.id === id)
    if (idx !== -1) maps.value[idx] = data
    return data
  }

  async function deleteMap(id) {
    await api.delete(`/api/maps/${id}`)
    const idx = maps.value.findIndex((m) => m.id === id)
    if (idx !== -1) maps.value.splice(idx, 1)
  }

  return {
    maps,
    loading,
    fetchMaps,
    uploadMap,
    updateMap,
    replaceMapImage,
    deleteMap,
  }
})
