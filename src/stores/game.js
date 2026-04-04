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
import { useApi } from '../composables/useApi'

export const useGameStore = defineStore('game', () => {
  const api = useApi()

  // --- STATE ---

  const cellSize = ref(60)
  const colorGrid = ref('rgba(0,0,0,0.3)')

  // Список шаблонов токенов, загруженных с сервера.
  // Каждый объект: { id, name, imageUrl, stats: { meleeDmg, ... } }
  const tokens = ref([])

  const selectedToken = ref(null)
  const placedTokens = ref([])
  const selectedPlacedUid = ref(null)

  // --- GETTERS ---

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
  //
  // Важно: при размещении делаем снимок (snapshot) данных шаблона.
  // Это делает каждый размещённый токен независимым — изменение шаблона
  // не затрагивает уже размещённые экземпляры.
  function placeToken(tokenId, col, row) {
    const def = tokens.value.find((t) => t.id === tokenId)
    placedTokens.value.push({
      uid: crypto.randomUUID(),
      tokenId,
      col,
      row,
      // Снимок шаблона — каждый экземпляр на карте хранит собственную копию
      name: def?.name ?? '',
      src: def?.src ?? '',
      meleeDmg: def?.meleeDmg ?? 0,
      rangedDmg: def?.rangedDmg ?? 0,
      visionRange: def?.visionRange ?? 0,
      defense: def?.defense ?? 0,
      evasion: def?.evasion ?? 0,
    })
  }

  // Удаляет размещённый токен с карты по uid.
  // Если он был выбран — сбрасывает выбор.
  function removeToken(uid) {
    const idx = placedTokens.value.findIndex((t) => t.uid === uid)
    if (idx !== -1) {
      placedTokens.value.splice(idx, 1)
      if (selectedPlacedUid.value === uid) {
        selectedPlacedUid.value = null
      }
    }
  }

  // Перемещает уже размещённый токен в новую ячейку по его uid.
  function moveToken(uid, col, row) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) {
      token.col = col
      token.row = row
    }
  }

  // Редактирует конкретный экземпляр токена на карте (не шаблон).
  // fields — объект с изменяемыми полями: { name, meleeDmg, ... }
  function editPlacedToken(uid, fields) {
    const token = placedTokens.value.find((t) => t.uid === uid)
    if (token) Object.assign(token, fields)
  }

  // ─── Загрузка токенов с сервера ──────────────────────────────────────────
  // Вызывается при монтировании MenuView (после авторизации).
  async function fetchTokens() {
    const data = await api.get('/api/tokens')
    // Нормализуем: приводим серверный формат { id, name, imageUrl, stats } к плоскому,
    // который ожидают компоненты: { id, name, src, meleeDmg, ... }
    tokens.value = data.map(normalizeToken)
  }

  // ─── Создание нового токена ───────────────────────────────────────────────
  // Принимает FormData (файл + поля). Возвращает созданный токен.
  async function addToken(formData) {
    const data = await api.post('/api/tokens', formData)
    const token = normalizeToken(data)
    tokens.value.unshift(token)
    return token
  }

  // ─── Редактирование токена ────────────────────────────────────────────────
  // id — серверный _id токена (строка MongoDB ObjectId).
  async function editToken(id, fields) {
    const data = await api.put(`/api/tokens/${id}`, fields)
    const updated = normalizeToken(data)
    const idx = tokens.value.findIndex((t) => t.id === id)
    if (idx !== -1) tokens.value[idx] = updated
    return updated
  }

  // ─── Удаление шаблона токена ──────────────────────────────────────────────
  // Удаляет как с сервера, так и из локального стора.
  // Также снимает выбор, если был выбран этот токен.
  async function deleteToken(id) {
    await api.delete(`/api/tokens/${id}`)
    const idx = tokens.value.findIndex((t) => t.id === id)
    if (idx !== -1) tokens.value.splice(idx, 1)
    if (selectedToken.value?.id === id) selectedToken.value = null
  }

  // ─── Вспомогательная нормализация ────────────────────────────────────────
  // Сервер возвращает { id, name, imageUrl, stats: { meleeDmg, ... } }.
  // Компоненты ожидают плоский объект { id, name, src, meleeDmg, ... }.
  function normalizeToken({ id, name, imageUrl, stats }) {
    return { id, name, src: imageUrl, ...stats }
  }

  // ─── Загрузка расстановки из сохранённого сценария ───────────────────────
  // serverTokens — массив { uid, tokenId, col, row, hidden } с сервера.
  // Для каждого ищем шаблон в tokens, чтобы восстановить name/src/stats.
  // Вызывается при входе в режим редактирования уровня.
  //
  // Важно: после populate() на сервере tokenId приходит не строкой, а объектом
  // { _id, name, imagePath, stats }. Поэтому нельзя просто делать String(tokenId) —
  // получим "[object Object]". Проверяем тип и достаём _id если нужно.
  function initPlacedTokens(serverTokens) {
    placedTokens.value = serverTokens.map(({ uid, tokenId, col, row, hidden }) => {
      const id = tokenId && typeof tokenId === 'object' ? String(tokenId._id) : String(tokenId)
      const def = tokens.value.find((t) => t.id === id)
      return {
        uid,
        tokenId: id,
        col,
        row,
        hidden: hidden ?? false,
        name: def?.name ?? 'Неизвестный',
        src: def?.src ?? '',
        meleeDmg: def?.meleeDmg ?? 0,
        rangedDmg: def?.rangedDmg ?? 0,
        visionRange: def?.visionRange ?? 6,
        defense: def?.defense ?? 0,
        evasion: def?.evasion ?? 0,
      }
    })
    selectedPlacedUid.value = null
  }

  return {
    cellSize,
    colorGrid,
    tokens,
    selectedToken,
    placedTokens,
    selectedPlacedUid,
    cellSizePx,
    setCellSize,
    setColorGrid,
    selectToken,
    selectPlacedToken,
    placeToken,
    removeToken,
    moveToken,
    editPlacedToken,
    fetchTokens,
    addToken,
    editToken,
    deleteToken,
    initPlacedTokens,
  }
})
