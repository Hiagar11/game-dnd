// Хранилище предметов игры — создаются мастером в редакторе, используются в инвентаре.
// Хранится локально (localStorage) — серверная персистентность добавляется позже.
import { ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'game-dnd:items'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useItemsStore = defineStore('items', () => {
  // Список предметов. Элемент: { id, name, type, icon, description }
  // type: 'weapon' | 'armor' | 'potion' | 'misc'
  const items = ref(loadFromStorage())

  function addItem({ name, type, icon, description }) {
    const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    items.value.push({ id, name: name.trim(), type, icon, description: description?.trim() ?? '' })
    saveToStorage(items.value)
    return id
  }

  function removeItem(id) {
    items.value = items.value.filter((i) => i.id !== id)
    saveToStorage(items.value)
  }

  function updateItem(id, patch) {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx === -1) return
    items.value[idx] = { ...items.value[idx], ...patch }
    saveToStorage(items.value)
  }

  return { items, addItem, removeItem, updateItem }
})
