// Хранилище свойств персонажей — пассивные черты, особенности, статусные эффекты.
// Мастер создаёт их в редакторе, потом применяет к токенам в инвентаре.
// Хранится в localStorage — серверная персистентность добавляется позже.
import { ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'game-dnd:traits'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(traits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(traits))
}

export const useTraitsStore = defineStore('traits', () => {
  // Список свойств. Элемент: { id, name, category, icon, mods }
  // category: 'passive' | 'active' | 'status' | 'racial' | 'class'
  // mods: [{ stat, value }] — массив модификаторов характеристик
  const traits = ref(loadFromStorage())

  function addTrait({ name, category, icon, mods }) {
    const id = `trait_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    traits.value.push({
      id,
      name: name.trim(),
      category,
      icon,
      mods: (mods ?? [])
        .filter((m) => m.stat)
        .map((m) => ({ stat: m.stat, value: Number(m.value) })),
    })
    saveToStorage(traits.value)
    return id
  }

  function removeTrait(id) {
    traits.value = traits.value.filter((t) => t.id !== id)
    saveToStorage(traits.value)
  }

  function updateTrait(id, patch) {
    const idx = traits.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    traits.value[idx] = { ...traits.value[idx], ...patch }
    saveToStorage(traits.value)
  }

  return { traits, addTrait, removeTrait, updateTrait }
})
