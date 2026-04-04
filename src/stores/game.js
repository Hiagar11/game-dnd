// Pinia — официальный менеджер состояния для Vue 3.
// Состояние (state) — это данные, которые должны быть доступны в разных компонентах.
// defineStore — создаёт хранилище (store).
// Первый аргумент — уникальное имя стора ('game').
//
// Здесь используется Setup Store — стиль Composition API.
// Это современный и рекомендуемый способ написания сторов в Pinia.
// Синтаксис: defineStore('id', () => { ... })
//   ref()      → state   (реактивные данные)
//   computed() → getters (вычисляемые значения)
//   function   → actions (методы, в том числе сеттеры)
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', () => {
  // --- STATE ---
  // ref() делает переменную реактивной — Vue следит за её изменениями
  // и автоматически обновляет шаблоны, которые её используют.

  // Размер одной ячейки сетки в пикселях.
  // Подбирается под конкретную карту, поэтому хранится в сторе —
  // в будущем его можно будет менять из панели настроек.
  const cellSize = ref(60)

  // Цвет линий сетки.
  const colorGrid = ref('rgba(0,0,0,0.3)')

  // Список токенов на карте.
  // Каждый токен: { id, name, src } — временные данные, в будущем придут с бэкенда.
  const tokens = ref([{ id: 1, name: 'Enemy', src: '/tokens/enemy.webp' }])

  // Выбранный токен — тот, на котором сейчас фокус.
  // null — никакой токен не выбран.
  const selectedToken = ref(null)

  // --- GETTERS ---
  // computed() — вычисляемое значение на основе state.
  // Пересчитывается автоматически при изменении зависимостей.

  // Размер ячейки в формате CSS-строки (например, для inline-стилей).
  const cellSizePx = computed(() => `${cellSize.value}px`)

  // --- ACTIONS (SETTERS) ---
  // Обычные функции, которые изменяют state.
  // В Pinia можно менять state напрямую — не нужны отдельные мутации, как в Vuex.

  // Устанавливает новый размер ячейки. Принимает число в пикселях.
  function setCellSize(size) {
    cellSize.value = size
  }

  // Устанавливает новый цвет сетки. Принимает CSS-строку (rgba, hex и т.д.).
  function setColorGrid(color) {
    colorGrid.value = color
  }

  // Выбирает токен по id. Если кликнуть на уже выбранный — сбрасывает выбор.
  function selectToken(id) {
    selectedToken.value =
      selectedToken.value?.id === id ? null : (tokens.value.find((t) => t.id === id) ?? null)
  }

  // Всё, что возвращается из defineStore, становится доступным снаружи стора.
  // То, что не возвращается — остаётся приватным (инкапсуляция).
  return {
    // state
    cellSize,
    colorGrid,
    tokens,
    selectedToken,
    // getters
    cellSizePx,
    // actions
    setCellSize,
    setColorGrid,
    selectToken,
  }
})
