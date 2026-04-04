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

  // Токены, размещённые на карте.
  // Каждый экземпляр: { uid, tokenId, col, row }
  //   uid     — уникальный id экземпляра (один тип токена можно поставить несколько раз)
  //   tokenId — ссылка на определение в tokens[]
  //   col/row — координаты ячейки на сетке
  const placedTokens = ref([])

  // Выбранный размещённый токен на карте (uid или null).
  // Отдельно от selectedToken в меню — это разные понятия:
  //   selectedToken — фокус в панели меню (какой тип выбран)
  //   selectedPlacedUid — какой конкретный экземпляр на карте выделен
  const selectedPlacedUid = ref(null)

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

  // Выбирает размещённый на карте токен по uid. Повторный клик — снимает выбор.
  function selectPlacedToken(uid) {
    selectedPlacedUid.value = selectedPlacedUid.value === uid ? null : uid
  }
  // Один тип токена можно разместить несколько раз — каждый раз создаётся новый uid.
  // crypto.randomUUID() — встроенный в браузер генератор уникальных идентификаторов.
  function placeToken(tokenId, col, row) {
    placedTokens.value.push({
      uid: crypto.randomUUID(),
      tokenId,
      col,
      row,
    })
  }

  // Перемещает уже размещённый токен в новую ячейку по его uid.
  function moveToken(uid, col, row) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) {
      token.col = col
      token.row = row
    }
  }

  // Всё, что возвращается из defineStore, становится доступным снаружи стора.
  // То, что не возвращается — остаётся приватным (инкапсуляция).
  return {
    // state
    cellSize,
    colorGrid,
    tokens,
    selectedToken,
    placedTokens,
    selectedPlacedUid,
    // getters
    cellSizePx,
    // actions
    setCellSize,
    setColorGrid,
    selectToken,
    selectPlacedToken,
    placeToken,
    moveToken,
  }
})
